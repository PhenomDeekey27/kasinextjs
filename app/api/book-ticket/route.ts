import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/db";
import { allocateSeats } from "@/lib/services/seatAllocator";
import { sendCoordinatorAlert } from "@/lib/services/alertService";
import { uploadToCloudinary } from "@/lib/services/cloudinaryStorage";
import { parseFormData, fileToBuffer } from "@/lib/services/uploadService";
import { getDuplicateAadhaarMessage, normalizeAadhaar } from "@/lib/utils";

interface GroupMember {
  id: number;
  name: string;
  dob: string;
  age: number;
  gender: string;
  relationship: string;
  aadhaar_number: string;
  seat_preference: string | null;
  requires_accessibility_support: boolean;
  accessibility_note: string | null;
  passenger_id: number;
}

type RequestError = Error & {
  status?: number;
  code?: string;
};

function createRequestError(
  message: string,
  status: number,
  code?: string,
): RequestError {
  const error = new Error(message) as RequestError;
  error.status = status;
  error.code = code;
  return error;
}

function validateAadhaar(value: string, fieldLabel: string) {
  const normalizedValue = normalizeAadhaar(value);

  if (normalizedValue.length !== 12) {
    throw createRequestError(`${fieldLabel} Aadhaar number must be 12 digits.`, 400);
  }

  return normalizedValue;
}

function parseDobString(value: string, fieldLabel: string): Date {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    throw createRequestError(`${fieldLabel} Date of Birth is required.`, 400);
  }

  const match = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/.exec(
    trimmedValue,
  );

  if (!match) {
    throw createRequestError(
      `${fieldLabel} Date of Birth must be in DD/MM/YYYY format.`,
      400,
    );
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    throw createRequestError(`${fieldLabel} Date of Birth is invalid.`, 400);
  }

  return parsedDate;
}

function calculateAgeFromDob(dobDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dobDate.getFullYear();
  const hasBirthdayOccurred =
    today.getMonth() > dobDate.getMonth() ||
    (today.getMonth() === dobDate.getMonth() &&
      today.getDate() >= dobDate.getDate());

  if (!hasBirthdayOccurred) {
    age -= 1;
  }

  return age;
}

function parseBooleanField(value: string | boolean, fieldLabel: string): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = (value || "").trim().toLowerCase();
  if (["true", "yes", "1"].includes(normalized)) {
    return true;
  }

  if (["false", "no", "0", ""].includes(normalized)) {
    return false;
  }

  throw createRequestError(`${fieldLabel} must be yes or no.`, 400);
}

function validateGender(value: string, fieldLabel: string): string {
  const normalized = (value || "").trim();
  if (!["Male", "Female", "Other"].includes(normalized)) {
    throw createRequestError(`${fieldLabel} gender is required.`, 400);
  }

  return normalized;
}

async function ensureAadhaarDoesNotExist(
  client: Awaited<ReturnType<typeof getClient>>,
  aadhaarNumbers: string[],
) {
  if (aadhaarNumbers.length === 0) {
    return;
  }

  const result = await client.query(
    `
    WITH requested AS (
      SELECT UNNEST($1::TEXT[]) AS aadhaar_number
    )
    SELECT requested.aadhaar_number
    FROM requested
    WHERE EXISTS (
      SELECT 1 FROM passengers p WHERE p.aadhaar_number = requested.aadhaar_number
    )
       OR EXISTS (
      SELECT 1 FROM group_members gm WHERE gm.aadhaar_number = requested.aadhaar_number
    )
    LIMIT 1
    `,
    [aadhaarNumbers],
  );

  if (result.rows.length > 0) {
    throw createRequestError(
      getDuplicateAadhaarMessage(result.rows[0].aadhaar_number),
      409,
      "23505",
    );
  }
}

async function ensureTransactionReferenceDoesNotExist(
  client: Awaited<ReturnType<typeof getClient>>,
  transactionReference: string,
) {
  const normalizedReference = transactionReference.trim();
  if (!normalizedReference) {
    return;
  }

  const result = await client.query(
    `
    SELECT id
    FROM passengers
    WHERE LOWER(TRIM(transaction_id_utr)) = LOWER(TRIM($1))
    LIMIT 1
    `,
    [normalizedReference],
  );

  if (result.rows.length > 0) {
    throw createRequestError(
      "This transaction reference already exists. Please enter a unique transaction ID / UTR / reference number.",
      409,
      "23505",
    );
  }
}

export async function POST(request: NextRequest) {
  const client = await getClient();

  try {
    console.log("========== NEW BOOKING REQUEST ==========");

    await client.query("BEGIN");

    // Parse form data
    const formData = await parseFormData(request);
    const fields = formData.fields;
    const files = formData.files;

    console.log("Received fields:", fields);
    console.log("Received files:", Object.keys(files));

    const {
      name,
      phone,
      emergency_contact_number,
      aadhaar_number,
      gender,
      dob,
      age,
      street,
      nation,
      state,
      district,
      seat_preference,
      room_preference,
      reference_name,
      payment_mode,
      transaction_id_utr,
      payment_pending_status,
      payment_amount,
      requires_accessibility_support,
      accessibility_note,
      group_members: groupMembersStr,
    } = fields as Record<string, string>;

    const normalizedReferenceName = reference_name?.trim()
      ? reference_name.trim()
      : null;

    console.log("Parsed passenger fields:", {
      name,
      phone,
      emergency_contact_number,
      aadhaar_number,
      gender,
      dob,
      age,
      street,
      nation,
      state,
      district,
      seat_preference,
      room_preference,
      reference_name: normalizedReferenceName,
      payment_mode,
      transaction_id_utr,
      payment_pending_status,
      payment_amount,
      requires_accessibility_support,
      accessibility_note,
      groupMembersStr,
    });

    const normalizedAadhaarNumber = validateAadhaar(
      aadhaar_number,
      "Primary passenger",
    );

    const normalizedEmergencyContactNumber = (
      emergency_contact_number || ""
    ).trim();
    if (!/^\d{10}$/.test(normalizedEmergencyContactNumber)) {
      throw createRequestError(
        "Emergency contact number must be 10 digits.",
        400,
      );
    }

    const primaryDobDate = parseDobString(dob, "Primary passenger");
    const parsedPrimaryAge = calculateAgeFromDob(primaryDobDate);
    const normalizedGender = validateGender(gender, "Primary passenger");
    const normalizedStreet = (street || "").trim();
    const normalizedNation = (nation || "").trim();
    const normalizedState = (state || "").trim();
    const normalizedDistrict = (district || "").trim();

    if (!normalizedStreet) {
      throw createRequestError("Primary passenger street / address is required.", 400);
    }

    if (!normalizedNation) {
      throw createRequestError("Primary passenger nation is required.", 400);
    }

    if (!normalizedState) {
      throw createRequestError("Primary passenger state is required.", 400);
    }

    if (!normalizedDistrict) {
      throw createRequestError("Primary passenger district is required.", 400);
    }

    if (parsedPrimaryAge < 0 || parsedPrimaryAge > 120) {
      throw createRequestError("Primary passenger age must be between 0 and 120.", 400);
    }

    const normalizedPaymentMode = (payment_mode || "").trim();
    const normalizedRoomPreference = (room_preference || "").trim().toLowerCase();
    const normalizedTransactionIdUtr = (transaction_id_utr || "").trim();
    const normalizedPaymentPendingStatus = (payment_pending_status || "")
      .trim()
      .toUpperCase();
    const parsedPaymentAmount = Number(payment_amount);
    const requiresAccessibilitySupport = parseBooleanField(
      requires_accessibility_support || "false",
      "Primary passenger accessibility support",
    );
    const normalizedAccessibilityNote = (accessibility_note || "").trim();

    const paymentModes = [
      "UPI",
      "Bank Transfer",
      "Net Banking",
      "Credit Card",
      "Debit Card",
      "Cash",
      "Other",
    ];

    if (!paymentModes.includes(normalizedPaymentMode)) {
      throw createRequestError("Invalid payment mode selected.", 400);
    }

    const requiresTransactionReference = [
      "UPI",
      "Bank Transfer",
      "Net Banking",
      "Credit Card",
      "Debit Card",
    ].includes(normalizedPaymentMode);
    const isCashPayment = normalizedPaymentMode === "Cash";
    const requiresPaymentProof = requiresTransactionReference;

    if (!Number.isFinite(parsedPaymentAmount) || parsedPaymentAmount < 0) {
      throw createRequestError("Payment amount cannot be negative.", 400);
    }

    if (!["single", "group"].includes(normalizedRoomPreference)) {
      throw createRequestError("Room preference must be Single or Group.", 400);
    }

    if (requiresTransactionReference) {
      if (normalizedTransactionIdUtr.length < 6) {
        throw createRequestError(
          "Transaction ID / UTR / reference number is required for this payment mode.",
          400,
        );
      }
    }

    if (
      !["FULL_PAID", "BALANCE_5000"].includes(
        normalizedPaymentPendingStatus,
      )
    ) {
      throw createRequestError(
        "Payment pending status must be Full Amount Paid or 5000 Balance Pending.",
        400,
      );
    }

    if (requiresPaymentProof && (!files.payment_proof || files.payment_proof.length === 0)) {
      throw createRequestError(
        "Payment proof is required for this payment mode.",
        400,
      );
    }

    if (isCashPayment && normalizedTransactionIdUtr) {
      throw createRequestError(
        "Transaction reference should not be provided for Cash payment mode.",
        400,
      );
    }

    if (
      requiresAccessibilitySupport &&
      normalizedAccessibilityNote.length < 4
    ) {
      throw createRequestError(
        "Primary passenger medical/accessibility support note is required.",
        400,
      );
    }

    const parsedGroupMembers = groupMembersStr
      ? JSON.parse(groupMembersStr)
      : [];

    if (!Array.isArray(parsedGroupMembers)) {
      throw createRequestError("Group members payload is invalid.", 400);
    }

    const normalizedGroupMembers = parsedGroupMembers.map((member, index) => ({
      ...member,
      dob: (member.dob || "").trim(),
      age: calculateAgeFromDob(
        parseDobString((member.dob || "").trim(), `Group member ${index + 1}`),
      ),
      gender: validateGender(member.gender, `Group member ${index + 1}`),
      aadhaar_number: validateAadhaar(
        member.aadhaar_number,
        `Group member ${index + 1}`,
      ),
      requires_accessibility_support: parseBooleanField(
        member.requires_accessibility_support,
        `Group member ${index + 1} accessibility support`,
      ),
      relationship: (member.relationship || "").trim(),
      accessibility_note: (member.accessibility_note || "").trim() || null,
    }));

    normalizedGroupMembers.forEach((member, index) => {
      if (!member.relationship) {
        throw createRequestError(
          `Group member ${index + 1} relationship is required.`,
          400,
        );
      }

      if (
        member.requires_accessibility_support &&
        (!member.accessibility_note || member.accessibility_note.length < 4)
      ) {
        throw createRequestError(
          `Group member ${index + 1} medical/accessibility support note is required.`,
          400,
        );
      }
    });

    const requestAadhaarNumbers = [
      normalizedAadhaarNumber,
      ...normalizedGroupMembers.map((member) => member.aadhaar_number),
    ];

    const seenAadhaarNumbers = new Set<string>();
    for (const currentAadhaarNumber of requestAadhaarNumbers) {
      if (seenAadhaarNumbers.has(currentAadhaarNumber)) {
        throw createRequestError(
          getDuplicateAadhaarMessage(currentAadhaarNumber),
          409,
          "23505",
        );
      }

      seenAadhaarNumbers.add(currentAadhaarNumber);
    }

    await ensureAadhaarDoesNotExist(client, requestAadhaarNumbers);
    if (normalizedTransactionIdUtr) {
      await ensureTransactionReferenceDoesNotExist(client, normalizedTransactionIdUtr);
    }

    // Upload payment proof to Cloudinary
    let paymentProofUrl: string | null = null;

    if (files.payment_proof && files.payment_proof.length > 0) {
      console.log("Uploading payment proof to Cloudinary...");
      const paymentFile = await fileToBuffer(files.payment_proof[0]);
      paymentProofUrl = await uploadToCloudinary(paymentFile, "payments");
      console.log("Payment proof uploaded to Cloudinary:", paymentProofUrl);
    }

    if (normalizedReferenceName) {
      await client.query(
        `
        INSERT INTO reference_members (name)
        SELECT $1
        WHERE NOT EXISTS (
          SELECT 1
          FROM reference_members
          WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
        )
        `,
        [normalizedReferenceName],
      );
    }

    console.log("Inserting passenger into DB...");

    const passengerResult = await client.query(
      `
      INSERT INTO passengers
      (name, phone, emergency_contact_number, aadhaar_number, gender, dob, age, street, nation, state, district, seat_preference, room_preference, requires_accessibility_support, accessibility_note, reference_name, payment_mode, transaction_id_utr, payment_pending_status, payment_amount, payment_proof_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING *
      `,
      [
        name,
        phone,
        normalizedEmergencyContactNumber,
        normalizedAadhaarNumber,
        normalizedGender,
        dob,
        parsedPrimaryAge,
        normalizedStreet,
        normalizedNation,
        normalizedState,
        normalizedDistrict,
        seat_preference,
        normalizedRoomPreference,
        requiresAccessibilitySupport,
        normalizedAccessibilityNote || null,
        normalizedReferenceName,
        normalizedPaymentMode,
        normalizedTransactionIdUtr || null,
        normalizedPaymentPendingStatus || null,
        parsedPaymentAmount,
        paymentProofUrl,
      ],
    );

    const passenger = passengerResult.rows[0];

    console.log("Passenger inserted:", passenger);

    const groupMembers: GroupMember[] = [];

    if (groupMembersStr) {
      console.log("Parsing group members:", groupMembersStr);

      console.log("Parsed group members:", normalizedGroupMembers);

      for (const member of normalizedGroupMembers) {
        console.log("Inserting group member:", member);

        const result = await client.query(
          `
          INSERT INTO group_members
          (passenger_id,name,dob,age,gender,relationship,aadhaar_number,seat_preference,requires_accessibility_support,accessibility_note)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          RETURNING *
          `,
          [
            passenger.id,
            member.name,
            member.dob,
            member.age,
            member.gender,
            member.relationship,
            member.aadhaar_number,
            member.seat_preference,
            member.requires_accessibility_support,
            member.accessibility_note,
          ],
        );

        groupMembers.push(result.rows[0]);
      }
    }

    console.log("Group members inserted:", groupMembers);

    console.log("Running seat allocation...");

    const allocation = await allocateSeats(client, passenger, groupMembers);

    console.log("Seat allocation result:", allocation);

    const seats = allocation.seats;
    const needsReview = allocation.needsReview;
    const reviewReason = allocation.reviewReason;

    if (!seats || seats.length === 0) {
      throw new Error("Seat allocation failed");
    }

    if (seats.length < 1 + groupMembers.length) {
      throw new Error(
        `Insufficient seats allocated: ${seats.length} out of ${1 + groupMembers.length} needed`,
      );
    }

    const bookings = [];

    const mainSeat = seats[0];

    console.log("Assigning seat to main passenger:", mainSeat);

    const mainBooking = await client.query(
      `
      INSERT INTO bookings
      (passenger_id, passenger_name, seat_id, coach_id, booking_status, needs_review, review_reason)
      VALUES ($1,$2,$3,$4,'pending_verification',$5,$6)
      RETURNING *
      `,
      [
        passenger.id,
        passenger.name,
        mainSeat.id,
        mainSeat.coach_id,
        needsReview,
        reviewReason,
      ],
    );

    bookings.push(mainBooking.rows[0]);

    await client.query(
      `
      UPDATE seats
      SET is_booked = true,
          passenger_id = $1,
          group_member_id = NULL
      WHERE id = $2
      `,
      [passenger.id, mainSeat.id],
    );

    console.log("Main seat booked");

    for (let i = 0; i < groupMembers.length; i++) {
      const member = groupMembers[i];
      const seat = seats[i + 1];

      if (!seat) {
        throw new Error(
          `Seat missing for group member ${i + 1}: ${member.name}`,
        );
      }

      console.log("Assigning seat to group member:", member, seat);

      const booking = await client.query(
        `
        INSERT INTO bookings
        (group_member_id, passenger_name, group_member_name, seat_id, coach_id, booking_status, needs_review, review_reason)
        VALUES ($1,$2,$3,$4,$5,'pending_verification',$6,$7)
        RETURNING *
        `,
        [
          member.id,
          passenger.name,
          member.name,
          seat.id,
          seat.coach_id,
          needsReview,
          reviewReason,
        ],
      );

      bookings.push(booking.rows[0]);

      await client.query(
        `
        UPDATE seats
        SET is_booked = true,
            passenger_id = NULL,
            group_member_id = $1
        WHERE id = $2
        `,
        [member.id, seat.id],
      );
    }

    // Trigger coordinator alert if needs_review
    if (needsReview) {
      console.log("📢 Sending coordinator alert for needs_review booking...");
      sendCoordinatorAlert(
        {
          name: passenger.name,
          phone: passenger.phone,
        },
        reviewReason || "Booking needs manual review",
        1 + groupMembers.length,
      );
    }

    await client.query("COMMIT");

    console.log("Booking transaction committed");

    return NextResponse.json({
      message: "Booking created successfully",
      booking_id: bookings[0]?.id,
      coach: mainSeat.coach_id,
      seats: seats.map((s) => ({
        seat_number: s.seat_number,
        berth_type: s.berth_type,
        coach_id: s.coach_id,
      })),
      needs_review: needsReview,
      review_reason: reviewReason,
      bookings,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as RequestError).status === "number"
        ? (error as RequestError).status!
        : typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as RequestError).code === "23505"
          ? 409
          : 500;

    if (status === 409) {
      console.info("Duplicate booking blocked:", message);
    } else {
      console.error("BOOKING ERROR:", error);
    }

    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  } finally {
    client.release();
  }
}

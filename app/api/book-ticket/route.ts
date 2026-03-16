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
  age: number;
  gender: string;
  aadhaar_number: string;
  seat_preference: string | null;
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
      aadhaar_number,
      gender,
      age,
      seat_preference,
      reference_name,
      group_members: groupMembersStr,
    } = fields as Record<string, string>;

    const normalizedReferenceName = reference_name?.trim()
      ? reference_name.trim()
      : null;

    console.log("Parsed passenger fields:", {
      name,
      phone,
      aadhaar_number,
      gender,
      age,
      seat_preference,
      reference_name: normalizedReferenceName,
      groupMembersStr,
    });

    const normalizedAadhaarNumber = validateAadhaar(
      aadhaar_number,
      "Primary passenger",
    );

    // Validate age
    const parsedAge = parseInt(age);

    console.log("Parsed age:", parsedAge);

    if (isNaN(parsedAge)) {
      throw new Error(`Invalid age value received: ${age}`);
    }

    const parsedGroupMembers = groupMembersStr
      ? JSON.parse(groupMembersStr)
      : [];

    if (!Array.isArray(parsedGroupMembers)) {
      throw createRequestError("Group members payload is invalid.", 400);
    }

    const normalizedGroupMembers = parsedGroupMembers.map((member, index) => ({
      ...member,
      aadhaar_number: validateAadhaar(
        member.aadhaar_number,
        `Group member ${index + 1}`,
      ),
    }));

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
      (name, phone, aadhaar_number, gender, age, seat_preference, reference_name, payment_proof_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [
        name,
        phone,
        normalizedAadhaarNumber,
        gender,
        parsedAge,
        seat_preference,
        normalizedReferenceName,
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
          (passenger_id,name,age,gender,aadhaar_number,seat_preference)
          VALUES ($1,$2,$3,$4,$5,$6)
          RETURNING *
          `,
          [
            passenger.id,
            member.name,
            member.age,
            member.gender,
            member.aadhaar_number,
            member.seat_preference,
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

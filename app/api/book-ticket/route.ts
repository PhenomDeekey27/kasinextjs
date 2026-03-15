import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/db";
import { allocateSeats } from "@/lib/services/seatAllocator";
import { sendCoordinatorAlert } from "@/lib/services/alertService";
import { uploadToCloudinary } from "@/lib/services/cloudinaryStorage";
import { parseFormData, fileToBuffer } from "@/lib/services/uploadService";

interface GroupMember {
  id: number;
  name: string;
  age: number;
  gender: string;
  seat_preference: string | null;
  passenger_id: number;
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

    // Validate age
    const parsedAge = parseInt(age);

    console.log("Parsed age:", parsedAge);

    if (isNaN(parsedAge)) {
      throw new Error(`Invalid age value received: ${age}`);
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
      (name, phone, aadhaar_number, gender, age, seat_preference, reference_name, payment_proof_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [
        name,
        phone,
        aadhaar_number,
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

      const parsedGroupMembers = JSON.parse(groupMembersStr);

      console.log("Parsed group members:", parsedGroupMembers);

      for (const member of parsedGroupMembers) {
        console.log("Inserting group member:", member);

        const result = await client.query(
          `
          INSERT INTO group_members
          (passenger_id,name,age,gender,seat_preference)
          VALUES ($1,$2,$3,$4,$5)
          RETURNING *
          `,
          [
            passenger.id,
            member.name,
            member.age,
            member.gender,
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
      (passenger_id, seat_id, coach_id, booking_status, needs_review, review_reason)
      VALUES ($1,$2,$3,'pending_verification',$4,$5)
      RETURNING *
      `,
      [passenger.id, mainSeat.id, mainSeat.coach_id, needsReview, reviewReason],
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
        (group_member_id, seat_id, coach_id, booking_status, needs_review, review_reason)
        VALUES ($1,$2,$3,'pending_verification',$4,$5)
        RETURNING *
        `,
        [member.id, seat.id, seat.coach_id, needsReview, reviewReason],
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

    console.error("BOOKING ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

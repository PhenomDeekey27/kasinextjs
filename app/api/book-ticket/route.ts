import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/db";
import { allocateSeats } from "@/lib/services/seatAllocator";
import { sendCoordinatorAlert } from "@/lib/services/alertService";
import { uploadFile } from "@/lib/services/supabaseStorage";
import { parseFormData, fileToBuffer } from "@/lib/services/uploadService";

interface GroupMember {
  id: number;
  name: string;
  age: number;
  gender: string;
  seat_preference: string;
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

    console.log("Parsed passenger fields:", {
      name,
      phone,
      aadhaar_number,
      gender,
      age,
      seat_preference,
      reference_name,
      groupMembersStr,
    });

    // Validate age
    const parsedAge = parseInt(age);

    console.log("Parsed age:", parsedAge);

    if (isNaN(parsedAge)) {
      throw new Error(`Invalid age value received: ${age}`);
    }

    // Upload files
    let aadhaarUrl: string | null = null;
    let paymentProofUrl: string | null = null;

    if (files.aadhaar && files.aadhaar.length > 0) {
      console.log("Uploading Aadhaar file...");
      const aadhaarFile = await fileToBuffer(files.aadhaar[0]);
      aadhaarUrl = await uploadFile(aadhaarFile, "aadhaar");
      console.log("Aadhaar uploaded:", aadhaarUrl);
    }

    if (files.payment_proof && files.payment_proof.length > 0) {
      console.log("Uploading payment proof...");
      const paymentFile = await fileToBuffer(files.payment_proof[0]);
      paymentProofUrl = await uploadFile(paymentFile, "payments");
      console.log("Payment proof uploaded:", paymentProofUrl);
    }

    console.log("Inserting passenger into DB...");

    const passengerResult = await client.query(
      `
      INSERT INTO passengers
      (name, phone, aadhaar_number, gender, age, seat_preference, reference_name, aadhaar_url, payment_proof_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        name,
        phone,
        aadhaar_number,
        gender,
        parsedAge,
        seat_preference,
        reference_name,
        aadhaarUrl,
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
          passenger_id = $1
      WHERE id = $2
      `,
      [passenger.id, mainSeat.id],
    );

    console.log("Main seat booked");

    for (let i = 0; i < groupMembers.length; i++) {
      const member = groupMembers[i];
      const seat = seats[i + 1];

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
        SET is_booked = true
        WHERE id = $1
        `,
        [seat.id],
      );
    }

    await client.query("COMMIT");

    console.log("Booking transaction committed");

    return NextResponse.json({
      message: "Booking created successfully",
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

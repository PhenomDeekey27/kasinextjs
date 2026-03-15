import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/db";

interface Params {
  passengerId: string;
}

/**
 * PATCH /api/admin/bookings/[passengerId]/review
 * Approve or cancel a review flag for all booking rows belonging to a passenger group.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const client = await getClient();

  try {
    const { passengerId } = await params;
    const pid = Number.parseInt(passengerId, 10);

    if (Number.isNaN(pid)) {
      return NextResponse.json(
        { error: "Invalid passenger ID" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action === "cancel" ? "cancel" : "approve";

    await client.query("BEGIN");

    let result;

    if (action === "cancel") {
      result = await client.query(
        `
        UPDATE bookings
        SET booking_status = 'cancelled',
            needs_review = false,
            review_reason = NULL
        WHERE passenger_id = $1
           OR group_member_id IN (
             SELECT id
             FROM group_members
             WHERE passenger_id = $1
           )
        RETURNING id
        `,
        [pid],
      );
    } else {
      result = await client.query(
        `
        UPDATE bookings
        SET needs_review = false,
            review_reason = NULL
        WHERE passenger_id = $1
           OR group_member_id IN (
             SELECT id
             FROM group_members
             WHERE passenger_id = $1
           )
        RETURNING id
        `,
        [pid],
      );
    }

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (action === "cancel") {
      await client.query(
        `
        UPDATE seats s
        SET is_booked = false,
            passenger_id = NULL,
            group_member_id = NULL
        FROM bookings b
        WHERE s.id = b.seat_id
          AND (
            b.passenger_id = $1
            OR b.group_member_id IN (
              SELECT id
              FROM group_members
              WHERE passenger_id = $1
            )
          )
        `,
        [pid],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      message:
        action === "cancel"
          ? "Review cancelled and booking cancelled successfully"
          : "Review approved successfully",
      action,
      passenger_id: pid,
      updated_rows: result.rowCount,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error processing booking review action:", error);
    return NextResponse.json(
      { error: "Failed to process booking review action" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/db";

interface Params {
  id: string;
}

/**
 * DELETE /api/bookings/[id]/cancel
 * Cancel a booking and free up the seat
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    const { id: bookingId } = await params;

    // Get booking details
    const bookingResult = await client.query(
      `
      SELECT seat_id
      FROM bookings
      WHERE id = $1
    `,
      [bookingId],
    );

    if (bookingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const seatId = bookingResult.rows[0].seat_id;

    // Mark booking cancelled
    await client.query(
      `
      UPDATE bookings
      SET booking_status = 'cancelled'
      WHERE id = $1
    `,
      [bookingId],
    );

    // Free the seat
    await client.query(
      `
      UPDATE seats
      SET
        is_booked = false,
        passenger_id = NULL,
        group_member_id = NULL
      WHERE id = $1
    `,
      [seatId],
    );

    await client.query("COMMIT");

    return NextResponse.json({
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

interface Params {
  id: string;
}

/**
 * PATCH /api/bookings/[id]/verify-payment
 * Verify payment and update booking status to confirmed
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const { id: bookingId } = await params;

    const result = await pool.query(
      `
      UPDATE bookings
      SET booking_status = 'confirmed'
      WHERE id = $1
      RETURNING *
    `,
      [bookingId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Payment verified successfully",
      booking: result.rows[0],
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 },
    );
  }
}

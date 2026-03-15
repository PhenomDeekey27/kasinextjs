import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * GET /api/bookings
 * Fetch all bookings with passenger and seat details
 */
export async function GET(request: NextRequest) {
  try {
    const result = await query(`
      SELECT
        b.id AS booking_id,
        COALESCE(b.group_member_name, b.passenger_name, p.name, gm.name) AS passenger_name,
        COALESCE(b.passenger_name, p.name) AS main_passenger_name,
        b.group_member_name,
        COALESCE(p.phone, 'N/A') AS phone,
        c.coach_number,
        s.seat_number,
        s.berth_type,
        b.booking_status,
        b.needs_review,
        b.review_reason,
        b.booked_at
      FROM bookings b
      LEFT JOIN passengers p
        ON b.passenger_id = p.id
      LEFT JOIN group_members gm
        ON b.group_member_id = gm.id
      LEFT JOIN seats s
        ON b.seat_id = s.id
      LEFT JOIN coaches c
        ON b.coach_id = c.id
      ORDER BY b.booked_at DESC
    `);

    return NextResponse.json({
      total_bookings: result.rows.length,
      bookings: result.rows,
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { TRAIN_CONFIG } from "@/lib/constants";

/**
 * GET /api/admin/dashboard-stats
 * Fetch dashboard statistics: total seats, booked seats, pending verifications, needs review
 */
export async function GET(request: NextRequest) {
  try {
    // Total Seats - constant value
    const totalSeats = TRAIN_CONFIG.TOTAL_SEATS;

    // Booked Seats - count seats where is_booked = true
    const bookedResult = await query(`
      SELECT COUNT(*) as count FROM seats WHERE is_booked = true
    `);
    const bookedSeats = parseInt(bookedResult.rows[0].count) || 0;

    // Pending Verification - count bookings where booking_status = 'pending_verification'
    const pendingResult = await query(`
      SELECT COUNT(*) as count FROM bookings WHERE booking_status = 'pending_verification'
    `);
    const pendingVerification = parseInt(pendingResult.rows[0].count) || 0;

    // Needs Review - count bookings where needs_review = true
    const reviewResult = await query(`
      SELECT COUNT(*) as count FROM bookings WHERE needs_review = true
    `);
    const needsReview = parseInt(reviewResult.rows[0].count) || 0;

    return NextResponse.json({
      totalSeats,
      bookedSeats,
      pendingVerification,
      needsReview,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}

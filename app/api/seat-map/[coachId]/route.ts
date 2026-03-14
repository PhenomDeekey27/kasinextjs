import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Params {
  coachId: string;
}

/**
 * GET /api/seat-map/[coachId]
 * Fetch seat map for a specific coach
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const { coachId } = await params;

    const result = await query(
      `
      SELECT
        s.id,
        s.seat_number,
        s.berth_type,
        s.is_reserved,
        s.is_booked,
        p.name AS passenger_name
      FROM seats s
      LEFT JOIN passengers p
        ON s.passenger_id = p.id
      WHERE s.coach_id = $1
      ORDER BY s.seat_number ASC
    `,
      [coachId],
    );

    return NextResponse.json({
      coach_id: coachId,
      seats: result.rows,
    });
  } catch (error) {
    console.error("Error fetching seat map:", error);
    return NextResponse.json(
      { error: "Failed to fetch seat map" },
      { status: 500 },
    );
  }
}

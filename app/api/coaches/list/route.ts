import { NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * GET /api/coaches/list
 * Fetch all available coaches with their IDs and names
 */
export async function GET() {
  try {
    const result = await query(
      `
      SELECT
        id,
        coach_number
      FROM coaches
      ORDER BY id ASC
    `,
    );

    return NextResponse.json({
      coaches: result.rows,
    });
  } catch (error) {
    console.error("Error fetching coaches:", error);
    return NextResponse.json(
      { error: "Failed to fetch coaches" },
      { status: 500 },
    );
  }
}

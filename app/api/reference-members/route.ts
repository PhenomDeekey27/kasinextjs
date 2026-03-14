import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * GET /api/reference-members
 * Fetch all reference members
 */
export async function GET(request: NextRequest) {
  try {
    const result = await query(
      "SELECT id, name FROM reference_members ORDER BY name",
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching reference members:", error);
    return NextResponse.json(
      { error: "Failed to fetch reference members" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * GET /api/reference-members
 * Fetch all reference members
 */
export async function GET() {
  try {
    // Keep this endpoint self-healing in environments where this table wasn't migrated yet.
    await query(`
      CREATE TABLE IF NOT EXISTS reference_members (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      )
    `);

    const result = await query(
      `
      SELECT
        MIN(id) AS id,
        TRIM(name) AS name
      FROM reference_members
      WHERE COALESCE(TRIM(name), '') <> ''
      GROUP BY LOWER(TRIM(name)), TRIM(name)
      ORDER BY TRIM(name)
      `,
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

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface BookingRecord {
  booking_id: number;
  passenger_id: number;
  main_passenger_name: string;
  phone: string;
  reference_name: string | null;
  seat_numbers: number[];
  seat_assignments: Array<{
    passenger_name: string;
    seat_number: number;
    berth_type: string | null;
    coach_number: string | null;
  }>;
  coach_number: string;
  booking_status: string;
  needs_review: boolean;
  review_reason: string | null;
  booked_at: string;
  total_passengers: number;
}

/**
 * GET /api/admin/bookings
 * Fetch all bookings with filtering, sorting, and pagination
 *
 * Query parameters:
 * - page: number (default: 1)
 * - limit: number (default: 10)
 * - status: string (pending_verification, confirmed, cancelled)
 * - needsReview: boolean (true/false)
 * - sortBy: string (booked_at, passenger_name, status)
 * - sortOrder: string (ASC, DESC)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const offset = (page - 1) * limit;

    // Filter parameters
    const status = searchParams.get("status");
    const needsReview = searchParams.get("needsReview");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Sort parameters
    const sortBy = searchParams.get("sortBy") || "booked_at";
    const sortOrder = (searchParams.get("sortOrder") || "DESC").toUpperCase();

    // Build WHERE clause
    let whereConditions: string[] = [];
    const params: any[] = [];

    if (status) {
      whereConditions.push(`b.booking_status = $${params.length + 1}`);
      params.push(status);
    }

    if (needsReview === "true") {
      whereConditions.push(`b.needs_review = true`);
    } else if (needsReview === "false") {
      whereConditions.push(`b.needs_review = false`);
    }

    if (startDate) {
      whereConditions.push(`b.booked_at >= $${params.length + 1}`);
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`b.booked_at <= $${params.length + 1}`);
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // Build ORDER BY
    const sortOrderSafe = sortOrder === "ASC" ? "ASC" : "DESC";
    const sortByMap: Record<string, string> = {
      booked_at: "booked_at",
      passenger_name: "main_passenger_name",
      booking_status: "booking_status",
    };
    const safeSortBy = sortByMap[sortBy] || "booked_at";

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM passengers p
      JOIN bookings b
        ON (
          b.passenger_id = p.id
          OR b.group_member_id IN (
            SELECT gm.id
            FROM group_members gm
            WHERE gm.passenger_id = p.id
          )
        )
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total) || 0;

    // Get paginated results
    const bookingsQuery = `
      WITH grouped AS (
        SELECT
          MIN(b.id) AS booking_id,
          p.id AS passenger_id,
          p.name AS main_passenger_name,
          p.phone,
          NULLIF(TRIM(p.reference_name), '') AS reference_name,
          COALESCE(ARRAY_AGG(s.seat_number ORDER BY s.seat_number), ARRAY[]::INT[]) AS seat_numbers,
          COALESCE(MIN(c.coach_number), 'N/A') AS coach_number,
          (ARRAY_AGG(b.booking_status ORDER BY b.booked_at DESC))[1] AS booking_status,
          BOOL_OR(COALESCE(b.needs_review, false)) AS needs_review,
          MAX(b.review_reason) FILTER (WHERE b.review_reason IS NOT NULL) AS review_reason,
          MIN(b.booked_at) AS booked_at,
          COUNT(b.id)::INT AS total_passengers,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'passenger_name', COALESCE(gm.name, p.name),
                'seat_number', s.seat_number,
                'berth_type', s.berth_type,
                'coach_number', c.coach_number
              )
              ORDER BY s.seat_number
            ) FILTER (WHERE s.seat_number IS NOT NULL),
            '[]'::JSON
          ) AS seat_assignments
        FROM passengers p
        JOIN bookings b
          ON (
            b.passenger_id = p.id
            OR b.group_member_id IN (
              SELECT gm2.id
              FROM group_members gm2
              WHERE gm2.passenger_id = p.id
            )
          )
        LEFT JOIN group_members gm ON gm.id = b.group_member_id
        LEFT JOIN seats s ON s.id = b.seat_id
        LEFT JOIN coaches c ON c.id = b.coach_id
        ${whereClause}
        GROUP BY p.id, p.name, p.phone, p.reference_name
      )
      SELECT *
      FROM grouped
      ORDER BY ${safeSortBy} ${sortOrderSafe}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const bookingsResult = await query(bookingsQuery, params);

    const bookings: BookingRecord[] = bookingsResult.rows.map((row: any) => ({
      booking_id: Number(row.booking_id),
      passenger_id: Number(row.passenger_id),
      main_passenger_name: row.main_passenger_name,
      phone: row.phone,
      reference_name: row.reference_name,
      seat_numbers: Array.isArray(row.seat_numbers)
        ? row.seat_numbers.map((seat: unknown) => Number(seat)).filter((seat: number) => !Number.isNaN(seat))
        : [],
      seat_assignments: Array.isArray(row.seat_assignments)
        ? row.seat_assignments
        : typeof row.seat_assignments === "string"
          ? JSON.parse(row.seat_assignments)
          : [],
      coach_number: row.coach_number || "N/A",
      booking_status: row.booking_status || "pending_verification",
      needs_review: Boolean(row.needs_review),
      review_reason: row.review_reason,
      booked_at: row.booked_at,
      total_passengers: Number(row.total_passengers) || 0,
    }));

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        status,
        needsReview,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

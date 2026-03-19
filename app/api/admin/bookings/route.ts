import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface BookingRecord {
  booking_id: number;
  passenger_id: number;
  main_passenger_name: string;
  aadhaar_number: string | null;
  emergency_contact_number: string | null;
  group_member_names: string[];
  group_member_aadhaar_numbers: string[];
  phone: string;
  reference_name: string | null;
  room_preference: string | null;
  requires_accessibility_support: boolean;
  payment_mode: string | null;
  payment_type: string | null;
  payment_pending_status: string | null;
  seat_numbers: number[];
  seat_assignments: Array<{
    passenger_name: string;
    aadhaar_number: string | null;
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

interface BookingQueryRow {
  booking_id: number | string;
  passenger_id: number | string;
  main_passenger_name: string;
  aadhaar_number: string | null;
  emergency_contact_number: string | null;
  group_member_names: unknown;
  group_member_aadhaar_numbers: unknown;
  phone: string;
  reference_name: string | null;
  room_preference: string | null;
  requires_accessibility_support: unknown;
  payment_mode: string | null;
  payment_type: string | null;
  payment_pending_status: string | null;
  seat_numbers: unknown;
  seat_assignments: unknown;
  coach_number: string | null;
  booking_status: string | null;
  needs_review: unknown;
  review_reason: string | null;
  booked_at: string;
  total_passengers: number | string;
}

/**
 * GET /api/admin/bookings
 * Fetch all bookings with filtering, sorting, and pagination
 *
 * Query parameters:
 * - page: number (default: 1)
 * - limit: number (default: 10)
 * - search: string
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
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10")),
    );
    const offset = (page - 1) * limit;

    // Filter parameters
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const needsReview = searchParams.get("needsReview");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const roomPreference = searchParams.get("roomPreference");
    const accessibilitySupport = searchParams.get("accessibilitySupport");
    const paymentMode = searchParams.get("paymentMode");
    const paymentType = searchParams.get("paymentType");
    const paymentPendingStatus = searchParams.get("paymentPendingStatus");
    const coachNumber = searchParams.get("coachNumber")?.trim();
    const referenceName = searchParams.get("referenceName")?.trim();
    const minPassengers = searchParams.get("minPassengers");
    const maxPassengers = searchParams.get("maxPassengers");

    // Sort parameters
    const sortBy = searchParams.get("sortBy") || "booked_at";
    const sortOrder = (searchParams.get("sortOrder") || "DESC").toUpperCase();

    // Build WHERE clause
    const whereConditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      whereConditions.push(`(
        EXISTS (
          SELECT 1
          FROM bookings b_search
          WHERE (
            b_search.passenger_id = p.id
            OR b_search.group_member_id IN (
              SELECT gm_search.id
              FROM group_members gm_search
              WHERE gm_search.passenger_id = p.id
            )
          )
          AND (
            COALESCE(b_search.passenger_name, '') ILIKE $${params.length + 1}
            OR COALESCE(b_search.group_member_name, '') ILIKE $${params.length + 1}
          )
        )
        OR COALESCE(p.phone, '') ILIKE $${params.length + 1}
        OR COALESCE(p.aadhaar_number, '') ILIKE $${params.length + 1}
        OR EXISTS (
          SELECT 1
          FROM group_members gm_search
          WHERE gm_search.passenger_id = p.id
            AND COALESCE(gm_search.aadhaar_number, '') ILIKE $${params.length + 1}
        )
      )`);
      params.push(`%${search}%`);
    }

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

    if (roomPreference) {
      whereConditions.push(`LOWER(COALESCE(p.room_preference, '')) = $${params.length + 1}`);
      params.push(roomPreference.toLowerCase());
    }

    if (accessibilitySupport === "true") {
      whereConditions.push(`(
        COALESCE(p.requires_accessibility_support, false) = true
        OR EXISTS (
          SELECT 1
          FROM group_members gm_support
          WHERE gm_support.passenger_id = p.id
            AND COALESCE(gm_support.requires_accessibility_support, false) = true
        )
      )`);
    } else if (accessibilitySupport === "false") {
      whereConditions.push(`(
        COALESCE(p.requires_accessibility_support, false) = false
        AND NOT EXISTS (
          SELECT 1
          FROM group_members gm_support
          WHERE gm_support.passenger_id = p.id
            AND COALESCE(gm_support.requires_accessibility_support, false) = true
        )
      )`);
    }

    if (paymentMode) {
      whereConditions.push(`LOWER(COALESCE(p.payment_mode, '')) = $${params.length + 1}`);
      params.push(paymentMode.toLowerCase());
    }

    if (paymentType) {
      whereConditions.push(`LOWER(COALESCE(p.payment_type, '')) = $${params.length + 1}`);
      params.push(paymentType.toLowerCase());
    }

    if (paymentPendingStatus) {
      whereConditions.push(`COALESCE(p.payment_pending_status, '') = $${params.length + 1}`);
      params.push(paymentPendingStatus);
    }

    if (coachNumber) {
      whereConditions.push(`COALESCE(c.coach_number, '') ILIKE $${params.length + 1}`);
      params.push(`%${coachNumber}%`);
    }

    if (referenceName) {
      whereConditions.push(`COALESCE(p.reference_name, '') ILIKE $${params.length + 1}`);
      params.push(`%${referenceName}%`);
    }

    if (minPassengers && !Number.isNaN(Number(minPassengers))) {
      whereConditions.push(`(
        SELECT COUNT(*)
        FROM bookings b_count
        WHERE b_count.passenger_id = p.id
           OR b_count.group_member_id IN (
             SELECT gm_count.id FROM group_members gm_count WHERE gm_count.passenger_id = p.id
           )
      ) >= $${params.length + 1}`);
      params.push(Number(minPassengers));
    }

    if (maxPassengers && !Number.isNaN(Number(maxPassengers))) {
      whereConditions.push(`(
        SELECT COUNT(*)
        FROM bookings b_count
        WHERE b_count.passenger_id = p.id
           OR b_count.group_member_id IN (
             SELECT gm_count.id FROM group_members gm_count WHERE gm_count.passenger_id = p.id
           )
      ) <= $${params.length + 1}`);
      params.push(Number(maxPassengers));
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Build ORDER BY
    const sortOrderSafe = sortOrder === "ASC" ? "ASC" : "DESC";
    const sortByMap: Record<string, string> = {
      booked_at: "booked_at",
      passenger_name: "main_passenger_name",
      booking_status: "booking_status",
      total_passengers: "total_passengers",
      room_preference: "room_preference",
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
      LEFT JOIN group_members gm ON gm.id = b.group_member_id
      LEFT JOIN seats s ON s.id = b.seat_id
      LEFT JOIN coaches c ON c.id = b.coach_id
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
          COALESCE(MAX(NULLIF(TRIM(b.passenger_name), '')), p.name) AS main_passenger_name,
          p.aadhaar_number,
          COALESCE(
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT NULLIF(TRIM(b.group_member_name), '')), NULL),
            ARRAY[]::TEXT[]
          ) AS group_member_names,
          COALESCE(
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT gm.aadhaar_number), NULL),
            ARRAY[]::TEXT[]
          ) AS group_member_aadhaar_numbers,
          p.phone,
          p.emergency_contact_number,
          NULLIF(TRIM(p.reference_name), '') AS reference_name,
          p.room_preference,
          COALESCE(p.requires_accessibility_support, false) AS requires_accessibility_support,
          p.payment_mode,
          p.payment_type,
          p.payment_pending_status,
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
                'aadhaar_number', COALESCE(gm.aadhaar_number, p.aadhaar_number),
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
        GROUP BY
          p.id,
          p.name,
          p.phone,
          p.emergency_contact_number,
          p.aadhaar_number,
          p.reference_name,
          p.room_preference,
          p.requires_accessibility_support,
          p.payment_mode,
          p.payment_type,
          p.payment_pending_status
      )
      SELECT *
      FROM grouped
      ORDER BY ${safeSortBy} ${sortOrderSafe}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const bookingsResult = await query(bookingsQuery, params);

    const bookings: BookingRecord[] = bookingsResult.rows.map((rawRow) => {
      const row = rawRow as BookingQueryRow;

      return {
      booking_id: Number(row.booking_id),
      passenger_id: Number(row.passenger_id),
      main_passenger_name: row.main_passenger_name,
      aadhaar_number: row.aadhaar_number,
      group_member_names: Array.isArray(row.group_member_names)
        ? row.group_member_names.filter(
            (name: unknown): name is string =>
              typeof name === "string" && name.trim().length > 0,
          )
        : [],
      group_member_aadhaar_numbers: Array.isArray(row.group_member_aadhaar_numbers)
        ? row.group_member_aadhaar_numbers.filter(
            (aadhaar: unknown): aadhaar is string =>
              typeof aadhaar === "string" && aadhaar.trim().length > 0,
          )
        : [],
      phone: row.phone,
      emergency_contact_number: row.emergency_contact_number,
      reference_name: row.reference_name,
      room_preference: row.room_preference,
      requires_accessibility_support: Boolean(row.requires_accessibility_support),
      payment_mode: row.payment_mode,
      payment_type: row.payment_type,
      payment_pending_status: row.payment_pending_status,
      seat_numbers: Array.isArray(row.seat_numbers)
        ? row.seat_numbers
            .map((seat: unknown) => Number(seat))
            .filter((seat: number) => !Number.isNaN(seat))
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
      };
    });

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        search,
        status,
        needsReview,
        startDate,
        endDate,
        roomPreference,
        accessibilitySupport,
        paymentMode,
        paymentType,
        paymentPendingStatus,
        coachNumber,
        referenceName,
        minPassengers,
        maxPassengers,
      },
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 },
    );
  }
}

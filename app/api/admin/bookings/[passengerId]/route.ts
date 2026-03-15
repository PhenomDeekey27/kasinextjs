import { NextRequest, NextResponse } from "next/server";
import { getClient, query } from "@/lib/db";

interface Params {
  passengerId: string;
}

/**
 * GET /api/admin/bookings/[passengerId]
 * Fetch full booking details for a single passenger
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const { passengerId } = await params;
    const pid = parseInt(passengerId);

    if (isNaN(pid)) {
      return NextResponse.json({ error: "Invalid passenger ID" }, { status: 400 });
    }

    const result = await query(
      `
      SELECT
        p.id                                                        AS passenger_id,
        p.name                                                      AS main_passenger_name,
        p.phone,
        p.aadhaar_number,
        p.gender,
        p.age,
        p.seat_preference,
        NULLIF(TRIM(p.reference_name), '')                          AS reference_name,
        p.payment_proof_url,
        MIN(b.id)                                                   AS booking_id,
        (ARRAY_AGG(b.booking_status ORDER BY b.booked_at DESC))[1]  AS booking_status,
        BOOL_OR(COALESCE(b.needs_review, false))                    AS needs_review,
        MAX(b.review_reason) FILTER (WHERE b.review_reason IS NOT NULL) AS review_reason,
        MIN(b.booked_at)                                            AS booked_at,
        COUNT(b.id)::INT                                            AS total_passengers,
        COALESCE(MIN(co.coach_number), 'N/A')                       AS coach_number,
        COALESCE(
          ARRAY_AGG(s.seat_number ORDER BY s.seat_number)
          FILTER (WHERE s.seat_number IS NOT NULL),
          ARRAY[]::INT[]
        )                                                           AS seat_numbers,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'booking_id',    b.id,
              'passenger_name', COALESCE(gm.name, p.name),
              'seat_number',   s.seat_number,
              'berth_type',    s.berth_type,
              'coach_number',  co.coach_number,
              'age',           COALESCE(gm.age, p.age),
              'gender',        COALESCE(gm.gender, p.gender)
            )
            ORDER BY s.seat_number
          ) FILTER (WHERE s.seat_number IS NOT NULL),
          '[]'::JSON
        )                                                           AS seat_assignments
      FROM passengers p
      JOIN bookings b
        ON (
          b.passenger_id = p.id
          OR b.group_member_id IN (
            SELECT gm2.id FROM group_members gm2 WHERE gm2.passenger_id = p.id
          )
        )
      LEFT JOIN group_members gm  ON gm.id  = b.group_member_id
      LEFT JOIN seats         s   ON s.id   = b.seat_id
      LEFT JOIN coaches       co  ON co.id  = b.coach_id
      WHERE p.id = $1
      GROUP BY
        p.id, p.name, p.phone, p.aadhaar_number,
        p.gender, p.age, p.seat_preference,
        p.reference_name, p.payment_proof_url
      `,
      [pid],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      passenger_id:        Number(row.passenger_id),
      booking_id:          Number(row.booking_id),
      main_passenger_name: row.main_passenger_name,
      phone:               row.phone,
      aadhaar_number:      row.aadhaar_number,
      gender:              row.gender,
      age:                 row.age != null ? Number(row.age) : null,
      seat_preference:     row.seat_preference,
      reference_name:      row.reference_name,
      payment_proof_url:   row.payment_proof_url,
      booking_status:      row.booking_status || "pending_verification",
      needs_review:        Boolean(row.needs_review),
      review_reason:       row.review_reason,
      booked_at:           row.booked_at,
      total_passengers:    Number(row.total_passengers) || 0,
      coach_number:        row.coach_number || "N/A",
      seat_numbers:        Array.isArray(row.seat_numbers)
        ? row.seat_numbers.map((n: unknown) => Number(n))
        : [],
      seat_assignments: Array.isArray(row.seat_assignments)
        ? row.seat_assignments
        : typeof row.seat_assignments === "string"
          ? JSON.parse(row.seat_assignments)
          : [],
    });
  } catch (error) {
    console.error("Error fetching booking detail:", error);
    return NextResponse.json({ error: "Failed to fetch booking detail" }, { status: 500 });
  }
}

const VALID_STATUSES = ["pending_verification", "confirmed", "cancelled"] as const;
type BookingStatus = (typeof VALID_STATUSES)[number];

/**
 * PATCH /api/admin/bookings/[passengerId]
 * Update the booking status for all bookings of a passenger.
 * Updates: bookings.booking_status + seats.is_booked (and clears/restores ownership)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const client = await getClient();

  try {
    const { passengerId } = await params;
    const pid = parseInt(passengerId);

    if (isNaN(pid)) {
      return NextResponse.json({ error: "Invalid passenger ID" }, { status: 400 });
    }

    const body = await request.json();
    const newStatus: string = body?.status;

    if (!VALID_STATUSES.includes(newStatus as BookingStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    await client.query("BEGIN");

    // 1. Update status on every booking row belonging to this passenger
    const updateBookings = await client.query(
      `
      UPDATE bookings
      SET booking_status = $1
      WHERE passenger_id = $2
         OR group_member_id IN (
           SELECT id FROM group_members WHERE passenger_id = $2
         )
      RETURNING id
      `,
      [newStatus, pid],
    );

    if (updateBookings.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // 2. Update seats based on the new status
    if (newStatus === "cancelled") {
      // Release all seats owned by this passenger or their group members
      await client.query(
        `
        UPDATE seats s
        SET is_booked        = false,
            passenger_id     = NULL,
            group_member_id  = NULL
        FROM bookings b
        WHERE s.id = b.seat_id
          AND (
            b.passenger_id = $1
            OR b.group_member_id IN (
              SELECT id FROM group_members WHERE passenger_id = $1
            )
          )
        `,
        [pid],
      );
    } else {
      // Re-claim the seats (handles reverting from cancelled back to pending/confirmed)
      await client.query(
        `
        UPDATE seats s
        SET is_booked        = true,
            passenger_id     = b.passenger_id,
            group_member_id  = b.group_member_id
        FROM bookings b
        WHERE s.id = b.seat_id
          AND (
            b.passenger_id = $1
            OR b.group_member_id IN (
              SELECT id FROM group_members WHERE passenger_id = $1
            )
          )
        `,
        [pid],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      message: `Status updated to '${newStatus}' successfully`,
      passenger_id: pid,
      new_status: newStatus,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating booking status:", error);
    return NextResponse.json({ error: "Failed to update booking status" }, { status: 500 });
  } finally {
    client.release();
  }
}

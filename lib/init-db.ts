import { queryWithClient, rawGetClient } from "./db";

const SEAT_TYPES = [
  "lower",
  "middle",
  "upper",
  "lower",
  "middle",
  "upper",
  "side_lower",
  "side_upper",
] as const;

let initRunPromise: Promise<void> | null = null;

export async function initDatabase(): Promise<void> {
  if (initRunPromise) {
    return initRunPromise;
  }

  initRunPromise = (async () => {
    console.log("Initializing database schema...");

    const client = await rawGetClient();

    try {
      await client.query("BEGIN");

      console.log("Ensuring passengers table exists...");
      await queryWithClient(
        client,
        `
      CREATE TABLE IF NOT EXISTS passengers (
        id SERIAL PRIMARY KEY,
        name TEXT,
        phone TEXT,
        aadhaar_number TEXT,
        gender TEXT,
        age INT,
        seat_preference TEXT,
        reference_name TEXT,
        aadhaar_url TEXT,
        payment_proof_url TEXT
      )
      `,
      );

      console.log("Ensuring group_members table exists...");
      await queryWithClient(
        client,
        `
      CREATE TABLE IF NOT EXISTS group_members (
        id SERIAL PRIMARY KEY,
        passenger_id INT REFERENCES passengers(id),
        name TEXT,
        age INT,
        gender TEXT,
        seat_preference TEXT
      )
      `,
      );

      console.log("Ensuring coaches table exists...");
      await queryWithClient(
        client,
        `
      CREATE TABLE IF NOT EXISTS coaches (
        id SERIAL PRIMARY KEY,
        coach_number TEXT
      )
      `,
      );

      console.log("Ensuring seats table exists...");
      await queryWithClient(
        client,
        `
      CREATE TABLE IF NOT EXISTS seats (
        id SERIAL PRIMARY KEY,
        seat_number INT,
        berth_type TEXT,
        coach_id INT REFERENCES coaches(id),
        is_booked BOOLEAN DEFAULT FALSE,
        is_reserved BOOLEAN DEFAULT FALSE,
        passenger_id INT REFERENCES passengers(id)
      )
      `,
      );

      console.log("Ensuring bookings table exists...");
      await queryWithClient(
        client,
        `
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        passenger_id INT REFERENCES passengers(id),
        group_member_id INT REFERENCES group_members(id),
        seat_id INT REFERENCES seats(id),
        coach_id INT REFERENCES coaches(id),
        booking_status TEXT,
        needs_review BOOLEAN,
        review_reason TEXT,
        booked_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      );

      console.log("Ensuring default coach exists...");
      await queryWithClient(
        client,
        `
      INSERT INTO coaches (coach_number)
      SELECT 'A1'
      WHERE NOT EXISTS (SELECT 1 FROM coaches)
      `,
      );

      console.log("Ensuring default seats exist...");
      await queryWithClient(
        client,
        `
      INSERT INTO seats (seat_number, berth_type, coach_id)
      SELECT
        series.seat_number,
        seat_types.berth_type,
        coach.id
      FROM generate_series(1, 72) AS series(seat_number)
      CROSS JOIN LATERAL (
        SELECT id
        FROM coaches
        ORDER BY id ASC
        LIMIT 1
      ) AS coach
      CROSS JOIN LATERAL (
        SELECT ($1::text[])[((series.seat_number - 1) % 8) + 1] AS berth_type
      ) AS seat_types
      WHERE NOT EXISTS (SELECT 1 FROM seats)
      `,
        [SEAT_TYPES],
      );

      await client.query("COMMIT");
      console.log("Database initialization complete.");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Database initialization failed:", error);
      throw error;
    } finally {
      client.release();
    }
  })().catch((error) => {
    initRunPromise = null;
    throw error;
  });

  return initRunPromise;
}

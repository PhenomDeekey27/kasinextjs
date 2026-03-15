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

const REFERENCE_MEMBERS = [
  "Rajesh Kumar",
  "Priya Sharma",
  "Amit Patel",
  "Neha Gupta",
  "Rahul Singh",
  "Anjali Verma",
  "Vikram Rao",
  "Deepika Nair",
  "Arun Mishra",
  "Divya Iyer",
  "Sanjay Reddy",
  "Pooja Kapoor",
  "Arjun Menon",
  "Radha Pillai",
  "Nikhil Desai",
  "Shreya Bhat",
  "Rohan Joshi",
  "Kavya Sinha",
  "Ashok Verma",
  "Meera Devi",
  "Anand Rao",
  "Harini Tamil",
  "Karan Singh",
  "Isha Sharma",
  "Suresh Kumar",
  "Nisha Gupta",
  "Arpit Jain",
  "Chithra Nambiar",
  "Ravi Prakash",
  "Ananya Mukherjee",
  "Sameer Khan",
  "Ritika Malhotra",
  "Varun Chopra",
  "Prerna Bhatt",
  "Manoj Singh",
  "Sneha Roy",
  "Harsh Patel",
  "Divyam Agrawal",
  "Siddharth Verma",
  "Sakshi Sharma",
  "Raj Malhotra",
  "Geetika Singh",
  "Abhishek Nair",
  "Aparna Mohan",
  "Nitin Rao",
  "Swati Jain",
  "Tanuj Kapoor",
  "Neelam Desai",
  "Vipul Yadav",
  "Pooja Singh",
  "Manish Kumar",
  "Anita Verma",
  "Shravan Pillai",
  "Leela Iyer",
  "Akshay Reddy",
  "Chandra Bhat",
  "Roopa Sinha",
  "Gautam Joshi",
  "Harshita Tamil",
  "Keshav Rao",
  "Isha Nambiar",
  "Ramesh Prakash",
  "Anjum Khan",
  "Siddesh Rao",
  "Tara Sharma",
  "Pranav Malhotra",
  "Uma Devi",
  "Vikas Patel",
  "Vedavati Roy",
  "Yash Agrawal",
  "Yamini Singh",
  "Shivam Kapoor",
  "Yugandhar Verma",
  "Zebu Iyer",
  "Zainab Khan",
  "Aakash Nair",
  "Aadhya Mohan",
  "Aatreya Yadav",
  "Aavya Jain",
  "Abhi Desai",
  "Achal Pillai",
  "Aditi Sharma",
  "Aditya Roy",
  "Afroz Khan",
  "Agam Malhotra",
  "Agni Verma",
  "Agrawal Patel",
  "Agrima Singh",
  "Ahalya Reddy",
  "Ahamiya Bhat",
  "Ajay Sinha",
  "Ajaya Joshi",
  "Akanksha Tamil",
  "Akanksha Rao",
  "Akbar Nambiar",
  "Akshara Prakash",
  "Akshit Khan",
  "Alaina Rao",
  "Alanis Sharma",
  "Alark Malhotra",
  "Alarmel Devi",
  "Alaya Patel",
  "Albena Roy",
  "Alden Agrawal",
  "Alder Singh",
  "Alec Kapoor",
  "Alecia Verma",
  "Aleen Iyer",
  "Alena Mohan",
  "Alenia Yadav",
  "Aleris Jain",
  "Aleron Desai",
  "Alesa Pillai",
  "Alesia Sharma",
  "Aleta Row",
  "Aletta Nair",
  "Aleudin Khan",
  "Alev Rao",
  "Alexa Singh",
  "Alexei Malhotra",
  "Alexia Devi",
  "Alexina Patel",
  "Alexio Tamil",
  "Alexios Joshi",
  "Alexios Reddy",
  "Alexis Bhat",
  "Alexius Sinha",
  "Alexya Khan",
  "Alfian Rao",
  "Alfira Sharma",
  "Alfonsino Nambiar",
  "Alfonzo Prakash",
  "Alfreda Kapoor",
  "Alfredo Verma",
  "Algae Iyer",
  "Alger Mohan",
  "Algia Yadav",
  "Algid Jain",
  "Algie Desai Pillai",
  "Algis Sharma",
  "Algitha Roy",
  "Algot Agrawal",
  "Algrim Singh",
  "Alguaine Malhotra",
  "Alhagi Verma",
  "Alhassan Iyer",
  "Alhaua Mohan",
  "Alhaw Yadav",
  "Alheah Jain",
  "Alheah Desai",
  "Alheary Pillai",
  "Alheary Sharma",
  "Alheaty Roy",
  "Alheda Agrawal",
  "Alheir Singh",
  "Alheka Malhotra",
  "Alhela Verma",
  "Alhele Iyer",
  "Alhelia Mohan",
  "Alhelie Yadav",
  "Alhelis Jain",
  "Alhelix Desai",
  "Alhemira Pillai",
  "Alhena Sharma",
  "Alhenaj Roy",
  "Alhenald Agrawal",
  "Alhenari Singh",
  "Alhenassa Malhotra",
  "Alhenat Verma",
];

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

      console.log("Ensuring reference_members table exists...");
      await queryWithClient(
        client,
        `
      CREATE TABLE IF NOT EXISTS reference_members (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      )
      `,
      );

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
        passenger_id INT REFERENCES passengers(id),
        group_member_id INT REFERENCES group_members(id)
      )
      `,
      );

      // Backfill-safe migration for already existing databases.
      await queryWithClient(
        client,
        `
      ALTER TABLE seats
      ADD COLUMN IF NOT EXISTS group_member_id INT REFERENCES group_members(id)
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
        passenger_name TEXT,
        group_member_name TEXT,
        seat_id INT REFERENCES seats(id),
        coach_id INT REFERENCES coaches(id),
        booking_status TEXT,
        needs_review BOOLEAN,
        review_reason TEXT,
        booked_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS passenger_name TEXT
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS group_member_name TEXT
      `,
      );

      await queryWithClient(
        client,
        `
      UPDATE bookings b
      SET passenger_name = p.name
      FROM passengers p
      WHERE b.passenger_id = p.id
        AND (b.passenger_name IS NULL OR TRIM(b.passenger_name) = '')
      `,
      );

      await queryWithClient(
        client,
        `
      UPDATE bookings b
      SET group_member_name = gm.name,
          passenger_name = COALESCE(b.passenger_name, p.name)
      FROM group_members gm
      LEFT JOIN passengers p ON p.id = gm.passenger_id
      WHERE b.group_member_id = gm.id
        AND (
          b.group_member_name IS NULL
          OR TRIM(b.group_member_name) = ''
          OR b.passenger_name IS NULL
          OR TRIM(b.passenger_name) = ''
        )
      `,
      );

      console.log("Creating 18 coaches...");
      for (let i = 1; i <= 18; i++) {
        const coachNum = i.toString().padStart(2, "0");
        const coachId = `A${coachNum}`;

        await queryWithClient(
          client,
          `
        INSERT INTO coaches (coach_number)
        SELECT $1
        WHERE NOT EXISTS (SELECT 1 FROM coaches WHERE coach_number = $1)
        `,
          [coachId],
        );

        console.log(`  ✓ Coach ${coachId} ensured`);
      }

      console.log("Creating seats for all coaches...");
      const coachResult = await queryWithClient(
        client,
        "SELECT id FROM coaches ORDER BY id",
      );
      const coaches = coachResult.rows;

      for (const coach of coaches) {
        await queryWithClient(
          client,
          `
        INSERT INTO seats (seat_number, berth_type, coach_id)
        SELECT
          series.seat_number,
          seat_types.berth_type,
          $1::INT
        FROM generate_series(1, 72) AS series(seat_number)
        CROSS JOIN LATERAL (
          SELECT ($2::text[])[((series.seat_number - 1) % 8) + 1] AS berth_type
        ) AS seat_types
        WHERE NOT EXISTS (SELECT 1 FROM seats WHERE coach_id = $1)
        `,
          [coach.id, SEAT_TYPES],
        );
      }

      console.log("Marking reserved seats (3, 35, 70) in all coaches...");
      await queryWithClient(
        client,
        `
      UPDATE seats
      SET is_reserved = true
      WHERE seat_number IN (3, 35, 70)
      `,
      );

      console.log("Seeding reference members...");
      for (const memberName of REFERENCE_MEMBERS) {
        await queryWithClient(
          client,
          `
        INSERT INTO reference_members (name)
        VALUES ($1)
        ON CONFLICT (name) DO NOTHING
        `,
          [memberName],
        );
      }

      console.log(`  ✓ Seeded ${REFERENCE_MEMBERS.length} reference members`);

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

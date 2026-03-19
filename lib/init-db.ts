import { queryWithClient, rawGetClient } from "./db";
import { SUPPORT_CONTACT_NUMBER } from "./constants";

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
  "APC sir",
  "ANBAZHAGAN A",
  "AMIRTHALAKSHMI",
  "ANGAMMAL",
  "ANJALI",
  "ANNAMALAI",
  "ARUL MOZHI",
  "B SATHISH KUMAR",
  "BALAJI K SENTHIL",
  "BHAKYARAJ",
  "BHASKARAN",
  "BHUVANA",
  "C SAKTHIVEL",
  "CHINNA DURAI",
  "CHITHRA SAKTHIVELAN",
  "DHATCHINA MOORTHI",
  "DINAKARAN",
  "DURGA BHAGYARAJ",
  "G VENKATESHKUMAR",
  "G VENKATRAMAN",
  "GANAPATHI",
  "GANESAN SIR (HEAD)",
  "GEETHA BALACHANDAR",
  "GOKULAKANNAN",
  "GOPALA KRISHNAN",
  "GURU PRASANNA(Karthi Ane Govinth)",
  "GURUMOORTHI SOWCARPET",
  "HEMA",
  "ILAIYARANI",
  "JAWAHAR",
  "KANNAN N",
  "KARPAGAM",
  "KARTHIKEYAN Sriperumbudur",
  "KARTHIKEYAN R (Maraimalainagar)",
  "KARTHIKEYAN perambur(Karthik JJ)",
  "KARUNAKARAN",
  "KASI RAJAN",
  "KAVITHA CHAKARAVARTHY",
  "KAVITHA S (Thiruvannamalai)",
  "KUMARASWAMY",
  "LAVANYA",
  "LOHANATHAN",
  "M PUSPARAJAN",
  "MADESHWARI",
  "MALAR",
  "MALATHI",
  "MANIMEKALAI",
  "MATHIYALAGAN",
  "MUTHAMIL SELVAN",
  "MUTHUSAMY (Muthu M SAAMY)",
  "MUTHUSAMY (Muthusamyk6679)",
  "N THILAGAVATHY",
  "NAGARAJ",
  "NAGARAJU P",
  "NIRMALA",
  "P MOORTHY",
  "PADMANABAN",
  "PALANI VEL",
  "PALANISAMY V",
  "PARIMALA GANDHI",
  "PARTHIBAN",
  "PONRAJ",
  "PRAKASAM",
  "PRAKASAM",
  "PRATHABAN N",
  "PRATHAP",
  "PRAVEEN KUMAR",
  "RAGHU",
  "RAJA",
  "RAJESWARI S",
  "RAMALAKSHMI",
  "RAMALAKSHMI C",
  "RAMESH",
  "RANJITH",
  "RAVI k",
  "RENUGA DEVI",
  "RUKKU Swamy Vasan",
  "S R PALANISAMY",
  "SAI SIVA",
  "SANKAR B",
  "SANKAR R",
  "SARASWATI",
  "SARAVANAN Neyveli",
  "SARAVANAN D",
  "SARAVANAN FORD",
  "SARAVANAN P Ambattur786",
  "SELVAKUMAR",
  "SELVAMANI",
  "SELVARASU",
  "SENTHIL KUMAR",
  "SHANMUGA VEL",
  "SOMASUNDARAM SIR",
  "SOORNA MOORTHY",
  "SOWTHRI",
  "SRI RAM MANOGAR",
  "SRIPATHI Venkatesan",
  "SRIRAM",
  "SUBRAMANIAN S  LIFT",
  "SUBRAMANIAN R",
  "SUNDARAMOORTHY",
  "SURESH",
  "SUYAMBUKANI",
  "T SIVAKUMAR",
  "TAMIL ARASAN",
  "TAMIL VANAN",
  "THAMARAI",
  "THANGARANI S",
  "THARANI",
  "THIYANESWARAN",
  "THURAISAMY VETHAM VASTU",
  "UMA RAJAVEL",
  "UMA LAKSHANYAA",
  "UMA SATHYA",
  "VALLI",
  "VASUDEV A KRISHNA",
  "VELPAANDIYAN",
  "VENGADESH ELANCZHIYAN",
  "VENKATESWARA PERUMAL",
  "VENUGOPAL",
  "VIJAYA A",
  "VV  SENTHIL",
  "YUGA PRIYA",
  "SAJANA",
  "KARTHIKEYAN T (Musuri)",
  "SENTHIL ARUNACHALAM",
  "ANBARASAN",
  "TAMILARASU",
  "THANGARAJ",
  "MANJULA MAM",
  "PRABAVATHI k",
  "KRISHNAMURTHY V",
  "SRIDHAR V",
  "KS RAVIKUMAR",
  "INDRADEVI",
  "GOWRI",
  "RAJA D",
  "SARAVANAN S",
  "GUNASEKARAN KS",
  "USHA RANI",
  "SELVAKUMAR M",
  "PURUSOTHAMAN S",
  "RAMASUBBU",
  "BALAN KR",
  "MAHESWARI RAMACHANDRAN",
  "KAVIN KUMAR",
  "ARUL E",
  "UMA RANI M",
  "BALAJI M",
  "VALLI K",
  "SIVANANTHAN",
  "BRINDHA SIVANANTHAN",
  "SAKTHIVEL SIR",
  "GAYATHRI NATARAJAN",
  "RAJESWARI C",
  "ARUL PRAKASH",
  "PRASANNA",
  "MUNEESWARI",
  "R CHELLAMUTHU",
  "S  PALANIAPPAN",
  "DEVIKA P",
  "M SIVA",
  "VADIVEL",
  "A THANGAM",
  "MANIKANDAN G",
  "MENAKA",
  "RAMAMOORTHY",
  "T PANCHAPAKESAN",
  "SANTHIYA",
  "SATHISH",
  "M SENDHIL RAMANUJAR",
  "VANITHA M",
  "KARTHIK K",
  "VIGNESH MURUGESAN",
];

let initRunPromise: Promise<void> | null = null;
const SUPPORT_CONTACT_NUMBER_SQL = SUPPORT_CONTACT_NUMBER.replace(/'/g, "''");

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
        emergency_contact_number TEXT,
        aadhaar_number TEXT,
        gender TEXT,
        dob TEXT,
        age INT,
        seat_preference TEXT,
        room_preference TEXT,
        requires_accessibility_support BOOLEAN DEFAULT FALSE,
        accessibility_note TEXT,
        reference_name TEXT,
        payment_mode TEXT,
        payment_type TEXT,
        transaction_id_utr TEXT,
        payment_pending_status TEXT,
        payment_amount NUMERIC(10,2),
        payment_proof_url TEXT
      )
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE passengers
      ADD COLUMN IF NOT EXISTS dob TEXT
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE passengers
      ADD COLUMN IF NOT EXISTS payment_mode TEXT
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE passengers
      ADD COLUMN IF NOT EXISTS emergency_contact_number TEXT
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE passengers
      ADD COLUMN IF NOT EXISTS room_preference TEXT
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE passengers
      ADD COLUMN IF NOT EXISTS payment_type TEXT
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE passengers
      ADD COLUMN IF NOT EXISTS requires_accessibility_support BOOLEAN DEFAULT FALSE
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE passengers
      ADD COLUMN IF NOT EXISTS accessibility_note TEXT
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE passengers
      ADD COLUMN IF NOT EXISTS transaction_id_utr TEXT
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE passengers
      ADD COLUMN IF NOT EXISTS payment_pending_status TEXT
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE passengers
      ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2)
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
        dob TEXT,
        age INT,
        gender TEXT,
        relationship TEXT,
        aadhaar_number TEXT,
        seat_preference TEXT,
        requires_accessibility_support BOOLEAN DEFAULT FALSE,
        accessibility_note TEXT
      )
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE group_members
      ADD COLUMN IF NOT EXISTS dob TEXT
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE group_members
      ADD COLUMN IF NOT EXISTS aadhaar_number TEXT
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE group_members
      ADD COLUMN IF NOT EXISTS relationship TEXT
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE group_members
      ADD COLUMN IF NOT EXISTS requires_accessibility_support BOOLEAN DEFAULT FALSE
      `,
      );

      await queryWithClient(
        client,
        `
      ALTER TABLE group_members
      ADD COLUMN IF NOT EXISTS accessibility_note TEXT
      `,
      );

      await queryWithClient(
        client,
        `
      CREATE OR REPLACE FUNCTION normalize_aadhaar_number(input_value TEXT)
      RETURNS TEXT
      AS $$
        SELECT NULLIF(REGEXP_REPLACE(COALESCE(input_value, ''), '\\D', '', 'g'), '')
      $$ LANGUAGE SQL IMMUTABLE
      `,
      );

      await queryWithClient(
        client,
        `
      UPDATE passengers
      SET aadhaar_number = normalize_aadhaar_number(aadhaar_number)
      WHERE aadhaar_number IS NOT NULL
      `,
      );

      await queryWithClient(
        client,
        `
      UPDATE group_members
      SET aadhaar_number = normalize_aadhaar_number(aadhaar_number)
      WHERE aadhaar_number IS NOT NULL
      `,
      );

      await queryWithClient(
        client,
        `
      CREATE OR REPLACE FUNCTION enforce_unique_booking_aadhaar()
      RETURNS TRIGGER
      AS $$
      DECLARE
        normalized_aadhaar TEXT;
      BEGIN
        normalized_aadhaar := normalize_aadhaar_number(NEW.aadhaar_number);

        IF normalized_aadhaar IS NULL THEN
          NEW.aadhaar_number := NULL;
          RETURN NEW;
        END IF;

        IF LENGTH(normalized_aadhaar) <> 12 THEN
          RAISE EXCEPTION 'Aadhaar number must be 12 digits.';
        END IF;

        NEW.aadhaar_number := normalized_aadhaar;

        IF TG_TABLE_NAME = 'passengers' THEN
          IF EXISTS (
            SELECT 1
            FROM passengers p
            WHERE p.aadhaar_number = normalized_aadhaar
              AND p.id <> COALESCE(NEW.id, -1)
          ) OR EXISTS (
            SELECT 1
            FROM group_members gm
            WHERE gm.aadhaar_number = normalized_aadhaar
          ) THEN
            RAISE EXCEPTION 'A record with Aadhaar number % already exists. Duplicate registration is not allowed. For any queries contact ${SUPPORT_CONTACT_NUMBER_SQL}.', normalized_aadhaar
              USING ERRCODE = '23505';
          END IF;
        ELSE
          IF EXISTS (
            SELECT 1
            FROM group_members gm
            WHERE gm.aadhaar_number = normalized_aadhaar
              AND gm.id <> COALESCE(NEW.id, -1)
          ) OR EXISTS (
            SELECT 1
            FROM passengers p
            WHERE p.aadhaar_number = normalized_aadhaar
          ) THEN
            RAISE EXCEPTION 'A record with Aadhaar number % already exists. Duplicate registration is not allowed. For any queries contact ${SUPPORT_CONTACT_NUMBER_SQL}.', normalized_aadhaar
              USING ERRCODE = '23505';
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
      `,
      );

      await queryWithClient(
        client,
        `
      DROP TRIGGER IF EXISTS passengers_unique_aadhaar_trigger ON passengers
      `,
      );

      await queryWithClient(
        client,
        `
      CREATE TRIGGER passengers_unique_aadhaar_trigger
      BEFORE INSERT OR UPDATE OF aadhaar_number ON passengers
      FOR EACH ROW
      EXECUTE FUNCTION enforce_unique_booking_aadhaar()
      `,
      );

      await queryWithClient(
        client,
        `
      DROP TRIGGER IF EXISTS group_members_unique_aadhaar_trigger ON group_members
      `,
      );

      await queryWithClient(
        client,
        `
      CREATE TRIGGER group_members_unique_aadhaar_trigger
      BEFORE INSERT OR UPDATE OF aadhaar_number ON group_members
      FOR EACH ROW
      EXECUTE FUNCTION enforce_unique_booking_aadhaar()
      `,
      );

      await queryWithClient(
        client,
        `
      CREATE INDEX IF NOT EXISTS passengers_aadhaar_lookup_idx
      ON passengers (aadhaar_number)
      `,
      );

      await queryWithClient(
        client,
        `
      CREATE INDEX IF NOT EXISTS group_members_aadhaar_lookup_idx
      ON group_members (aadhaar_number)
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

      console.log("Syncing reference members...");

      const uniqueReferenceMembers = Array.from(
        new Set(
          REFERENCE_MEMBERS.map((memberName) => memberName.trim()).filter(
            (memberName) => memberName.length > 0,
          ),
        ),
      );

      await queryWithClient(
        client,
        `
      DELETE FROM reference_members rm
      WHERE NOT EXISTS (
        SELECT 1
        FROM UNNEST($1::TEXT[]) AS seeded(name)
        WHERE seeded.name = TRIM(rm.name)
      )
      `,
        [uniqueReferenceMembers],
      );

      await queryWithClient(
        client,
        `
      INSERT INTO reference_members (name)
      SELECT seeded.name
      FROM UNNEST($1::TEXT[]) AS seeded(name)
      WHERE NOT EXISTS (
        SELECT 1
        FROM reference_members rm
        WHERE TRIM(rm.name) = seeded.name
      )
      `,
        [uniqueReferenceMembers],
      );

      console.log(`  ✓ Synced ${uniqueReferenceMembers.length} reference members`);

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

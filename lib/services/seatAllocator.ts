import { PoolClient } from "pg";
import { queryWithClient } from "../db";
import { TRAIN_CONFIG } from "../constants";

interface Seat {
  id: number;
  seat_number: number;
  berth_type: string;
  coach_id: number;
  is_booked: boolean;
  is_reserved: boolean;
}

interface Passenger {
  id: number;
  name: string;
  reference_name: string | null;
  age: number;
  gender: string;
  seat_preference: string | null;
}

interface GroupMember {
  id: number;
  name: string;
  age: number;
  gender: string;
  seat_preference: string | null;
  passenger_id: number;
}

interface PassengerWithSeatPref {
  id: number | string;
  name: string;
  age: number;
  gender: string;
  preference: string | null;
  isMainPassenger: boolean;
}

interface AllocationResult {
  seats: Seat[];
  needsReview: boolean;
  reviewReason: string | null;
}

export async function allocateSeats(
  client: PoolClient,
  passenger: Passenger,
  groupMembers: GroupMember[],
): Promise<AllocationResult> {
  try {
    console.log("========== SEAT ALLOCATION ENGINE START ==========");
    console.log(`Main passenger: ${passenger.name}, Age: ${passenger.age}, Reference: ${passenger.reference_name}`);
    console.log(`Group members: ${groupMembers.length}`);

    const totalPassengers = 1 + groupMembers.length;

    // Rule 1: Validate group size
    if (totalPassengers > TRAIN_CONFIG.MAX_GROUP_SIZE) {
      throw new Error(
        `Group size (${totalPassengers}) exceeds maximum allowed (${TRAIN_CONFIG.MAX_GROUP_SIZE})`
      );
    }

    // Combine passenger data for preference checking
    const passengers: PassengerWithSeatPref[] = [
      {
        id: passenger.id,
        name: passenger.name,
        age: passenger.age,
        gender: passenger.gender,
        preference: normalizePreference(passenger.seat_preference),
        isMainPassenger: true,
      },
      ...groupMembers.map((m) => ({
        id: m.id,
        name: m.name,
        age: m.age,
        gender: m.gender,
        preference: normalizePreference(m.seat_preference),
        isMainPassenger: false,
      })),
    ];

    console.log("Passengers with preferences:", passengers);

    let needsReview = false;
    let reviewReason: string | null = null;

    // Rule 2: Find reference coach (same group)
    const referenceCoachId = await findReferenceCoachForGroup(
      client,
      passenger.reference_name
    );
    console.log(`Reference coach for group: ${referenceCoachId}`);

    // Rule 3: Try to allocate in reference coach first
    let allocatedSeats = await tryAllocateInCoach(
      client,
      referenceCoachId,
      totalPassengers,
      passengers
    );

    if (
      allocatedSeats &&
      allocatedSeats.length === totalPassengers &&
      areSeatsContiguous(allocatedSeats)
    ) {
      console.log(
        `✓ Successfully allocated contiguous seats in reference coach ${referenceCoachId}`
      );
      return {
        seats: allocatedSeats,
        needsReview,
        reviewReason,
      };
    }

    // Rule 4: If reference coach doesn't have contiguous block, check other coaches
    if (
      allocatedSeats &&
      allocatedSeats.length < totalPassengers
    ) {
      console.log(
        `⚠ Reference coach insufficient (found ${allocatedSeats.length}/${totalPassengers} seats)`
      );
      needsReview = true;
      reviewReason = "Reference group overflow - insufficient seats in preferred coach";

      // Try next coaches sequentially
      for (
        let coachNum = 1;
        coachNum <= TRAIN_CONFIG.TOTAL_COACHES;
        coachNum++
      ) {
        if (coachNum === referenceCoachId) continue;

        const nextSeats = await tryAllocateInCoach(client, coachNum, totalPassengers, passengers);
        if (
          nextSeats &&
          nextSeats.length === totalPassengers &&
          areSeatsContiguous(nextSeats)
        ) {
          console.log(
            `✓ Found contiguous block in coach ${coachNum}`
          );
          needsReview = true;
          reviewReason = "Group allocated to different coach than reference group";
          return {
            seats: nextSeats,
            needsReview,
            reviewReason,
          };
        }
      }
    }

    // Rule 5: No contiguous block available - use scattered allocation with review flag
    console.log("⚠ No contiguous blocks available - using scattered allocation");
    needsReview = true;
    if (!reviewReason) {
      reviewReason = "Group seating not available - seats allocated separately";
    }

    const scatteredSeats = await findScatteredSeats(
      client,
      totalPassengers,
      passengers
    );

    if (scatteredSeats.length === totalPassengers) {
      console.log(
        `✓ Found ${scatteredSeats.length} scattered seats with preferences honored where possible`
      );

      // Check for gender conflicts
      if (hasGenderConflict(scatteredSeats, passengers)) {
        console.log("⚠ Gender conflict detected in allocation");
        reviewReason +=
          " - Gender safety review needed";
      }

      return {
        seats: scatteredSeats,
        needsReview,
        reviewReason,
      };
    }

    throw new Error(
      `Could not allocate ${totalPassengers} seats - insufficient seats available`
    );
  } catch (error) {
    console.error("❌ Seat allocation error:", error);
    throw error;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalize seat preference from UI format to DB format
 * UI: "LB", "MB", "UB", "SL", "SU", "No Preference"
 * DB: "lower", "middle", "upper", "side_lower", "side_upper"
 */
function normalizePreference(preference: string | null): string | null {
  if (!preference || preference === "No Preference") return null;

  const mapping: Record<string, string> = {
    LB: "lower",
    MB: "middle",
    UB: "upper",
    SL: "side_lower",
    SU: "side_upper",
  };

  return mapping[preference] || null;
}

/**
 * Find reference coach for a booking group by reference_name
 * If no reference group exists yet, return coach 1 as default
 */
async function findReferenceCoachForGroup(
  client: PoolClient,
  referenceName: string | null
): Promise<number> {
  if (!referenceName) {
    console.log("No reference name provided, starting from coach 1");
    return 1;
  }

  const result = await queryWithClient(
    client,
    `
    SELECT DISTINCT b.coach_id
    FROM bookings b
    JOIN passengers p ON b.passenger_id = p.id
    WHERE p.reference_name = $1 AND b.booking_status != 'cancelled'
    LIMIT 1
    `,
    [referenceName]
  );

  if (result.rows.length > 0) {
    const coachId = result.rows[0].coach_id;
    console.log(`Found reference group in coach ${coachId}`);
    return coachId;
  }

  console.log(`No existing reference group found, starting from coach 1`);
  return 1;
}

/**
 * Try to allocate seats in a specific coach
 * Returns available seats respecting preferences
 */
async function tryAllocateInCoach(
  client: PoolClient,
  coachId: number,
  groupSize: number,
  passengers: PassengerWithSeatPref[]
): Promise<Seat[]> {
  // Get all available seats in this coach (excluding reserved and booked)
  const availableSeats = await queryWithClient(
    client,
    `
    SELECT *
    FROM seats
    WHERE coach_id = $1
    AND is_booked = false
    AND is_reserved = false
    ORDER BY seat_number ASC
    FOR UPDATE SKIP LOCKED
    `,
    [coachId]
  );

  const seats = availableSeats.rows;
  console.log(
    `Coach ${coachId}: ${seats.length} available seats for group of ${groupSize}`
  );

  if (seats.length < groupSize) {
    return [];
  }

  // Try to find contiguous block first (priority)
  const contiguousBlock = findContiguousBlock(seats, groupSize);
  if (contiguousBlock && contiguousBlock.length === groupSize) {
    console.log(
      `✓ Found contiguous block in coach ${coachId}: seats ${contiguousBlock.map((s) => s.seat_number).join(",")}`
    );
    return contiguousBlock;
  }

  // Try compartment allocation
  const compartmentBlock = findCompartmentSeatsWithGroup(seats, groupSize);
  if (compartmentBlock && compartmentBlock.length === groupSize) {
    console.log(
      `✓ Found compartment block in coach ${coachId}: seats ${compartmentBlock.map((s) => s.seat_number).join(",")}`
    );
    return compartmentBlock;
  }

  // Return partial allocation (will trigger needs_review)
  return seats.slice(0, Math.min(groupSize, seats.length));
}

/**
 * Find largest contiguous block of seats
 */
function findContiguousBlock(seats: Seat[], minSize: number): Seat[] | null {
  if (seats.length < minSize) return null;

  for (let i = 0; i <= seats.length - minSize; i++) {
    const block: Seat[] = [seats[i]];

    for (let j = 1; j < minSize; j++) {
      if (
        seats[i + j].seat_number === seats[i + j - 1].seat_number + 1
      ) {
        block.push(seats[i + j]);
      } else {
        break;
      }
    }

    if (block.length === minSize) {
      return block;
    }
  }

  return null;
}

/**
 * Find seats in same compartment (8 seats per compartment)
 */
function findCompartmentSeatsWithGroup(
  availableSeats: Seat[],
  groupSize: number
): Seat[] | null {
  // Organize by compartment
  const compartments: Record<number, Seat[]> = {};

  for (const seat of availableSeats) {
    const compartment = Math.floor((seat.seat_number - 1) / 8);
    if (!compartments[compartment]) {
      compartments[compartment] = [];
    }
    compartments[compartment].push(seat);
  }

  // Find compartment with enough non-reserved seats
  for (const compNum in compartments) {
    const compSeats = compartments[compNum];
    // Exclude side seats (typically at end of compartment)
    const mainSeats = compSeats.filter(
      (s) => s.berth_type !== "side_lower" && s.berth_type !== "side_upper"
    );

    if (mainSeats.length >= groupSize) {
      return mainSeats.slice(0, groupSize);
    }

    if (compSeats.length >= groupSize) {
      return compSeats.slice(0, groupSize);
    }
  }

  return null;
}

/**
 * Scatter allocation across multiple coaches if needed
 * Respects individual passenger preferences
 */
async function findScatteredSeats(
  client: PoolClient,
  groupSize: number,
  passengers: PassengerWithSeatPref[]
): Promise<Seat[]> {
  const allocatedSeats: Seat[] = [];

  // Try to allocate each passenger respecting their preferences
  for (const passenger of passengers) {
    let preferredSeat: Seat | null = null;

    // Try to find seat matching preference
    if (passenger.preference) {
      const prefResult = await queryWithClient(
        client,
        `
        SELECT *
        FROM seats
        WHERE is_booked = false
        AND is_reserved = false
        AND berth_type = $1
        AND id NOT IN (${allocatedSeats.map((s) => s.id).join(",") || "0"})
        ORDER BY coach_id ASC, seat_number ASC
        LIMIT 1
        `,
        [passenger.preference]
      );

      if (prefResult.rows.length > 0) {
        preferredSeat = prefResult.rows[0];
      }
    }

    // If no preference match, find any available seat
    if (!preferredSeat) {
      const anyResult = await queryWithClient(
        client,
        `
        SELECT *
        FROM seats
        WHERE is_booked = false
        AND is_reserved = false
        AND id NOT IN (${allocatedSeats.map((s) => s.id).join(",") || "0"})
        ORDER BY coach_id ASC, seat_number ASC
        LIMIT 1
        `,
        []
      );

      if (anyResult.rows.length > 0) {
        preferredSeat = anyResult.rows[0];
      }
    }

    if (preferredSeat) {
      allocatedSeats.push(preferredSeat);
      console.log(
        `Allocated seat ${preferredSeat.seat_number} (${preferredSeat.berth_type}) to ${passenger.name}`
      );
    }
  }

  return allocatedSeats;
}

/**
 * Check if seats are contiguous (sequential seat numbers)
 */
function areSeatsContiguous(seats: Seat[]): boolean {
  if (seats.length <= 1) return true;

  const sorted = [...seats].sort((a, b) => a.seat_number - b.seat_number);

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].seat_number !== sorted[i - 1].seat_number + 1) {
      return false;
    }
  }

  return true;
}

/**
 * Detect gender safety conflicts
 * Flag if unrelated male-female pairs are adjacent
 */
function hasGenderConflict(
  seats: Seat[],
  passengers: PassengerWithSeatPref[]
): boolean {
  // For simplicity, flag if mixed genders in group and seats scattered
  const genders = new Set(passengers.map((p) => p.gender));

  if (genders.size === 1) {
    return false; // All same gender
  }

  if (!areSeatsContiguous(seats)) {
    return true; // Mixed gender + scattered = potential conflict
  }

  return false;
}

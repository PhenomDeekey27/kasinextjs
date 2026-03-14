import { PoolClient } from "pg";
import { queryWithClient } from "../db";

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
  reference_name: string;
  age: number;
  seat_preference: string;
}

interface GroupMember {
  id: number;
  seat_preference: string;
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
    console.log("Starting seat allocation...");

    const totalPassengers = 1 + groupMembers.length;

    let needsReview = false;
    let reviewReason: string | null = null;

    if (totalPassengers > 8) {
      needsReview = true;
      reviewReason = "Group size greater than allowed limit (8)";
    }

    const coachId = await findReferenceCoach(client, passenger.id);
    const seats = await findAvailableSeats(client, coachId);

    if (seats.length < totalPassengers) {
      throw new Error("Not enough seats available");
    }

    let filteredSeats = seats;

    // Seat Preference Engine
    if (passenger.seat_preference) {
      const preferenceSeats = seats.filter(
        (seat) => seat.berth_type === passenger.seat_preference,
      );

      if (preferenceSeats.length >= totalPassengers) {
        console.log("Allocating based on seat preference");
        return {
          seats: preferenceSeats.slice(0, totalPassengers),
          needsReview,
          reviewReason,
        };
      }
    }

    // Senior citizen rule
    if (passenger.age >= 50 && passenger.seat_preference === "lower") {
      const lowerSeats = seats.filter((seat) => seat.berth_type === "lower");

      if (lowerSeats.length > 0) {
        filteredSeats = lowerSeats;
      }
    }

    // Compartment-aware allocation
    const compartmentSeats = findCompartmentSeats(
      filteredSeats,
      totalPassengers,
    );

    if (compartmentSeats) {
      return {
        seats: compartmentSeats,
        needsReview,
        reviewReason,
      };
    }

    // Contiguous fallback
    const groupedSeats = findContiguousSeats(filteredSeats, totalPassengers);

    if (groupedSeats) {
      return {
        seats: groupedSeats,
        needsReview,
        reviewReason,
      };
    }

    // Final fallback
    needsReview = true;

    if (!reviewReason) {
      reviewReason = "Group seats not available together";
    }

    const fallbackSeats = filteredSeats.slice(0, totalPassengers);

    return {
      seats: fallbackSeats,
      needsReview,
      reviewReason,
    };
  } catch (error) {
    console.error("Seat allocation error:", error);
    throw error;
  }
}

async function findReferenceCoach(
  client: PoolClient,
  passengerId: number,
): Promise<number> {
  const passengerResult = await queryWithClient(
    client,
    `
    SELECT reference_name
    FROM passengers
    WHERE id = $1
  `,
    [passengerId],
  );

  const referenceName = passengerResult.rows[0]?.reference_name;

  if (!referenceName) return 1;

  const coachResult = await queryWithClient(
    client,
    `
    SELECT coach_id
    FROM bookings b
    JOIN passengers p ON b.passenger_id = p.id
    WHERE p.reference_name = $1
    LIMIT 1
  `,
    [referenceName],
  );

  if (coachResult.rows.length > 0) {
    return coachResult.rows[0].coach_id;
  }

  return 1;
}

async function findAvailableSeats(
  client: PoolClient,
  coachId: number,
): Promise<Seat[]> {
  const result = await queryWithClient(
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
    [coachId],
  );

  return result.rows;
}

function findCompartmentSeats(seats: Seat[], groupSize: number): Seat[] | null {
  const compartments: Record<number, Seat[]> = {};

  for (const seat of seats) {
    const comp = Math.floor((seat.seat_number - 1) / 8);

    if (!compartments[comp]) {
      compartments[comp] = [];
    }

    compartments[comp].push(seat);
  }

  for (const comp in compartments) {
    const compSeats = compartments[comp].filter(
      (s) => s.seat_number % 8 !== 7 && s.seat_number % 8 !== 0,
    );

    if (compSeats.length >= groupSize) {
      return compSeats.slice(0, groupSize);
    }
  }

  return null;
}

function findContiguousSeats(seats: Seat[], groupSize: number): Seat[] | null {
  for (let i = 0; i <= seats.length - groupSize; i++) {
    const block: Seat[] = [seats[i]];

    for (let j = 1; j < groupSize; j++) {
      if (seats[i + j].seat_number === seats[i].seat_number + j) {
        block.push(seats[i + j]);
      } else {
        break;
      }
    }

    if (block.length === groupSize) {
      return block;
    }
  }

  return null;
}

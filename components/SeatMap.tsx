"use client";

import { useState, useEffect } from "react";
import { TRAIN_CONFIG, getBerthType, SEAT_COLORS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface Coach {
  id: number;
  coach_number: string;
}

interface SeatData {
  id: number;
  seat_number: number;
  berth_type: string;
  is_reserved: boolean;
  is_booked: boolean;
  passenger_id: number | null;
  group_member_id: number | null;
  passenger_name: string | null;
}

export function SeatMap() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<number | null>(null);
  const [selectedCoachNumber, setSelectedCoachNumber] = useState<string>("");
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all coaches on mount
  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/coaches/list");
        if (!response.ok) throw new Error("Failed to fetch coaches");
        const data = await response.json();
        setCoaches(data.coaches);

        // Set first coach as default
        if (data.coaches.length > 0) {
          setSelectedCoachId(data.coaches[0].id);
          setSelectedCoachNumber(data.coaches[0].coach_number);
        }
      } catch (err) {
        console.error("Error fetching coaches:", err);
        setError("Failed to load coaches");
      } finally {
        setLoading(false);
      }
    };

    fetchCoaches();
  }, []);

  // Fetch seat data when selected coach changes
  useEffect(() => {
    if (!selectedCoachId) return;

    const fetchSeats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/seat-map/${selectedCoachId}`);
        if (!response.ok) throw new Error("Failed to fetch seats");
        const data = await response.json();
        setSeats(data.seats);
      } catch (err) {
        console.error("Error fetching seats:", err);
        setError("Failed to load seat data");
        setSeats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSeats();
  }, [selectedCoachId]);

  // Create a map of seat_number to seat data for quick lookup
  const seatMap = new Map(seats.map((s) => [s.seat_number, s]));

  const getSeatStatus = (seatNumber: number) => {
    const seatData = seatMap.get(seatNumber);

    if (!seatData) return "RESERVED"; // Default unknown seats as reserved
    if (seatData.is_reserved) return "RESERVED";
    if (seatData.is_booked) return "BOOKED";
    return "AVAILABLE";
  };

  const getSeatColor = (status: string) => {
    switch (status) {
      case "RESERVED":
        return "bg-slate-300 border-slate-400 text-slate-500 cursor-not-allowed";
      case "BOOKED":
        return "bg-rose-100 border-rose-300 text-rose-700 cursor-not-allowed";
      case "AVAILABLE":
      default:
        return "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-200 cursor-pointer";
    }
  };

  // Generate 72 seats in chunks of 8 (one compartment in AC 3 Tier usually has 8 seats: 6 main, 2 side)
  const compartments = Array.from(
    { length: Math.ceil(TRAIN_CONFIG.SEATS_PER_COACH / 8) },
    (_, i) => {
      const start = i * 8 + 1;
      return Array.from({ length: 8 }, (_, j) => start + j).filter(
        (seatNum) => seatNum <= TRAIN_CONFIG.SEATS_PER_COACH,
      );
    },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center space-x-4">
          <label className="font-semibold text-slate-700">Select Coach:</label>
          {loading && coaches.length === 0 ? (
            <div className="text-sm text-slate-500">Loading coaches...</div>
          ) : (
            <Select
              value={selectedCoachId?.toString() || ""}
              onValueChange={(val) => {
                const coach = coaches.find((c) => c.id === parseInt(val));
                if (coach) {
                  setSelectedCoachId(coach.id);
                  setSelectedCoachNumber(coach.coach_number);
                }
              }}
            >
              <SelectTrigger className="w-[160px] font-bold">
                <SelectValue placeholder="Select Coach" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id.toString()}>
                    Coach {coach.coach_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center space-x-4 text-sm font-medium">
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 rounded bg-rose-100 border border-rose-300"></div>
            <span>Booked</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 rounded bg-slate-300 border border-slate-400"></div>
            <span>Reserved</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <div className="bg-slate-100 p-6 rounded-2xl border-4 border-slate-300 relative overflow-x-auto min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-slate-500 font-medium">
              Loading seat map for Coach {selectedCoachNumber}...
            </p>
          </div>
        ) : (
          <div className="flex space-x-8 pb-4 min-w-max">
            {compartments.map((comp, idx) => (
              <div
                key={idx}
                className="flex flex-col border-r-2 border-slate-300 pr-8 last:border-0 relative"
              >
                <div className="text-xs font-bold text-slate-400 absolute -top-4 left-0">
                  Comp {idx + 1}
                </div>

                <div className="flex space-x-12 mt-4">
                  {/* Main 6 Seats (3x2) */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    {comp.slice(0, 6).map((seatNum) => {
                      const status = getSeatStatus(seatNum);
                      const berth = getBerthType(seatNum);
                      const seatData = seatMap.get(seatNum);
                      return (
                        <div
                          key={seatNum}
                          className={`w-12 h-16 rounded-md border-2 flex flex-col items-center justify-center transition-colors shadow-sm ${getSeatColor(status)}`}
                          title={`Seat ${seatNum} - ${berth} (${status})${seatData?.passenger_name ? ` - ${seatData.passenger_name}` : ""}`}
                        >
                          <span className="font-bold text-lg">{seatNum}</span>
                          <span className="text-[10px] opacity-80 font-semibold">
                            {berth}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Side 2 Seats (1x2) */}
                  <div className="grid grid-cols-1 gap-y-[4rem]">
                    {comp.slice(6, 8).map((seatNum) => {
                      const status = getSeatStatus(seatNum);
                      const berth = getBerthType(seatNum);
                      const seatData = seatMap.get(seatNum);
                      return (
                        <div
                          key={seatNum}
                          className={`w-16 h-12 rounded-md border-2 flex flex-col items-center justify-center transition-colors shadow-sm ${getSeatColor(status)}`}
                          title={`Seat ${seatNum} - ${berth} (${status})${seatData?.passenger_name ? ` - ${seatData.passenger_name}` : ""}`}
                        >
                          <span className="font-bold text-lg">{seatNum}</span>
                          <span className="text-[10px] opacity-80 font-semibold">
                            {berth}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Aisle Text */}
                <div
                  className="absolute inset-y-0 right-[2.25rem] w-8 flex items-center justify-center text-slate-300 tracking-[0.3em] font-bold text-xs"
                  style={{ writingMode: "vertical-rl" }}
                >
                  AISLE
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

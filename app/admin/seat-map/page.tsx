"use client";

import { SeatMap } from "@/components/SeatMap";

export default function SeatMapPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Seat Map Visualizer</h1>
          <p className="mt-1 text-slate-500">
            View reserved, booked and available seats per coach.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm overflow-hidden">
        <SeatMap />
      </div>
    </div>
  );
}

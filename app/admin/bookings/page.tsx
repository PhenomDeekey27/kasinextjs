"use client";

import { useEffect, useState } from "react";
import { AdminTable, BookingData } from "@/components/AdminTable";
import { fetchBookings } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function BookingsPage() {
  const [data, setData] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const bookings = await fetchBookings();
        setData(bookings as BookingData[]);
      } catch (error) {
        console.error("Failed to load bookings", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">All Bookings</h1>
          <p className="mt-1 text-slate-500">
            Manage passenger seat requests and verify payments.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-3 font-medium">Loading bookings...</span>
        </div>
      ) : (
        <AdminTable data={data} />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Train, Ticket, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { TRAIN_CONFIG } from "@/lib/constants";

interface StatsData {
  totalSeats: number;
  bookedSeats: number;
  pendingVerification: number;
  needsReview: number;
}

export function StatsCards() {
  const [stats, setStats] = useState<StatsData>({
    totalSeats: TRAIN_CONFIG.TOTAL_SEATS,
    bookedSeats: 0,
    pendingVerification: 0,
    needsReview: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/dashboard-stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, []);

  const statsConfig = [
    {
      title: "Total Seats",
      value: stats.totalSeats.toString(),
      icon: Train,
      description: "Across " + TRAIN_CONFIG.TOTAL_COACHES + " coaches",
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Booked Seats",
      value: loading ? "..." : stats.bookedSeats.toString(),
      icon: Ticket,
      description: "Confirmed and paid",
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      title: "Pending Verification",
      value: loading ? "..." : stats.pendingVerification.toString(),
      icon: AlertCircle,
      description: "Awaiting payment check",
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      title: "Needs Review",
      value: loading ? "..." : stats.needsReview.toString(),
      icon: CheckCircle,
      description: "Suspicious or conflicts",
      color: "text-rose-600",
      bg: "bg-rose-100",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {statsConfig.map((stat, i) => (
        <Card
          key={i}
          className="border-0 shadow-md hover:shadow-lg transition-shadow"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold text-slate-800 transition-opacity ${loading && i > 0 ? "opacity-50" : ""}`}
            >
              {stat.value}
            </div>
            <p className="text-xs text-slate-400 mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

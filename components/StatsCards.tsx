import { Train, Ticket, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { TRAIN_CONFIG } from "@/lib/constants";

export function StatsCards() {
  const stats = [
    {
      title: "Total Seats",
      value: TRAIN_CONFIG.TOTAL_SEATS.toString(),
      icon: Train,
      description: "Across " + TRAIN_CONFIG.TOTAL_COACHES + " coaches",
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Booked Seats",
      value: "450", // Mock
      icon: Ticket,
      description: "Confirmed and paid",
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      title: "Pending Verification",
      value: "12", // Mock
      icon: AlertCircle,
      description: "Awaiting payment check",
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      title: "Needs Review",
      value: "3", // Mock
      icon: CheckCircle,
      description: "Suspicious or conflicts",
      color: "text-rose-600",
      bg: "bg-rose-100",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <Card key={i} className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{stat.value}</div>
            <p className="text-xs text-slate-400 mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

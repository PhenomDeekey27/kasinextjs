import { StatsCards } from "@/components/StatsCards";

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
        <p className="mt-2 text-slate-500">
          Monitor your tourism train availability and bookings at a glance.
        </p>
      </div>

      <StatsCards />

      {/* Placeholder for Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Bookings</h2>
          <div className="text-sm text-slate-500 italic">No recent bookings to display. Head over to bookings page for complete list.</div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Pending Verifications</h2>
          <div className="text-sm text-slate-500 italic">No pending verifications to display.</div>
        </div>
      </div>
    </div>
  );
}

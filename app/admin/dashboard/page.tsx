import { StatsCards } from "@/components/StatsCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href="/admin/bookings" className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors group">
              <span className="text-slate-700 group-hover:text-blue-700 font-medium">View All Bookings</span>
              <span className="text-slate-400 group-hover:text-blue-600">→</span>
            </a>
            <a href="/admin/review" className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-amber-50 transition-colors group">
              <span className="text-slate-700 group-hover:text-amber-700 font-medium">Review Flagged Bookings</span>
              <span className="text-slate-400 group-hover:text-amber-600">→</span>
            </a>
            <a href="/admin/seat-map" className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-purple-50 transition-colors group">
              <span className="text-slate-700 group-hover:text-purple-700 font-medium">View Seat Map</span>
              <span className="text-slate-400 group-hover:text-purple-600">→</span>
            </a>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <span className="text-slate-700 font-medium">Database Connection</span>
              <span className="inline-flex items-center space-x-1">
                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-sm text-green-700 font-medium">Connected</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <span className="text-slate-700 font-medium">Payment Gateway</span>
              <span className="inline-flex items-center space-x-1">
                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-sm text-green-700 font-medium">Active</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <span className="text-slate-700 font-medium">API Status</span>
              <span className="inline-flex items-center space-x-1">
                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-sm text-green-700 font-medium">Operational</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

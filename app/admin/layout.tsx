import Link from "next/link";
import { Train, LayoutDashboard, Users, Grid, AlertTriangle } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 md:min-h-screen flex-shrink-0">
        <div className="p-6 flex items-center space-x-3 text-white">
          <Train className="w-8 h-8 text-blue-500" />
          <span className="text-xl font-bold tracking-tight">Admin OS</span>
        </div>
        <nav className="px-4 py-4 space-y-1">
          <Link href="/admin/dashboard" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <LayoutDashboard className="w-5 h-5 text-slate-400" />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link href="/admin/bookings" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <Users className="w-5 h-5 text-slate-400" />
            <span className="font-medium">Bookings</span>
          </Link>
          <Link href="/admin/seat-map" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <Grid className="w-5 h-5 text-slate-400" />
            <span className="font-medium">Seat Map</span>
          </Link>
          <Link href="/admin/review" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span className="font-medium">Needs Review</span>
          </Link>
        </nav>
      </aside>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden p-6 md:p-8 lg:p-10">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

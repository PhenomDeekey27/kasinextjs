"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Grid,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current user
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setAdminUser(data.user);
        } else {
          // Not authenticated, redirect to login
          router.push("/admin/login");
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
        variant: "default",
      });
      router.push("/admin/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/bookings", icon: Users, label: "Bookings" },
    { href: "/admin/seat-map", icon: Grid, label: "Seat Map" },
    { href: "/admin/review", icon: AlertTriangle, label: "Needs Review" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (pathname === "/admin/login") {
    return children;
  }
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden absolute top-4 left-4 p-2 rounded-lg bg-slate-900 text-white z-50"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:relative w-64 bg-slate-900 text-slate-300 md:min-h-screen flex-shrink-0 transition-transform duration-300 z-40 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 flex items-center space-x-3 text-white">
          <Image
            src="/logo.jpeg"
            alt="J Tourism logo"
            width={32}
            height={32}
            className="w-8 h-8 rounded-md object-cover bg-white"
          />
          <span className="text-xl font-bold tracking-tight">Admin OS</span>
        </div>

        {/* User Profile Section */}
        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center space-x-3 px-3 py-3 rounded-lg bg-slate-800">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {adminUser?.email?.split("@")[0]}
              </p>
              <p className="text-xs text-slate-400">Admin</p>
            </div>
          </div>
        </div>

        <nav className="px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "hover:bg-slate-800 hover:text-white text-slate-300"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-800">
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full flex items-center justify-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden p-6 md:p-8 lg:p-10 mt-16 md:mt-0">
        <div className="max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}

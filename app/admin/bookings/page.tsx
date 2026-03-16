"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Search,
  Filter,
  ChevronRight,
  User,
  Phone,
  CreditCard,
  Calendar,
  MapPin,
  AlertTriangle,
  Image as ImageIcon,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Booking {
  booking_id: number;
  passenger_id: number;
  main_passenger_name: string;
  aadhaar_number: string | null;
  group_member_names: string[];
  group_member_aadhaar_numbers: string[];
  phone: string;
  reference_name: string | null;
  seat_numbers: number[];
  seat_assignments: Array<{
    passenger_name: string;
    aadhaar_number: string | null;
    seat_number: number;
    berth_type: string | null;
    coach_number: string | null;
  }>;
  coach_number: string;
  booking_status: string;
  needs_review: boolean;
  review_reason: string | null;
  booked_at: string;
  total_passengers: number;
}

interface BookingDetail extends Booking {
  aadhaar_number: string | null;
  gender: string | null;
  age: number | null;
  seat_preference: string | null;
  payment_proof_url: string | null;
  seat_assignments: Array<{
    booking_id: number;
    passenger_name: string;
    aadhaar_number: string | null;
    seat_number: number;
    berth_type: string | null;
    coach_number: string | null;
    age: number | null;
    gender: string | null;
  }>;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending_verification: "Pending Verification",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

export default function BookingsPage() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bookingDetail, setBookingDetail] = useState<BookingDetail | null>(
    null,
  );
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Filter states
  const [filters, setFilters] = useState<{
    status: string;
    needsReview: string;
    startDate: string;
    endDate: string;
  }>({
    status: "",
    needsReview: "",
    startDate: "",
    endDate: "",
  });

  // Sort states
  const [sortBy, setSortBy] = useState("booked_at");
  const [sortOrder, setSortOrder] = useState("DESC");

  // Search states
  const [searchTerm, setSearchTerm] = useState("");

  const fetchBookings = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", pagination.limit.toString());
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);

      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (filters.status) params.append("status", filters.status);
      if (filters.needsReview)
        params.append("needsReview", filters.needsReview);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const response = await fetch(`/api/admin/bookings?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings);
        setPagination(data.pagination);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch bookings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to load bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchBookings(1);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [filters, sortBy, sortOrder, searchTerm]);

  const handleFilterChange = (key: string, value: string | null) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || "",
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: "",
      needsReview: "",
      startDate: "",
      endDate: "",
    });
    setSortBy("booked_at");
    setSortOrder("DESC");
  };

  const openBookingDetail = async (passengerId: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setBookingDetail(null);
    try {
      const res = await fetch(`/api/admin/bookings/${passengerId}`);
      if (res.ok) {
        const data: BookingDetail = await res.json();
        setBookingDetail(data);
        setSelectedStatus(data.booking_status);
      } else {
        toast({
          title: "Error",
          description: "Failed to load booking details",
          variant: "destructive",
        });
        setDetailOpen(false);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load booking details",
        variant: "destructive",
      });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!bookingDetail || selectedStatus === bookingDetail.booking_status)
      return;
    setStatusUpdating(true);
    try {
      const res = await fetch(
        `/api/admin/bookings/${bookingDetail.passenger_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: selectedStatus }),
        },
      );
      if (res.ok) {
        // Update detail modal
        setBookingDetail((prev) =>
          prev ? { ...prev, booking_status: selectedStatus } : prev,
        );
        // Update the row in the table list
        setBookings((prev) =>
          prev.map((b) =>
            b.passenger_id === bookingDetail.passenger_id
              ? { ...b, booking_status: selectedStatus }
              : b,
          ),
        );
        toast({
          title: "Status updated",
          description: `Booking status changed to "${STATUS_LABELS[selectedStatus] ?? selectedStatus}"`,
        });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          title: "Error",
          description:
            (err as { error?: string }).error || "Failed to update status",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending_verification":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "cancelled":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          All Bookings
        </h1>
        <p className="mt-1 text-slate-500">
          Manage passenger seat requests and verify payments.
        </p>
      </div>

      {/* Search and Filter Bar */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by passenger, group member, phone, or Aadhaar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Status
                  </label>
                  <Select
                    value={filters.status || ""}
                    onValueChange={(value) =>
                      handleFilterChange("status", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="pending_verification">
                        Pending Verification
                      </SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Needs Review
                  </label>
                  <Select
                    value={filters.needsReview || ""}
                    onValueChange={(value) =>
                      handleFilterChange("needsReview", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      handleFilterChange("startDate", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      handleFilterChange("endDate", e.target.value)
                    }
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="md:col-span-2 lg:col-span-4"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bookings List</CardTitle>
            <div className="text-sm text-slate-500">
              Total: {pagination.total} bookings
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-3 font-medium">Loading bookings...</span>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center p-12">
              <p className="text-slate-500 font-medium">No bookings found</p>
              <p className="text-sm text-slate-400">
                Try adjusting your filters or search terms
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Passenger</TableHead>
                      <TableHead>Aadhaar</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Coordinator</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Coach</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow
                        key={booking.booking_id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => openBookingDetail(booking.passenger_id)}
                      >
                        <TableCell className="font-mono text-sm font-semibold text-blue-700">
                          #{booking.booking_id}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          <div>{booking.main_passenger_name}</div>
                          {booking.aadhaar_number && (
                            <p className="mt-1 font-mono text-xs text-slate-500">
                              {booking.aadhaar_number}
                            </p>
                          )}
                          {booking.group_member_names.length > 0 && (
                            <p className="mt-1 text-xs text-slate-500">
                              Group: {booking.group_member_names.join(", ")}
                            </p>
                          )}
                          {booking.total_passengers > 1 && (
                            <span className="ml-2 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                              +{booking.total_passengers - 1} more
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          <div className="space-y-1">
                            <p className="font-mono text-sm text-slate-700">
                              {booking.aadhaar_number || "-"}
                            </p>
                            {booking.group_member_aadhaar_numbers.length > 0 && (
                              <p className="font-mono text-[11px] text-slate-500">
                                Group: {booking.group_member_aadhaar_numbers.join(", ")}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">
                          {booking.phone}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {booking.reference_name || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {booking.seat_numbers.map((seat) => (
                              <Badge
                                key={seat}
                                variant="outline"
                                className="bg-slate-50"
                              >
                                {seat}
                              </Badge>
                            ))}
                          </div>
                          {booking.seat_assignments?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {booking.seat_assignments.map(
                                (assignment, index) => (
                                  <p
                                    key={`${assignment.passenger_name}-${assignment.seat_number}-${index}`}
                                    className="text-xs text-slate-500"
                                  >
                                    {assignment.passenger_name}: Seat{" "}
                                    {assignment.seat_number}
                                  </p>
                                ),
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-semibold text-blue-700">
                          {booking.coach_number}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`border ${getStatusColor(booking.booking_status)}`}
                          >
                            {booking.booking_status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              booking.needs_review ? "destructive" : "outline"
                            }
                          >
                            {booking.needs_review ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {new Date(booking.booked_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <div className="text-sm text-slate-600">
                  Page {pagination.page} of {pagination.pages} (
                  {pagination.total} total)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fetchBookings(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from(
                      { length: Math.min(5, pagination.pages) },
                      (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={
                              pagination.page === pageNum
                                ? "default"
                                : "outline"
                            }
                            onClick={() => fetchBookings(pageNum)}
                            disabled={loading}
                            size="sm"
                          >
                            {pageNum}
                          </Button>
                        );
                      },
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fetchBookings(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages || loading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Booking Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          showCloseButton
        >
          {detailLoading && (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mr-3" />
              <span className="font-medium">Loading details…</span>
            </div>
          )}

          {!detailLoading && bookingDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Booking #{bookingDetail.booking_id} —{" "}
                  {bookingDetail.main_passenger_name}
                </DialogTitle>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge
                    className={`border ${getStatusColor(bookingDetail.booking_status)}`}
                  >
                    {STATUS_LABELS[bookingDetail.booking_status] ??
                      bookingDetail.booking_status}
                  </Badge>
                  {bookingDetail.needs_review && (
                    <Badge
                      variant="destructive"
                      className="flex items-center gap-1"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Needs Review
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              {/* Status Update */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700">
                  Update Booking Status
                </p>
                <div className="flex gap-3 items-center">
                  <Select
                    value={selectedStatus}
                    onValueChange={(value) => setSelectedStatus(value ?? "")}
                  >
                    <SelectTrigger className="flex-1 bg-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending_verification">
                        Pending Verification
                      </SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={
                      statusUpdating ||
                      selectedStatus === bookingDetail.booking_status
                    }
                    className="flex items-center gap-2 shrink-0"
                  >
                    {statusUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save
                  </Button>
                </div>
                {selectedStatus !== bookingDetail.booking_status && (
                  <p className="text-xs text-amber-600">
                    Changing from{" "}
                    <strong>
                      {STATUS_LABELS[bookingDetail.booking_status]}
                    </strong>{" "}
                    to <strong>{STATUS_LABELS[selectedStatus]}</strong>. This
                    will update all related records and seat availability.
                  </p>
                )}
              </div>

              {/* Passenger Info */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-700 border-b pb-1">
                  Passenger Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Full Name</p>
                      <p className="font-medium text-slate-800">
                        {bookingDetail.main_passenger_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="font-medium text-slate-800 font-mono">
                        {bookingDetail.phone}
                      </p>
                    </div>
                  </div>
                  {bookingDetail.aadhaar_number && (
                    <div className="flex items-start gap-2">
                      <CreditCard className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">Aadhaar</p>
                        <p className="font-medium text-slate-800 font-mono">
                          {bookingDetail.aadhaar_number}
                        </p>
                      </div>
                    </div>
                  )}
                  {(bookingDetail.gender || bookingDetail.age != null) && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">Gender / Age</p>
                        <p className="font-medium text-slate-800">
                          {[
                            bookingDetail.gender,
                            bookingDetail.age != null
                              ? `${bookingDetail.age} yrs`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                  )}
                  {bookingDetail.reference_name && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">Coordinator</p>
                        <p className="font-medium text-slate-800">
                          {bookingDetail.reference_name}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Coach</p>
                      <p className="font-medium text-slate-800 font-mono">
                        {bookingDetail.coach_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Booked At</p>
                      <p className="font-medium text-slate-800">
                        {new Date(bookingDetail.booked_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seat Assignments */}
              {bookingDetail.seat_assignments.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-700 border-b pb-1">
                    Seat Assignments ({bookingDetail.total_passengers} passenger
                    {bookingDetail.total_passengers !== 1 ? "s" : ""})
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">
                            Passenger
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Seat
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Aadhaar
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Berth
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Age
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Gender
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bookingDetail.seat_assignments.map((a, i) => (
                          <tr key={i} className="bg-white">
                            <td className="px-3 py-2 font-medium text-slate-800">
                              {a.passenger_name}
                            </td>
                            <td className="px-3 py-2 font-mono text-blue-700 font-semibold">
                              {a.seat_number}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-600">
                              {a.aadhaar_number ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-slate-600 capitalize">
                              {a.berth_type ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {a.age != null ? `${a.age} yrs` : "—"}
                            </td>
                            <td className="px-3 py-2 text-slate-600 capitalize">
                              {a.gender ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Review Info */}
              {bookingDetail.needs_review && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      Flagged for Review
                    </p>
                    {bookingDetail.review_reason && (
                      <p className="mt-1 text-sm text-amber-700">
                        {bookingDetail.review_reason}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Proof */}
              {bookingDetail.payment_proof_url ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700 border-b pb-1">
                    Payment Proof
                  </p>
                  <a
                    href={bookingDetail.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bookingDetail.payment_proof_url}
                      alt="Payment proof"
                      className="max-h-64 rounded-lg border border-slate-200 object-contain w-full hover:opacity-90 transition-opacity"
                    />
                    <p className="text-xs text-slate-400 mt-1 text-center">
                      Click to open full size
                    </p>
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <ImageIcon className="w-4 h-4" />
                  <span>No payment proof uploaded</span>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  CreditCard,
  Ban,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface ReviewBooking {
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

interface ReviewBookingDetail extends ReviewBooking {
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

function getStatusColor(status: string) {
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
}

export default function ReviewPage() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<ReviewBooking[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<
    "approve" | "cancel" | null
  >(null);
  const [bookingDetail, setBookingDetail] =
    useState<ReviewBookingDetail | null>(null);

  const fetchReviewBookings = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", pagination.limit.toString());
      params.append("needsReview", "true");
      params.append("sortBy", "booked_at");
      params.append("sortOrder", "DESC");

      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      const response = await fetch(`/api/admin/bookings?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch review bookings");
      }

      const data = await response.json();
      setBookings(data.bookings ?? []);
      setPagination(data.pagination ?? pagination);
    } catch (error) {
      console.error("Failed to load review bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load review bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchReviewBookings(1);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const openBookingDetail = async (passengerId: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setBookingDetail(null);

    try {
      const response = await fetch(`/api/admin/bookings/${passengerId}`);
      if (!response.ok) {
        throw new Error("Failed to load booking details");
      }

      const data: ReviewBookingDetail = await response.json();
      setBookingDetail(data);
    } catch (error) {
      console.error("Failed to load review detail:", error);
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

  const handleReviewAction = async (action: "approve" | "cancel") => {
    if (!bookingDetail) {
      return;
    }

    setActionLoading(action);
    try {
      const response = await fetch(
        `/api/admin/bookings/${bookingDetail.passenger_id}/review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
          (errorBody as { error?: string }).error || "Failed to approve review",
        );
      }

      setDetailOpen(false);
      setBookingDetail(null);
      setBookings((prev) =>
        prev.filter(
          (booking) => booking.passenger_id !== bookingDetail.passenger_id,
        ),
      );
      setPagination((prev) => ({
        ...prev,
        total: Math.max(prev.total - 1, 0),
      }));

      toast({
        title: action === "cancel" ? "Review cancelled" : "Review approved",
        description:
          action === "cancel"
            ? "The booking group was cancelled and removed from the review queue."
            : "The booking group has been cleared for the normal bookings workflow.",
      });

      await fetchReviewBookings(1);
    } catch (error) {
      console.error("Failed to approve review:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to approve review",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Needs Review
        </h1>
        <p className="mt-1 text-slate-500">
          Review flagged booking groups, inspect the reason, and approve them
          into the normal bookings workflow.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Flagged Groups</p>
            <p className="mt-2 text-3xl font-bold text-rose-600">
              {loading ? "..." : pagination.total}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md md:col-span-2">
          <CardContent className="pt-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search flagged passengers, group members, phone, or Aadhaar..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Flagged Booking Groups</CardTitle>
            <div className="text-sm text-slate-500">
              Total: {pagination.total} groups
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-3 font-medium">Loading reviews...</span>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center p-12">
              <p className="text-slate-500 font-medium">
                No flagged bookings found
              </p>
              <p className="text-sm text-slate-400">
                Try another search term or wait for new review cases.
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
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow
                        key={booking.booking_id}
                        className="cursor-pointer bg-rose-50/30 hover:bg-rose-50"
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
                        </TableCell>
                        <TableCell className="font-mono font-semibold text-blue-700">
                          {booking.coach_number}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`border ${getStatusColor(booking.booking_status)}`}
                          >
                            {STATUS_LABELS[booking.booking_status] ??
                              booking.booking_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-72 text-sm text-rose-700">
                          {booking.review_reason || "Needs manual review"}
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

              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <div className="text-sm text-slate-600">
                  Page {pagination.page} of {pagination.pages} (
                  {pagination.total} total)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fetchReviewBookings(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from(
                      { length: Math.min(5, pagination.pages) },
                      (_, index) => {
                        const pageNum = index + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={
                              pagination.page === pageNum
                                ? "default"
                                : "outline"
                            }
                            onClick={() => fetchReviewBookings(pageNum)}
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
                    onClick={() => fetchReviewBookings(pagination.page + 1)}
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          showCloseButton
        >
          {detailLoading && (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mr-3" />
              <span className="font-medium">Loading details...</span>
            </div>
          )}

          {!detailLoading && bookingDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Review Booking #{bookingDetail.booking_id} -{" "}
                  {bookingDetail.main_passenger_name}
                </DialogTitle>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge
                    variant="destructive"
                    className="flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Review Flagged
                  </Badge>
                  <Badge
                    className={`border ${getStatusColor(bookingDetail.booking_status)}`}
                  >
                    {STATUS_LABELS[bookingDetail.booking_status] ??
                      bookingDetail.booking_status}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-800">
                    Review reason
                  </p>
                  <p className="mt-1 text-sm text-rose-700">
                    {bookingDetail.review_reason ||
                      "This booking was flagged for manual review."}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => handleReviewAction("approve")}
                    disabled={actionLoading !== null}
                    className="w-full sm:w-auto flex items-center gap-2"
                  >
                    {actionLoading === "approve" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    Approve Review
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReviewAction("cancel")}
                    disabled={actionLoading !== null}
                    className="w-full sm:w-auto flex items-center gap-2"
                  >
                    {actionLoading === "cancel" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Ban className="w-4 h-4" />
                    )}
                    Cancel Review
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Approve clears the review flag and moves the group into the
                  normal bookings workflow. Cancel marks the whole group as
                  cancelled, clears the review flag, and releases the seats.
                </p>
              </div>

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
                </div>
              </div>

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
                        {bookingDetail.seat_assignments.map(
                          (assignment, index) => (
                            <tr
                              key={`${assignment.booking_id}-${index}`}
                              className="bg-white"
                            >
                              <td className="px-3 py-2 font-medium text-slate-800">
                                {assignment.passenger_name}
                              </td>
                              <td className="px-3 py-2 font-mono text-blue-700 font-semibold">
                                {assignment.seat_number}
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-600">
                                {assignment.aadhaar_number ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-slate-600 capitalize">
                                {assignment.berth_type ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {assignment.age != null
                                  ? `${assignment.age} yrs`
                                  : "-"}
                              </td>
                              <td className="px-3 py-2 text-slate-600 capitalize">
                                {assignment.gender ?? "-"}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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

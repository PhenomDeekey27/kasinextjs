"use client";

import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { verifyPayment } from "@/lib/api";

export type BookingData = {
  id: string;
  passengerName: string;
  phone: string;
  referenceMember: string;
  seats: number;
  coach: string;
  amountPaid: number;
  balance: number;
  status: "Pending" | "Verified" | "Cancelled";
  needsReview: boolean;
};

interface AdminTableProps {
  data: BookingData[];
  onAction?: (action: string, id: string) => void;
}

export function AdminTable({ data: initialData, onAction }: AdminTableProps) {
  const [data, setData] = useState<BookingData[]>(initialData);
  const { toast } = useToast();

  const handleVerify = async (id: string) => {
    try {
      await verifyPayment(id);
      setData((prevData) =>
        prevData.map((booking) =>
          booking.id === id
            ? { ...booking, status: "Verified" as const, needsReview: false }
            : booking,
        ),
      );
      toast({
        title: "Payment Verified",
        description: `Booking ID ${id} is successfully verified.`,
      });
      if (onAction) onAction("verify", id);
    } catch (e) {
      toast({ title: "Action Failed", variant: "destructive" });
    }
  };

  const handleCancel = (id: string) => {
    setData((prevData) =>
      prevData.map((booking) =>
        booking.id === id
          ? { ...booking, status: "Cancelled" as const }
          : booking,
      ),
    );
    toast({
      title: "Booking Cancelled",
      description: `Booking ID ${id} is cancelled.`,
      variant: "destructive",
    });
    if (onAction) onAction("cancel", id);
  };

  const columns: ColumnDef<BookingData>[] = [
    {
      accessorKey: "passengerName",
      header: "Passenger",
      cell: ({ row }) => (
        <div className="font-semibold text-slate-800">
          {row.getValue("passengerName")}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <div className="text-slate-600 font-mono text-sm">
          {row.getValue("phone")}
        </div>
      ),
    },
    {
      accessorKey: "referenceMember",
      header: "Coordinator",
      cell: ({ row }) => (
        <div className="text-slate-600">{row.getValue("referenceMember")}</div>
      ),
    },
    {
      accessorKey: "seats",
      header: "Seats",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-slate-50 text-slate-700">
          {row.getValue("seats")}
        </Badge>
      ),
    },
    {
      accessorKey: "coach",
      header: "Coach/Berth",
      cell: ({ row }) => (
        <div className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded-md inline-block text-xs font-bold">
          {row.getValue("coach")}
        </div>
      ),
    },
    {
      accessorKey: "amountPaid",
      header: "Paid (₹)",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amountPaid"));
        return <div className="text-emerald-600 font-medium">₹{amount}</div>;
      },
    },
    {
      accessorKey: "balance",
      header: "Due (₹)",
      cell: ({ row }) => {
        const due = parseFloat(row.getValue("balance"));
        return (
          <div
            className={`font-medium ${due > 0 ? "text-amber-600" : "text-slate-400"}`}
          >
            ₹{due}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const variants: Record<string, string> = {
          Pending: "bg-amber-100 text-amber-800 border-amber-200",
          Verified: "bg-emerald-100 text-emerald-800 border-emerald-200",
          Cancelled: "bg-slate-100 text-slate-600 border-slate-200",
        };
        return (
          <Badge className={`border ${variants[status] || variants.Pending}`}>
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const booking = row.original;

        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              title="View Details"
              className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {booking.status === "Pending" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Verify Payment"
                  className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                  onClick={() => handleVerify(booking.id)}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Cancel Booking"
                  className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => handleCancel(booking.id)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="text-slate-600 font-semibold h-12"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`hover:bg-slate-50/50 ${row.original.needsReview ? "bg-rose-50/30" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-slate-500"
                >
                  No bookings found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

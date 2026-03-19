import { Suspense } from "react";
import { BookingForm } from "@/components/BookingForm";

export default function BookTicketPage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-slate-100">
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          Reserve Your Seats Today
        </h1>
        <p className="mt-4 text-lg text-slate-500">
          Group together and pay easily. Fast seat allocation.
        </p>
      </div>
      <Suspense fallback={<div className="text-center text-slate-500">Loading booking form...</div>}>
        <BookingForm />
      </Suspense>
    </div>
  );
}

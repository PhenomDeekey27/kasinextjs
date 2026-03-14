"use client";

import { CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";

export function BookingSuccess({ onReset }: { onReset: () => void }) {
  return (
    <Card className="max-w-md mx-auto mt-16 text-center border-0 shadow-xl overflow-hidden rounded-2xl">
      <div className="bg-green-500 py-12 px-6 flex flex-col items-center">
        <div className="bg-white/20 p-4 rounded-full mb-4">
          <CheckCircle className="w-16 h-16 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Booking Received!</h2>
      </div>
      <CardContent className="pt-8 pb-4 px-6 text-slate-600">
        <p className="text-lg mb-4">
          Your seat booking request has been submitted successfully.
        </p>
        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 mb-2">
          <p className="font-semibold text-sm">Status: Payment Verification Pending</p>
          <p className="text-xs mt-1">Our team will review your request and confirm seat allocations shortly.</p>
        </div>
      </CardContent>
      <CardFooter className="pb-8 pt-4 justify-center">
        <Button onClick={onReset} variant="outline" className="rounded-full px-8 hover:bg-slate-50">
          Book Another Ticket
        </Button>
      </CardFooter>
    </Card>
  );
}

import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const submitBooking = async (bookingData: any) => {
  // Mock API structure for booking submission
  // return api.post("/book-ticket", bookingData);
  return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000));
};

export const fetchBookings = async () => {
  // return api.get("/admin/bookings");
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve([
          {
            id: "1",
            passengerName: "Rahul Sharma",
            phone: "9876543210",
            referenceMember: "None",
            seats: 4,
            coach: "S3",
            amountPaid: 2000,
            balance: 1500,
            status: "Pending",
            needsReview: true,
          },
        ]),
      1000
    )
  );
};

export const fetchSeatMap = async (coach: string) => {
  // return api.get(`/admin/seat-map/${coach}`);
  return new Promise((resolve) => setTimeout(() => resolve([]), 500));
};

export const verifyPayment = async (bookingId: string) => {
  // return api.post(`/admin/bookings/${bookingId}/verify`);
  return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 500));
};

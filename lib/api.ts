import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

/**
 * Transform BookingForm data to API format
 * Converts camelCase form structure to snake_case API format
 */
function transformBookingData(bookingData: any) {
  const { primaryPassenger, groupMembers, paymentMode, paymentAmount, paymentProof } = bookingData;

  // Transform group members to JSON string
  const transformedGroupMembers = groupMembers.length > 0 
    ? JSON.stringify(groupMembers.map((m: any) => ({
        name: m.name,
        age: m.age,
        gender: m.gender,
        seat_preference: m.seatPreference,
      })))
    : null;

  return {
    // Primary passenger details
    name: primaryPassenger.name,
    phone: primaryPassenger.phone,
    aadhaar_number: primaryPassenger.aadhaar,
    gender: primaryPassenger.gender,
    age: primaryPassenger.age,
    seat_preference: primaryPassenger.seatPreference,
    reference_name: primaryPassenger.referenceMember === "None" ? null : primaryPassenger.referenceMember,
    // Group members and payment
    group_members: transformedGroupMembers,
    payment_mode: paymentMode,
    payment_amount: paymentAmount,
    payment_proof: paymentProof, // File object
  };
}

/**
 * POST /api/book-ticket
 * Submit booking with file uploads using FormData
 */
export const submitBooking = async (bookingData: any) => {
  try {
    const transformedData = transformBookingData(bookingData);
    
    // Create FormData for multipart upload
    const formData = new FormData();
    
    // Add all string fields
    formData.append("name", transformedData.name);
    formData.append("phone", transformedData.phone);
    formData.append("aadhaar_number", transformedData.aadhaar_number);
    formData.append("gender", transformedData.gender);
    formData.append("age", transformedData.age.toString());
    formData.append("seat_preference", transformedData.seat_preference);
    
    if (transformedData.reference_name) {
      formData.append("reference_name", transformedData.reference_name);
    }
    
    if (transformedData.group_members) {
      formData.append("group_members", transformedData.group_members);
    }
    
    // Add file if present (for online payments)
    if (transformedData.payment_proof instanceof FileList && transformedData.payment_proof.length > 0) {
      formData.append("payment_proof", transformedData.payment_proof[0]);
    }
    
    // Log for debugging
    console.log("Submitting booking with FormData:", {
      name: transformedData.name,
      phone: transformedData.phone,
      groupMembers: transformedData.group_members ? JSON.parse(transformedData.group_members) : [],
      hasPaymentProof: !!transformedData.payment_proof,
    });
    
    const response = await api.post("/book-ticket", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    
    return response.data;
  } catch (error) {
    console.error("Booking submission error:", error);
    throw error;
  }
};

/**
 * GET /api/bookings
 * Fetch all bookings
 */
export const fetchBookings = async () => {
  try {
    const response = await api.get("/bookings");
    return response.data.bookings || [];
  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw error;
  }
};

/**
 * GET /api/seat-map/[coachId]
 * Fetch seat map for a coach
 */
export const fetchSeatMap = async (coachId: string) => {
  try {
    const response = await api.get(`/seat-map/${coachId}`);
    return response.data.seats || [];
  } catch (error) {
    console.error("Error fetching seat map:", error);
    throw error;
  }
};

/**
 * PATCH /api/bookings/[id]/verify-payment
 * Verify payment and confirm booking
 */
export const verifyPayment = async (bookingId: string) => {
  try {
    const response = await api.patch(`/bookings/${bookingId}/verify-payment`);
    return response.data;
  } catch (error) {
    console.error("Error verifying payment:", error);
    throw error;
  }
};

/**
 * DELETE /api/bookings/[id]/cancel
 * Cancel a booking
 */
export const cancelBooking = async (bookingId: string) => {
  try {
    const response = await api.delete(`/bookings/${bookingId}/cancel`);
    return response.data;
  } catch (error) {
    console.error("Error cancelling booking:", error);
    throw error;
  }
};

/**
 * GET /api/reference-members
 * Fetch list of reference members/coordinators
 */
export const fetchReferenceMembers = async () => {
  try {
    const response = await api.get("/reference-members");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching reference members:", error);
    throw error;
  }
};

/**
 * GET /api/bookings/review
 * Fetch bookings that need review
 */
export const fetchReviewBookings = async () => {
  try {
    const response = await api.get("/bookings/review");
    return response.data.bookings || [];
  } catch (error) {
    console.error("Error fetching review bookings:", error);
    throw error;
  }
};

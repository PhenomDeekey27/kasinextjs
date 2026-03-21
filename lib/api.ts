import axios from "axios";
import { normalizeAadhaar } from "./utils";

interface BookingPrimaryPassenger {
  name: string;
  phone: string;
  emergencyContactNumber: string;
  aadhaar: string;
  gender: string;
  dob: string;
  age: number;
  street: string;
  nation: string;
  state: string;
  district: string;
  seatPreference: string;
  roomPreference: string;
  requiresAccessibilitySupport: string;
  accessibilityNote?: string;
  referenceMember?: string;
}

interface BookingGroupMember {
  name: string;
  dob: string;
  age: number;
  gender: string;
  relationship: string;
  aadhaar: string;
  seatPreference: string;
  requiresAccessibilitySupport: string;
  accessibilityNote?: string;
}

interface SubmitBookingPayload {
  primaryPassenger: BookingPrimaryPassenger;
  groupMembers: BookingGroupMember[];
  paymentMode:
    | "UPI"
    | "Bank Transfer"
    | "Net Banking"
    | "Credit Card"
    | "Debit Card"
    | "Cash"
    | "Other";
  transactionIdUtr?: string;
  paymentPendingStatus?: "FULL_PAID" | "BALANCE_5000";
  paymentProof?: FileList;
}

const api = axios.create({
  baseURL: "/api",
});

/**
 * Transform BookingForm data to API format
 * Converts camelCase form structure to snake_case API format
 */
function transformBookingData(bookingData: SubmitBookingPayload) {
  const {
    primaryPassenger,
    groupMembers,
    paymentMode,
    transactionIdUtr,
    paymentPendingStatus,
    paymentProof,
  } = bookingData;

  // Transform group members to JSON string
  const transformedGroupMembers =
    groupMembers.length > 0
      ? JSON.stringify(
          groupMembers.map((m) => ({
            name: m.name,
            dob: m.dob,
            age: m.age,
            gender: m.gender,
            relationship: m.relationship,
            aadhaar_number: normalizeAadhaar(m.aadhaar),
            seat_preference: m.seatPreference,
            requires_accessibility_support:
              m.requiresAccessibilitySupport === "yes",
            accessibility_note: m.accessibilityNote?.trim() || null,
          })),
        )
      : null;

  const computedPendingAmount =
    paymentPendingStatus === "BALANCE_5000" ? 5000 : 0;

  return {
    // Primary passenger details
    name: primaryPassenger.name,
    phone: primaryPassenger.phone,
    emergency_contact_number: primaryPassenger.emergencyContactNumber,
    aadhaar_number: normalizeAadhaar(primaryPassenger.aadhaar),
    gender: primaryPassenger.gender,
    dob: primaryPassenger.dob,
    age: primaryPassenger.age,
    street: primaryPassenger.street,
    nation: primaryPassenger.nation,
    state: primaryPassenger.state,
    district: primaryPassenger.district,
    seat_preference: primaryPassenger.seatPreference,
    room_preference: primaryPassenger.roomPreference,
    requires_accessibility_support:
      primaryPassenger.requiresAccessibilitySupport === "yes",
    accessibility_note: primaryPassenger.accessibilityNote?.trim() || null,
    reference_name:
      primaryPassenger.referenceMember === "None"
        ? null
        : primaryPassenger.referenceMember,
    // Group members and payment
    group_members: transformedGroupMembers,
    payment_mode: paymentMode,
    transaction_id_utr: transactionIdUtr?.trim() || null,
    payment_pending_status: paymentPendingStatus || null,
    payment_amount: computedPendingAmount,
    payment_proof: paymentProof, // File object
  };
}

/**
 * POST /api/book-ticket
 * Submit booking with file uploads using FormData
 */
export const submitBooking = async (bookingData: SubmitBookingPayload) => {
  try {
    const transformedData = transformBookingData(bookingData);

    // Create FormData for multipart upload
    const formData = new FormData();

    // Add all string fields
    formData.append("name", transformedData.name);
    formData.append("phone", transformedData.phone);
    formData.append(
      "emergency_contact_number",
      transformedData.emergency_contact_number,
    );
    formData.append("aadhaar_number", transformedData.aadhaar_number);
    formData.append("gender", transformedData.gender);
    formData.append("dob", transformedData.dob);
    formData.append("age", transformedData.age.toString());
    formData.append("street", transformedData.street);
    formData.append("nation", transformedData.nation);
    formData.append("state", transformedData.state);
    formData.append("district", transformedData.district);
    formData.append("seat_preference", transformedData.seat_preference);
    formData.append("room_preference", transformedData.room_preference);
    formData.append(
      "requires_accessibility_support",
      transformedData.requires_accessibility_support ? "true" : "false",
    );

    if (transformedData.accessibility_note) {
      formData.append("accessibility_note", transformedData.accessibility_note);
    }

    if (transformedData.reference_name) {
      formData.append("reference_name", transformedData.reference_name);
    }

    if (transformedData.group_members) {
      formData.append("group_members", transformedData.group_members);
    }

    formData.append("payment_mode", transformedData.payment_mode);
    formData.append(
      "payment_amount",
      transformedData.payment_amount.toString(),
    );

    if (transformedData.payment_pending_status) {
      formData.append(
        "payment_pending_status",
        transformedData.payment_pending_status,
      );
    }

    if (transformedData.transaction_id_utr) {
      formData.append("transaction_id_utr", transformedData.transaction_id_utr);
    }

    // Add file if present (for online payments)
    if (
      transformedData.payment_proof instanceof FileList &&
      transformedData.payment_proof.length > 0
    ) {
      formData.append("payment_proof", transformedData.payment_proof[0]);
    }

    // Log for debugging
    console.log("Submitting booking with FormData:", {
      name: transformedData.name,
      phone: transformedData.phone,
      paymentMode: transformedData.payment_mode,
      paymentAmount: transformedData.payment_amount,
      transactionIdUtr: transformedData.transaction_id_utr,
      groupMembers: transformedData.group_members
        ? JSON.parse(transformedData.group_members)
        : [],
      hasPaymentProof: !!transformedData.payment_proof,
    });

    const response = await api.post("/book-ticket", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 409) {
      console.error("Booking submission error:", error);
    }
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

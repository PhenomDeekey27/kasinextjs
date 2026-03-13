# Implementation Plan: J Tourism Booking Automation Frontend

This project implements a professional, modern frontend UI for the J Tourism train booking system using Next.js App Router, Tailwind CSS, shadcn/ui, and Framer Motion.

## Proposed Changes

### Core & Layout
- Add global dependencies: `framer-motion`, `axios`, `react-hook-form`, `zod`, `@hookform/resolvers`, `@tanstack/react-table`, `date-fns`.
- Setup Shadcn UI components (Card, Input, Button, Label, Select, Dialog, Tabs, Badge, Table, Toast, etc.).
- Update [app/globals.css](file:///d:/kasinextjs/app/globals.css) with a custom blue/teal theme, soft shadows, and clean modern aesthetic.
- Update [app/layout.tsx](file:///d:/kasinextjs/app/layout.tsx) to include `Navbar`, `Footer`, and `Toaster`.
- Create `components/Navbar.tsx` and `components/Footer.tsx`.

---

### Home Page
- Create `components/HeroSection.tsx` with high-quality train background image, headline, and primary CTA.
- Build [app/page.tsx](file:///d:/kasinextjs/app/page.tsx) integrating the HeroSection and a responsive features grid showcasing App capabilities.

---

### Passenger Booking Flow
- Create `app/book-ticket/page.tsx`. Use a card-based layout for the form.
- Create `components/BookingForm.tsx`. It will use React Hook Form and Zod for validation.
  - Section for Passenger Details: Name, Age, Gender, Phone, Aadhaar, Seat Preference, and Reference Member (searchable dropdown).
- Create `components/GroupMembers.tsx` to conditionally render forms for up to 7 additional members (max 8 group size total).
- Include Payment Section toggle (Online vs Manual) with file upload for proof.
- Create `components/BookingSuccess.tsx` to handle post-submission success state.

---

### Admin Dashboard & Authentication
- Create `app/admin/login/page.tsx` with a centered login card.
- Create `app/admin/layout.tsx` for admin-specific sidebar/navbar if needed, or re-use global Layout.
- Create `app/admin/dashboard/page.tsx`. Add `components/StatsCards.tsx` (Total Seats, Booked Seats, Available, Pending Verification, Needs Review).
- Create `app/admin/bookings/page.tsx` displaying all bookings via `components/AdminTable.tsx` (using `@tanstack/react-table`).
- Create `app/admin/review/page.tsx` displaying filtered bookings that need review.
- Create `app/admin/seat-map/page.tsx`. Add `components/SeatMap.tsx` mapping out 18 coaches * 72 seats in AC-3 Tier layout, coloring states (Available=Green, Booked=Red, Reserved=Gray).

---

### Shared Configuration
- Create `lib/constants.ts` with seating layout facts (reserved seats: 3, 35, 70), total seats, max group size, etc.
- Create `lib/api.ts` with basic axios structure (mock calls calling endpoints like `/api/book`, `/api/admin/bookings` for integration by backend dev later).

## Verification Plan

### Automated Tests
- Validate linting output using `npm run lint`.
- Build the project with `npm run build` to ensure no Typescript/Next.js compilation errors.

### Manual Verification
- Render the local dev server using `npm run dev`.
- Verify `Navbar` navigation works perfectly across all screen sizes.
- Verify Home page hero layout, button colors, and fonts resizability.
- Enter the Passenger Booking form, attempt to exceed 8 users, observe UI error. 
- Try to submit form empty to check Zod validation.
- Verify Admin Seat map renders accurately with AC-3 Tier patterns.
- Ensure design meets modern aesthetic criteria (Blue/Teal palette, rounded UI, shadows).

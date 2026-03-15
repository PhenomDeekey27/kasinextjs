# Seat Allocation Quick Reference

## Code Organization

```
kasi-booking/
├── lib/
│   ├── init-db.ts                      ← Database schema + seeding
│   ├── db.ts                          ← Connection pool management
│   ├── api.ts                         ← Client API wrapper
│   ├── constants.ts                   ← Train config constants
│   └── services/
│       ├── seatAllocator.ts           ⭐ MAIN ALLOCATION ENGINE
│       ├── alertService.ts             ← Coordinator notifications
│       ├── supabaseStorage.ts          ← File uploads
│       ├── uploadService.ts            ← Form parsing
│       └── whatsappService.ts          ← Future: WhatsApp integration
│
├── app/
│   └── api/
│       ├── book-ticket/
│       │   └── route.ts               ← Booking API endpoint
│       ├── reference-members/
│       │   └── route.ts               ← Get coordinators list
│       ├── bookings/
│       │   └── route.ts               ← Manage bookings
│       └── ...
│
├── components/
│   ├── BookingForm.tsx                ← Booking submission form
│   ├── SeatMap.tsx                    ← Seat visualization
│   └── ...
│
└── Documentation/
    ├── SEAT_ALLOCATION_SYSTEM.md      ← Comprehensive guide
    └── DEPLOYMENT_GUIDE.md            ← Production deployment
```

---

## Key Functions

### `/lib/services/seatAllocator.ts`

#### Main Function
```typescript
export async function allocateSeats(
  client: PoolClient,
  passenger: Passenger,
  groupMembers: GroupMember[]
): Promise<AllocationResult>
```

**What it does**:
1. Validates group size (≤ 8)
2. Finds reference coach
3. Allocates seats with complex rules
4. Returns: `{ seats[], needsReview, reviewReason }`

**Called by**: `/app/api/book-ticket/route.ts`

#### Helper Functions
```typescript
normalizePreference(preference)        // "LB" → "lower"
findReferenceCoachForGroup(client, name)   // Find existing group's coach
tryAllocateInCoach(client, coachId, size, passengers)   // Try one coach
findContiguousBlock(seats, minSize)   // Catch sequential seats
findCompartmentSeatsWithGroup(seats, size)   // Catch same compartment
findScatteredSeats(client, size, passengers)   // Scatter allocation
areSeatsContiguous(seats)             // Validate contiguity
hasGenderConflict(seats, passengers)   // Detect gender issues
```

---

### `/app/api/book-ticket/route.ts`

**Flow**:
1. Parse FormData (fields + files)
2. Validate age/phone/aadhaar
3. Upload Aadhaar & payment proof to Supabase
4. INSERT passenger + group members
5. **Call allocateSeats()** ← Key integration point
6. CREATE booking records
7. UPDATE seats: is_booked = true
8. **Send coordinator alert if needs_review**
9. COMMIT transaction
10. Return response with booking_id + seats

---

### `/lib/init-db.ts`

**Initialization Tasks**:
```sql
CREATE TABLE reference_members       ← NEW
CREATE TABLE passengers              ← Existing
CREATE TABLE group_members           ← Existing
CREATE TABLE coaches                 ← ENHANCED
CREATE TABLE seats                   ← ENHANCED
CREATE TABLE bookings                ← Existing

-- Then automatically:
INSERT 18 coaches (A01-A18)
INSERT 1,296 seats (18 × 72)
UPDATE seats SET is_reserved = true WHERE seat_number IN (3,35,70)
INSERT 170 reference members
```

**Runs once**: On first database request due to `initDatabase()` promise caching

---

## Data Flow

### Booking Submission
```
User fills form
    ↓
Form.onSubmit()
    ↓
submitBooking(data)  [lib/api.ts]
    ↓
transformBookingData()
    ↓
FormData created
    ↓
POST /api/book-ticket
    ↓
✅ Response: { booking_id, coach, seats, needs_review }
```

### Seat Allocation
```
POST /api/book-ticket
    ↓
Parse request → Insert passenger
    ↓
allocateSeats(client, passenger, groupMembers)
    ↓
1. Check group size ≤ 8
2. Get reference coach
3. Query available seats in coach
4. Try contiguous block
5. Try compartment seating
6. Try scattered allocation
7. Check gender safety
8. Set needs_review flag
    ↓
Return: Seat[] + needsReview + reviewReason
    ↓
Create booking records
Update seats: is_booked = true
    ↓
IF needs_review: sendCoordinatorAlert()
    ↓
COMMIT transaction
    ↓
✅ Response
```

---

## Important Constants

### `/lib/constants.ts`
```typescript
TRAIN_CONFIG = {
  TOTAL_COACHES: 18,
  SEATS_PER_COACH: 72,
  TOTAL_SEATS: 1296,
  RESERVED_SEATS: [3, 35, 70],  // Per coach
  MAX_GROUP_SIZE: 8,
}

BERTH_TYPES = {
  "LB": "Lower Berth",
  "MB": "Middle Berth",
  "UB": "Upper Berth",
  "SL": "Side Lower",
  "SU": "Side Upper"
}
```

### Seat Pattern (Room 8 seats)
```
Pos 1: lower
Pos 2: middle
Pos 3: upper       ← RESERVED
Pos 4: lower
Pos 5: middle
Pos 6: upper
Pos 7: side_lower
Pos 8: side_upper
```

---

## Database Queries

### Find Available Seats
```sql
SELECT * FROM seats
WHERE coach_id = $1
AND is_booked = false
AND is_reserved = false
ORDER BY seat_number ASC
FOR UPDATE SKIP LOCKED
```

**Key**: `FOR UPDATE SKIP LOCKED` prevents concurrent allocation

### Find Reference Group
```sql
SELECT DISTINCT b.coach_id FROM bookings b
JOIN passengers p ON b.passenger_id = p.id
WHERE p.reference_name = $1 AND b.booking_status != 'cancelled'
LIMIT 1
```

### Mark Seat as Booked
```sql
UPDATE seats
SET is_booked = true, passenger_id = $1
WHERE id = $2
```

### Create Booking
```sql
INSERT INTO bookings (
  passenger_id, group_member_id, seat_id, coach_id,
  booking_status, needs_review, review_reason
)
VALUES ($1, $2, $3, $4, 'pending_verification', $5, $6)
```

---

## Error Handling

### In seatAllocator.ts
```typescript
if (totalPassengers > MAX_GROUP_SIZE) {
  throw new Error("Group size exceeds maximum");
}

if (allocatedSeats.length < totalPassengers) {
  throw new Error("Insufficient seats allocated");
}
```

### In route.ts
```typescript
try {
  await client.query("BEGIN");
  // ... allocation logic ...
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

---

## Testing Points

### Unit Test: Seat Preference Normalization
```typescript
expect(normalizePreference("LB")).toBe("lower");
expect(normalizePreference("No Preference")).toBe(null);
```

### Unit Test: Contiguous Detection
```typescript
const seats = [
  { seat_number: 10 },
  { seat_number: 11 },
  { seat_number: 12 }
];
expect(areSeatsContiguous(seats)).toBe(true);
```

### Integration Test: Full Booking Flow
```typescript
// 1. Make POST request to /api/book-ticket
// 2. Verify response.booking_id exists
// 3. Query database: SELECT * FROM bookings WHERE id = booking_id
// 4. Verify seats marked is_booked = true
// 5. Check if needs_review set correctly
```

---

## Common Modifications

### Add New Reference Member
```sql
INSERT INTO reference_members (name) VALUES ('New Coordinator Name');
```

### Reserve Additional Seats
```sql
UPDATE seats
SET is_reserved = true
WHERE seat_number = 50;
```

### Check Booking Status
```sql
SELECT b.*, p.name, s.seat_number
FROM bookings b
JOIN passengers p ON b.passenger_id = p.id
JOIN seats s ON b.seat_id = s.id
WHERE b.id = 42;
```

### Mark Booking as Confirmed
```sql
UPDATE bookings
SET booking_status = 'confirmed'
WHERE id = 42 AND booking_status = 'pending_verification';
```

---

## Performance Tips

### Query Optimization
- Use `FOR UPDATE SKIP LOCKED` for seat queries (already done)
- Index on `seats(coach_id, is_booked, is_reserved)`
- Index on `passengers(reference_name)`

### Connection Pool
```typescript
// In lib/db.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Increase if high concurrency
  idleTimeoutMillis: 30000,
});
```

### Caching
```typescript
// Cache reference members (1 hour TTL)
const cachedMembers = await redis.get('ref_members');
if (!cachedMembers) {
  const members = await query('SELECT * FROM reference_members');
  await redis.setex('ref_members', 3600, JSON.stringify(members));
}
```

---

## Debugging

### Enable Allocation Logging
Already enabled via `console.log()` calls:
```typescript
console.log("========== SEAT ALLOCATION ENGINE START ==========");
// ... detailed logs throughout allocation ...
console.log("Seat allocation result:", allocation);
```

### Check Database State
```bash
# SSH into production
psql $DATABASE_URL

# View all coaches
SELECT * FROM coaches;

# View seat occupancy
SELECT coach_id, berth_type, count(*) as total, 
       sum(case when is_booked then 1 else 0 end) as booked
FROM seats
GROUP BY coach_id, berth_type
ORDER BY coach_id;
```

### Monitor Logs
```bash
# Real-time logs
tail -f logs/nextjs.log | grep "SEAT ALLOCATION"

# Search for errors
grep "ERROR\|ROLLBACK\|deadlock" logs/nextjs.log
```

---

## Quick Start for New Dev

1. **Understand the flow**: Read front → back diagram above
2. **Find the main logic**: `/lib/services/seatAllocator.ts`
3. **See integration**: `/app/api/book-ticket/route.ts`
4. **Setup database**: `npm run dev` → auto-initializes
5. **Test**: Use SEAT_ALLOCATION_SYSTEM.md test cases
6. **Debug**: Check console logs for detailed trace

---

**Version**: 1.0  
**Last Updated**: March 2026  
**Status**: Production Ready ✅

# Seat Allocation System - Deployment Guide

## Pre-Deployment Checklist

### 1. Database Backup
```bash
# Backup existing database before initialization
pg_dump $DATABASE_URL > backup_before_seat_allocation.sql
```

### 2. Environment Variables
Ensure `.env.local` has:
```
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=...
SUPABASE_KEY=...
```

### 3. Dependencies
Ensure `package.json` has required packages (already included):
```json
{
  "dependencies": {
    "pg": "^8.x",
    "next": "^16.x",
    "react-hook-form": "^7.x"
  }
}
```

---

## Deployment Steps

### Step 1: Apply Code Changes
```bash
# All changes already in codebase
git add .
git commit -m "feat: implement train seat allocation engine"
git push
```

### Step 2: Build Project
```bash
npm run build
# Expected: Clean build with no TypeScript errors
```

### Step 3: Database Initialization
Database will auto-initialize on first request:
- 18 coaches created
- 72 × 18 = 1,296 seats created
- Reserved seats (3, 35, 70) marked
- 170 reference members seeded

**Or manually trigger:**
```bash
# Call any API endpoint that uses getClient()
curl https://your-domain.com/api/reference-members
```

### Step 4: Verify Setup
```sql
-- Check coaches
SELECT count(*) FROM coaches;
-- Expected: 18

-- Check seats
SELECT count(*) FROM seats;
-- Expected: 1296

-- Check reserved seats
SELECT count(*) FROM seats WHERE is_reserved = true;
-- Expected: 54 (18 coaches × 3 reserved seats)

-- Check reference members
SELECT count(*) FROM reference_members;
-- Expected: 170
```

### Step 5: Test Booking Flow
1. Open booking form
2. Reference members should load from `/api/reference-members`
3. Submit test booking
4. Verify response includes:
   - `booking_id`
   - `coach` number
   - `seats` array
   - `needs_review` flag

### Step 6: Check Logs
```bash
# Monitor allocation logs
tail -f .next/server.log

# Look for:
# ✓ "SEAT ALLOCATION ENGINE START"
# ✓ "Seat allocation result: { seats: [...], needsReview: true|false }"
# ✓ "Booking transaction committed"
```

---

## Post-Deployment Validation

### Test Case 1: Single Passenger
```
Name: Test User
Age: 30
Preference: Middle
Group: None

Expected: Single seat allocated, needs_review = false
```

### Test Case 2: Group of 3
```
Name: Group Lead
Age: 45
Group: 2 members

Expected: 3 contiguous seats, needs_review = false
```

### Test Case 3: Large Group
```
Name: Large Group
Group: 7 members
Mixed genders

Expected: needs_review = true (likely) with explanation
Coordinator alert triggered
```

### Test Case 4: Senior Citizen
```
Name: Senior
Age: 67
Preference: Lower

Expected: Lower berth allocated if possible
```

### Test Case 5: Reference Group
```
Name: Group Member
Reference: Rajesh Kumar (existing)
Group: 2 members

Expected: Same coach as Rajesh's booking if possible
```

---

## Monitoring & Maintenance

### Performance Metrics
- Booking submission: < 2 seconds
- Seat allocation: < 500ms
- Database response: < 100ms

### Error Monitoring
Watch for:
- `Seat allocation error: Not enough seats available`
- `ROLLBACK` transactions
- `FOR UPDATE SKIP LOCKED timeout` (race conditions)

### Daily Checks
```sql
-- Coach occupancy
SELECT coach_id, count(*) as booked_seats
FROM seats
WHERE is_booked = true
GROUP BY coach_id
ORDER BY booked_seats DESC;

-- Bookings needing review
SELECT count(*) FROM bookings WHERE needs_review = true;

-- Recent bookings
SELECT * FROM bookings
ORDER BY booked_at DESC
LIMIT 10;
```

---

## Rollback Procedure

If issues occur:

### Option 1: Revert Code
```bash
git revert HEAD
npm run build
# Restart server
```

### Option 2: Database Restore
```bash
psql $DATABASE_URL < backup_before_seat_allocation.sql
# Tables reset to previous state
```

---

## Coordinator Alert Integration

### Current State
Alerts logged to console/logs:
```
📢 COORDINATOR ALERT
⚠ BOOKING NEEDS COORDINATOR REVIEW ⚠

Passenger: [Name]
Phone: [Phone]
Group Size: [Size]

Reason: [Review Reason]
```

### To Enable Real Notifications

#### WhatsApp Integration
Update `/lib/services/alertService.ts`:
```typescript
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

if (needsReview) {
  await client.messages.create({
    body: message,
    from: `whatsapp:${process.env.TWILIO_NUMBER}`,
    to: `whatsapp:+${coordinator_whatsapp}`,
  });
}
```

#### SMS Integration
```typescript
import AWS from 'aws-sdk';

const sns = new AWS.SNS();

if (needsReview) {
  await sns.publish({
    Message: message,
    PhoneNumber: coordinator_phone,
  }).promise();
}
```

#### Email Integration
```typescript
import nodemailer from 'nodemailer';

if (needsReview) {
  await transporter.sendMail({
    to: coordinator_email,
    subject: 'Booking Needs Review',
    html: htmlMessage,
  });
}
```

---

## Performance Tuning

### Database Indexes
Consider adding for production:
```sql
-- Speed up reference group lookups
CREATE INDEX idx_bookings_reference_name 
ON bookings(coach_id) 
WHERE booking_status != 'cancelled';

-- Speed up availability checks
CREATE INDEX idx_seats_availability 
ON seats(coach_id, is_booked, is_reserved);

-- Speed up passenger queries
CREATE INDEX idx_passengers_reference 
ON passengers(reference_name);
```

### Caching
For high-traffic scenarios:
- Cache reference members list (Redis, 1 hour TTL)
- Cache seat availability per coach (invalidate on booking)
- Cache coach occupancy stats

---

## Incident Response

### Scenario: "Not enough seats" Error
1. Check occupancy: `SELECT count(*) FROM seats WHERE is_booked = true`
2. If near capacity (>1000): Reject new bookings or expand coaches
3. If false alarm: Check `is_booked` flag for zombie records

### Scenario: Coordinator Alerts Not Received
1. Check logs for alert generation
2. Verify external integration (WhatsApp/SMS) credentials
3. Test manually: `curl /api/reference-members` (should work)

### Scenario: Race Condition Detected
1. Review transaction logs
2. Check for `DEADLOCK DETECTED` errors
3. Increase connection pool: `pool.max = 20`

---

## Documentation
- Full system guide: `SEAT_ALLOCATION_SYSTEM.md`
- API testing: `API_TESTING_GUIDE_COMPREHENSIVE.md`
- Implementation checklist: This file

---

**Status**: Ready for Production Deployment ✅

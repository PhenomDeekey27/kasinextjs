# Migration Summary - Express Routes to Next.js API Routes

## Route Mapping

| Express Route                    | Method | Next.js Route                      | File                                            |
| -------------------------------- | ------ | ---------------------------------- | ----------------------------------------------- |
| `/api/bookings`                  | GET    | `/api/bookings`                    | `app/api/bookings/route.ts`                     |
| `/api/review-bookings`           | GET    | `/api/bookings/review`             | `app/api/bookings/review/route.ts`              |
| `/api/verify-payment/:bookingId` | PATCH  | `/api/bookings/:id/verify-payment` | `app/api/bookings/[id]/verify-payment/route.ts` |
| `/api/cancel-booking/:bookingId` | DELETE | `/api/bookings/:id/cancel`         | `app/api/bookings/[id]/cancel/route.ts`         |
| `/api/book-ticket`               | POST   | `/api/book-ticket`                 | `app/api/book-ticket/route.ts`                  |
| `/api/reference-members`         | GET    | `/api/reference-members`           | `app/api/reference-members/route.ts`            |
| `/api/seat-map/:coachId`         | GET    | `/api/seat-map/:coachId`           | `app/api/seat-map/[coachId]/route.ts`           |

---

## Service Layer Migration

| Express File                  | Location                         | Next.js File         | Location        |
| ----------------------------- | -------------------------------- | -------------------- | --------------- |
| `services/seatAllocator.js`   | `kasi-booking_backend/services/` | `seatAllocator.ts`   | `lib/services/` |
| `services/alertService.js`    | `kasi-booking_backend/services/` | `alertService.ts`    | `lib/services/` |
| `services/uploadService.js`   | `kasi-booking_backend/services/` | `uploadService.ts`   | `lib/services/` |
| `services/supabaseStorage.js` | `kasi-booking_backend/services/` | `supabaseStorage.ts` | `lib/services/` |
| `services/whatsappService.js` | `kasi-booking_backend/services/` | `whatsappService.ts` | `lib/services/` |

---

## Database Layer Migration

| Express            | Next.js                               |
| ------------------ | ------------------------------------- |
| `db.js` (CommonJS) | `lib/db.ts` (ES Modules + TypeScript) |

**Key Exports:**

```typescript
export async function getClient(): Promise<PoolClient>;
export async function query(text: string, params?: unknown[]);
export function queryWithClient(
  client: PoolClient,
  text: string,
  params?: unknown[],
);
export default pool;
```

---

## Critical Conversions

### 1. **Module System**

```javascript
// Express - CommonJS
const pool = require("../db");
module.exports = router;
```

```typescript
// Next.js - ES Modules
import pool from "@/lib/db";
export async function GET(request: NextRequest) {}
```

### 2. **Request/Response Handling**

```javascript
// Express
router.get("/bookings", async (req, res) => {
  try {
    const result = await pool.query(...);
    res.json({ bookings: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});
```

```typescript
// Next.js
export async function GET(request: NextRequest) {
  try {
    const result = await query(...);
    return NextResponse.json({ bookings: result.rows });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed" },
      { status: 500 }
    );
  }
}
```

### 3. **File Uploads**

```javascript
// Express - Multer Middleware
router.post(
  "/book-ticket",
  upload.fields([
    { name: "aadhaar", maxCount: 1 },
    { name: "payment_proof", maxCount: 1 },
  ]),
  async (req, res) => {
    if (req.files?.aadhaar) {
      const file = req.files.aadhaar[0];
      // process file
    }
  },
);
```

```typescript
// Next.js - FormData API
export async function POST(request: NextRequest) {
  const formData = await parseFormData(request);
  const files = formData.files;

  if (files.aadhaar && files.aadhaar.length > 0) {
    const aadhaarFile = await fileToBuffer(files.aadhaar[0]);
    // process file
  }
}
```

### 4. **Database Transactions**

```javascript
// Express - Using pool.connect()
const client = await pool.connect();
try {
  await client.query("BEGIN");
  // ... multiple queries
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
} finally {
  client.release();
}
```

```typescript
// Next.js - Same pattern with typed client
const client = await getClient();
try {
  await client.query("BEGIN");
  // ... multiple queries
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
} finally {
  client.release();
}
```

### 5. **Route Parameters**

```javascript
// Express
router.patch("/verify-payment/:bookingId", async (req, res) => {
  const bookingId = req.params.bookingId;
  // ...
});
```

```typescript
// Next.js
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const bookingId = params.id;
  // ...
}
```

---

## Testing the Migration

### 1. Test Database Connection

```bash
curl http://localhost:3000/api/bookings
```

### 2. Test File Upload (Book Ticket)

```bash
curl -X POST http://localhost:3000/api/book-ticket \
  -F "name=John Doe" \
  -F "phone=9876543210" \
  -F "aadhaar_number=1234567890123456" \
  -F "gender=male" \
  -F "age=35" \
  -F "seat_preference=lower" \
  -F "reference_name=REF001" \
  -F "group_members=[]" \
  -F "aadhaar=@path/to/aadhaar.pdf" \
  -F "payment_proof=@path/to/payment.pdf"
```

### 3. Test Booking Verification

```bash
curl -X PATCH http://localhost:3000/api/bookings/1/verify-payment
```

### 4. Test Booking Cancellation

```bash
curl -X DELETE http://localhost:3000/api/bookings/1/cancel
```

---

## Dependencies to Install

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "pg": "^8.11.0",
    "twilio": "^3.89.0",
    "@supabase/supabase-js": "^2.38.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/pg": "^8.10.0"
  }
}
```

---

## Common Issues & Solutions

### Issue: Multer middleware not found

**Solution:** Use FormData API instead. Multer is not needed in Next.js.

### Issue: `require` not found

**Solution:** Convert to `import` statements for ES modules.

### Issue: Environment variables not loading

**Solution:** Use `.env.local` in project root with `NEXT_PUBLIC_` prefix for client-side vars.

### Issue: Database connection timeout

**Solution:** Ensure `DATABASE_URL` is correctly set and database is accessible.

### Issue: TypeScript errors on request/response

**Solution:** Use `NextRequest` and `NextResponse` from `next/server`.

---

## Code Quality

✅ **TypeScript Support** - Full type safety across all services and API routes
✅ **Error Handling** - Try/catch blocks with proper HTTP status codes
✅ **Transaction Support** - Database transactions maintained
✅ **File Uploads** - Native Next.js FormData support
✅ **Service Layer** - Clean separation of concerns
✅ **Type Safety** - Interfaces for all major objects
✅ **Comments** - API documentation in route files
✅ **Production Ready** - Error handling, edge cases covered

---

## Performance Improvements

1. **No Extra Middleware** - FormData parsing happens on-demand
2. **Faster Startup** - No need to initialize Express app
3. **Better Bundling** - Next.js tree-shaking removes unused code
4. **Unified Deployment** - Frontend + Backend in one project

---

## Old Express Backend Can Be Deleted

Once verified that all API routes work correctly, you can delete:

```
kasi-booking_backend/
├── server.js
├── db.js
├── routes/
├── services/
└── package.json
```

The entire backend is now in `app/api/` and `lib/`.

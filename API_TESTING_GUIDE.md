# 🧪 API Testing Commands - Quick Reference

## Start Development Server

```bash
npm run dev
```

API will be available at: `http://localhost:3000/api/`

---

## Test All Endpoints

### 1️⃣ Get All Bookings

```bash
curl -X GET http://localhost:3000/api/bookings
```

**Expected Response:**

```json
{
  "total_bookings": 10,
  "bookings": [
    {
      "booking_id": 1,
      "passenger_name": "John Doe",
      "phone": "9876543210",
      "coach_number": 1,
      "seat_number": "A1",
      "berth_type": "lower",
      "booking_status": "confirmed"
    }
  ]
}
```

---

### 2️⃣ Get Bookings Needing Review

```bash
curl -X GET http://localhost:3000/api/bookings/review
```

**Expected Response:**

```json
{
  "total_review_bookings": 2,
  "bookings": [...]
}
```

---

### 3️⃣ Get Reference Members

```bash
curl -X GET http://localhost:3000/api/reference-members
```

**Expected Response:**

```json
[
  { "id": 1, "name": "Reference 1" },
  { "id": 2, "name": "Reference 2" }
]
```

---

### 4️⃣ Get Seat Map for a Coach

```bash
curl -X GET http://localhost:3000/api/seat-map/1
```

**Expected Response:**

```json
{
  "coach_id": "1",
  "seats": [
    {
      "id": 1,
      "seat_number": "A1",
      "berth_type": "lower",
      "is_booked": false,
      "is_reserved": false,
      "passenger_name": null
    }
  ]
}
```

---

### 5️⃣ Book a Ticket (with File Upload)

#### Simple booking without group members:

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
  -F "aadhaar=@./sample-aadhaar.pdf" \
  -F "payment_proof=@./sample-payment.pdf"
```

#### With group members:

```bash
curl -X POST http://localhost:3000/api/book-ticket \
  -F "name=John Doe" \
  -F "phone=9876543210" \
  -F "aadhaar_number=1234567890123456" \
  -F "gender=male" \
  -F "age=35" \
  -F "seat_preference=lower" \
  -F "reference_name=REF001" \
  -F "group_members=[{\"name\": \"Jane Doe\", \"age\": 30, \"gender\": \"female\", \"seat_preference\": \"lower\"}]" \
  -F "aadhaar=@./sample-aadhaar.pdf" \
  -F "payment_proof=@./sample-payment.pdf"
```

**Expected Response:**

```json
{
  "message": "Booking created. Waiting for payment verification.",
  "bookings": [
    {
      "id": 1,
      "passenger_id": 1,
      "seat_id": 1,
      "coach_id": 1,
      "booking_status": "pending_verification",
      "needs_review": false,
      "review_reason": null
    }
  ]
}
```

---

### 6️⃣ Verify Payment

```bash
curl -X PATCH http://localhost:3000/api/bookings/1/verify-payment
```

**Expected Response:**

```json
{
  "message": "Payment verified successfully",
  "booking": {
    "id": 1,
    "booking_status": "confirmed"
  }
}
```

---

### 7️⃣ Cancel a Booking

```bash
curl -X DELETE http://localhost:3000/api/bookings/1/cancel
```

**Expected Response:**

```json
{
  "message": "Booking cancelled successfully"
}
```

---

## Test with Postman

### Import Collection

1. Open Postman
2. Create a new Collection: `Kasi Booking API`
3. Add requests:

| Method | URL                                          | Body Type |
| ------ | -------------------------------------------- | --------- |
| GET    | `{{BASE_URL}}/api/bookings`                  | None      |
| GET    | `{{BASE_URL}}/api/bookings/review`           | None      |
| GET    | `{{BASE_URL}}/api/reference-members`         | None      |
| GET    | `{{BASE_URL}}/api/seat-map/1`                | None      |
| POST   | `{{BASE_URL}}/api/book-ticket`               | form-data |
| PATCH  | `{{BASE_URL}}/api/bookings/1/verify-payment` | None      |
| DELETE | `{{BASE_URL}}/api/bookings/1/cancel`         | None      |

Set environment variable: `BASE_URL = http://localhost:3000`

---

## Test with JavaScript Fetch

```javascript
// Test GET endpoint
const getAllBookings = async () => {
  const response = await fetch("http://localhost:3000/api/bookings");
  const data = await response.json();
  console.log(data);
};

// Test POST with file upload
const bookTicket = async () => {
  const formData = new FormData();
  formData.append("name", "John Doe");
  formData.append("phone", "9876543210");
  formData.append("aadhaar_number", "1234567890123456");
  formData.append("gender", "male");
  formData.append("age", "35");
  formData.append("seat_preference", "lower");
  formData.append("reference_name", "REF001");
  formData.append("group_members", "[]");
  // Add files
  formData.append("aadhaar", fileInput1.files[0]);
  formData.append("payment_proof", fileInput2.files[0]);

  const response = await fetch("http://localhost:3000/api/book-ticket", {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  console.log(data);
};

// Test PATCH
const verifyPayment = async (bookingId) => {
  const response = await fetch(
    `http://localhost:3000/api/bookings/${bookingId}/verify-payment`,
    { method: "PATCH" },
  );
  const data = await response.json();
  console.log(data);
};

// Test DELETE
const cancelBooking = async (bookingId) => {
  const response = await fetch(
    `http://localhost:3000/api/bookings/${bookingId}/cancel`,
    { method: "DELETE" },
  );
  const data = await response.json();
  console.log(data);
};

// Run tests
getAllBookings();
```

---

## Test Database Connection

```bash
# Create a simple test script
echo "SELECT NOW();" | psql $DATABASE_URL
```

If this works, your database is connected.

---

## Troubleshooting

### 404 Error

- Check the endpoint URL matches the pattern
- Restart dev server: `npm run dev`

### 500 Error

- Check `/api/bookings` first (should return 500 only if DB not connected)
- Check `.env.local` has `DATABASE_URL`
- Check PostgreSQL is running

### File Upload Fails

- Ensure file paths are correct: `@./path/to/file`
- Check Supabase credentials in `.env.local`
- Check file size limits

### TypeScript Errors

- Run `npm install @types/pg @types/node`
- Run `npm run type-check`

---

## Performance Tips

### Check Response Time

```bash
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/bookings
```

Create `curl-format.txt`:

```
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
```

### Monitor Database

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Check active connections
SELECT * FROM pg_stat_activity;

# Check table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_stat_user_tables;
```

---

## Batch Testing Script

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "Testing Kasi Booking API"
echo "========================"

# Test 1
echo -e "\n1️⃣ Testing GET /api/bookings"
curl -s "${BASE_URL}/bookings" | jq .

# Test 2
echo -e "\n2️⃣ Testing GET /api/bookings/review"
curl -s "${BASE_URL}/bookings/review" | jq .

# Test 3
echo -e "\n3️⃣ Testing GET /api/reference-members"
curl -s "${BASE_URL}/reference-members" | jq .

# Test 4
echo -e "\n4️⃣ Testing GET /api/seat-map/1"
curl -s "${BASE_URL}/seat-map/1" | jq .

echo -e "\n✅ All read tests completed!"
```

Save as `test-api.sh`, then run:

```bash
chmod +x test-api.sh
./test-api.sh
```

---

## Success Indicators

✅ All endpoints respond (no 404)
✅ Database queries return data
✅ File uploads work
✅ Transactions complete successfully
✅ Response times < 500ms
✅ No TypeScript errors
✅ All status codes correct

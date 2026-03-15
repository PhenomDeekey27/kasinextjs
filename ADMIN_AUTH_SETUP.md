# Admin Authentication Setup Guide

## Phase 2 Implementation: Supabase Admin Authentication

This phase implements secure admin authentication using Supabase Auth.

### **Environment Variables Required**

Add these to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these values from your Supabase project dashboard.

---

### **Step 1: Set Up Supabase Project**

1. Go to [supabase.com](https://supabase.com)
2. Create a new project or use existing one
3. Copy project URL and API keys
4. Enable Email/Password authentication in Authentication settings

---

### **Step 2: Create Admin Users Table**

In Supabase SQL Editor, run:

```sql
-- Create admin_users table to track which auth users are admins
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR,
  role VARCHAR DEFAULT 'admin',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_email ON admin_users(email);
```

---

### **Step 3: Create Admin Users**

In Supabase Auth section:

1. Go to Authentication → Users
2. Click "Create new user"
3. Enter email (e.g., `admin@jtourism.com`)
4. Set password
5. Check "Auto confirm sign up"

Then in SQL Editor, add to admin_users table:

```sql
INSERT INTO admin_users (user_id, email, full_name, role)
VALUES (
  'USER_UUID_FROM_AUTH',
  'admin@jtourism.com',
  'Admin User',
  'admin'
);
```

Replace `USER_UUID_FROM_AUTH` with the user ID from Supabase Auth.

---

### **Step 4: Verify Authentication Works**

Test login at: `http://localhost:3000/admin/login`

**Test Credentials:**
- Email: `admin@jtourism.com` (your admin email)
- Password: (password you set)

---

### **Security Features Implemented**

✅ **Middleware Protection**
- All `/admin/*` routes protected by middleware
- Redirects unauthenticated users to login with redirect URL

✅ **Secure Cookies**
- Auth token stored in httpOnly cookie (not accessible via JS)
- Cookie secured with SameSite and Secure flags
- 7-day expiration

✅ **Session Validation**
- `/api/auth/me` endpoint validates session
- Admin layout checks auth on load

✅ **Role-based Access**
- `isAdmin()` function checks admin status
- Can extend for different admin roles later

---

### **Files Added**

1. **`middleware.ts`** - Route protection
2. **`lib/supabase.ts`** - Supabase client initialization
3. **`lib/services/authService.ts`** - Auth helper functions
4. **`app/api/auth/login/route.ts`** - Login endpoint
5. **`app/api/auth/logout/route.ts`** - Logout endpoint
6. **`app/api/auth/me/route.ts`** - Current user check

### **Files Updated**

1. **`app/admin/login/page.tsx`** - Real Supabase auth integration
2. **`app/admin/layout.tsx`** - User profile & logout button

---

### **Next Steps**

- Phase 3: Implement dashboard stats API
- Phase 4: Create advanced bookings table with filters
- Phase 5: Add payment verification system

---

### **Troubleshooting**

**"Login failed" error:**
- Check EMAIL exists in Supabase Auth
- Verify password is correct
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and keys are correct in `.env.local`

**Redirects to login after logging in:**
- Supabase cookie not being set properly
- Check browser cookies are enabled
- Verify secure cookie settings match your environment (dev vs prod)

**"Not authenticated" on protected routes:**
- Cookie may have expired (7 days)
- Clear browser cookies and login again
- Check middleware.ts is in root of project

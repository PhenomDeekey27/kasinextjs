import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client (for API routes)
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Client-side Supabase client (for browser)
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// Helper to get current admin session (server-side)
export async function getAdminSession(token?: string) {
  try {
    const { data, error } = await supabaseServer.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
  } catch (error) {
    return null;
  }
}

// Helper to verify admin role
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseServer
      .from("admin_users")
      .select("id")
      .eq("user_id", userId)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, getAdminSession } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get("sb-auth-token")?.value;

    if (!authToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get user from token
    const { data, error } = await supabaseServer.auth.getUser(authToken);

    if (error || !data.user) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: data.user,
      authenticated: true,
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { initDatabase } from "@/lib/init-db";

export async function GET() {
  try {
    await initDatabase();

    return NextResponse.json({
      status: "Database initialized successfully",
    });
  } catch (error) {
    console.error("Init DB API failed:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : undefined;

    return NextResponse.json(
      {
        status: "Database initialization failed",
        error: message,
        code,
        hint: "Ensure DATABASE_URL is set in root .env.local and the database host/port are reachable.",
      },
      { status: 500 },
    );
  }
}

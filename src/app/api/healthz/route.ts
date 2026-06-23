import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: Date.now() },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

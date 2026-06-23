import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BUILD_SHA = process.env.VERCEL_GIT_COMMIT_SHA ?? "dev";
const BUILD_TIME = new Date().toISOString();

export function GET() {
  return NextResponse.json(
    {
      name: "perler-beads",
      version: "0.1.0",
      sha: BUILD_SHA,
      buildTime: BUILD_TIME,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

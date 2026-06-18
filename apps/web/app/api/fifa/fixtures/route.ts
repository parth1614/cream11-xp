import { NextResponse } from "next/server";
import { getFifaFixtureDays } from "@/lib/fifa";

export async function GET() {
  try {
    const days = await getFifaFixtureDays();

    return NextResponse.json({
      source: "fifa-fantasy-public-json",
      days,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "fixtures_fetch_failed",
        detail: error instanceof Error ? error.message : "Unknown FIFA fixtures error",
      },
      { status: 500 },
    );
  }
}

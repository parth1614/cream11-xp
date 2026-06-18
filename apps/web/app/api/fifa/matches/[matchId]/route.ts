import { NextResponse } from "next/server";
import { getFifaMatchDetails } from "@/lib/fifa";

type RouteContext = {
  params: Promise<{
    matchId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { matchId } = await context.params;
  const numericMatchId = Number(matchId);

  if (!Number.isFinite(numericMatchId)) {
    return NextResponse.json(
      {
        error: "invalid_match_id",
        detail: "Match id must be numeric.",
      },
      { status: 400 },
    );
  }

  try {
    const match = await getFifaMatchDetails(numericMatchId);

    if (!match) {
      return NextResponse.json(
        {
          error: "match_not_found",
          detail: `No FIFA match was found for id ${numericMatchId}.`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      {
        error: "match_fetch_failed",
        detail: error instanceof Error ? error.message : "Unknown FIFA match error",
      },
      { status: 500 },
    );
  }
}

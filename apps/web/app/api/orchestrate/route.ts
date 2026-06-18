import { NextResponse } from "next/server";
import { runOrchestration } from "@/lib/orchestrator";
import { loadSkillDocs } from "@/lib/skills";
import { loadTeamMemoryDocs } from "@/lib/team-memory";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      key?: string;
      model?: string;
      platformId?: string;
      query?: string;
      teamNames?: string[];
    };

    if (!body.query?.trim()) {
      return NextResponse.json(
        { error: "A terminal query is required." },
        { status: 400 },
      );
    }

    const skills = await loadSkillDocs();
    const teamMemoryDocs = await loadTeamMemoryDocs(body.teamNames ?? []);
    const result = await runOrchestration(
      {
        key: body.key?.trim(),
        model: body.model?.trim(),
        platformId: body.platformId?.trim() || "fifa",
        query: body.query.trim(),
        teamNames: body.teamNames ?? [],
      },
      skills,
      teamMemoryDocs,
    );

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown orchestration error";

    return NextResponse.json(
      {
        error: "The terminal failed to complete the orchestration request.",
        detail: message,
      },
      { status: 500 },
    );
  }
}

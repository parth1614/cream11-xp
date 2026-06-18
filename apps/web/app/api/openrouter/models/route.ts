import { NextResponse } from "next/server";
import { FALLBACK_MODELS, fetchOpenRouterModels } from "@/lib/openrouter-models";

export const runtime = "nodejs";

export async function GET() {
  try {
    const models = await fetchOpenRouterModels();
    return NextResponse.json({ models, source: "openrouter" });
  } catch {
    return NextResponse.json({ models: FALLBACK_MODELS, source: "fallback" });
  }
}

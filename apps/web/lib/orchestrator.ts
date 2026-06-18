import type { SkillDoc } from "./skills";
import { getPlatformConfig } from "./platforms";
import type { TeamMemoryDoc } from "./team-memory";

export type OrchestrationRequest = {
  key?: string;
  model?: string;
  query: string;
  platformId: string;
  teamNames?: string[];
};

export type OrchestrationResponse = {
  mode: "openrouter" | "demo";
  model: string;
  headline: string;
  summary: string;
  recommendation: string[];
  risks: string[];
  nextChecks: string[];
  loadedSkills: string[];
  raw?: string;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "~openai/gpt-latest";
const ORCHESTRATION_RESPONSE_SCHEMA = {
  name: "cream11xp_terminal_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      headline: {
        type: "string",
        description: "One concise terminal headline for the current run.",
      },
      summary: {
        type: "string",
        description: "A short, direct explanation of the current terminal conclusion.",
      },
      recommendation: {
        type: "array",
        description: "Primary actions or recommendations for the user.",
        items: {
          type: "string",
        },
      },
      risks: {
        type: "array",
        description: "The main reasons this recommendation could fail or stay unresolved.",
        items: {
          type: "string",
        },
      },
      nextChecks: {
        type: "array",
        description: "Concrete next checks the swarm should run or refresh.",
        items: {
          type: "string",
        },
      },
    },
    required: ["headline", "summary", "recommendation", "risks", "nextChecks"],
    additionalProperties: false,
  },
} as const;

function buildSystemPrompt(
  skills: SkillDoc[],
  platformId: string,
  teamMemoryDocs: TeamMemoryDoc[],
) {
  const skillBlocks = skills
    .map(
      (skill) =>
        `## ${skill.name}\nDescription: ${skill.description}\n${skill.body}`,
    )
    .join("\n\n");
  const teamMemoryBlock = teamMemoryDocs.length
    ? [
        "Relevant national-team memory files are loaded below. Treat them as durable context, refresh stale current-cycle facts when newer evidence is present, and do not invent historical details that are missing.",
        ...teamMemoryDocs.map(
          (doc) => `### Team memory: ${doc.teamName}\n${doc.body}`,
        ),
      ].join("\n\n")
    : "No team-specific markdown memory files were loaded for this run.";
  const platform = getPlatformConfig(platformId);

  return [
    "You are Cream11 XP, a football intelligence orchestration layer.",
    "Act like a serious operator inside a sports decision terminal.",
    "Be specific, compact, and evidence-aware.",
    "Do not use hype language or generic AI phrasing.",
    `The active terminal is ${platform.label}.`,
    `Platform descriptor: ${platform.descriptor}.`,
    `Relevant market types: ${platform.marketTypes.join(", ")}.`,
    `Relevant prediction lanes: ${platform.predictionLanes.join(", ")}.`,
    "If the user asks broad product questions, answer in product/operator terms.",
    "If the user asks for predictions or fantasy guidance, be explicit about uncertainty and what information is missing.",
    "Return output that matches the supplied JSON schema exactly.",
    "These markdown skill files describe the operating playbooks you should follow:",
    skillBlocks,
    "Relevant team memory context:",
    teamMemoryBlock,
  ].join("\n\n");
}

function sanitizeJsonPayload(payload: string) {
  const fenced = payload.match(/```json\n([\s\S]*?)\n```/i);
  return fenced ? fenced[1] : payload;
}

function parseModelOutput(payload: string) {
  const cleaned = sanitizeJsonPayload(payload);
  const parsed = JSON.parse(cleaned) as {
    headline?: string;
    summary?: string;
    recommendation?: string[];
    risks?: string[];
    nextChecks?: string[];
  };

  const recommendation = Array.isArray(parsed.recommendation)
    ? parsed.recommendation.filter((item): item is string => typeof item === "string")
    : [];
  const risks = Array.isArray(parsed.risks)
    ? parsed.risks.filter((item): item is string => typeof item === "string")
    : [];
  const nextChecks = Array.isArray(parsed.nextChecks)
    ? parsed.nextChecks.filter((item): item is string => typeof item === "string")
    : [];

  return {
    headline:
      typeof parsed.headline === "string" ? parsed.headline : "Terminal response ready",
    summary:
      typeof parsed.summary === "string"
        ? parsed.summary
        : "The orchestration layer produced a response, but the summary field was empty.",
    recommendation,
    risks,
    nextChecks,
  };
}

function buildDemoResponse(
  query: string,
  skills: SkillDoc[],
  platformId: string,
): OrchestrationResponse {
  const platform = getPlatformConfig(platformId);

  return {
    mode: "demo",
    model: "demo/local-fallback",
    headline: `${platform.label} terminal demo run`,
    summary:
      `No OpenRouter key was supplied, so the ${platform.label} terminal returned a local fallback response shaped by the repo's skill playbooks.`,
    recommendation: [
      `Treat "${query}" as the active ${platform.label} decision lane and break it into research, projection, and risk passes.`,
      "Start with official squad, lineup, and fixture sources before bringing in market or community signal.",
      "Return one primary recommendation and at least one lower-confidence alternative with an explicit invalidation trigger.",
    ],
    risks: [
      "This response is local scaffolding, not a model-backed analysis.",
      "Live match, player, or market context has not been fetched yet.",
      "No personalized model routing or search-provider signal was applied.",
    ],
    nextChecks: [
      "Paste an OpenRouter key and rerun the query.",
      "Connect fixture, player, and pricing ingestion next.",
      "Add Firecrawl-backed evidence retrieval before trusting production recommendations.",
    ],
    loadedSkills: skills.map((skill) => skill.slug),
  };
}

export async function runOrchestration(
  request: OrchestrationRequest,
  skills: SkillDoc[],
  teamMemoryDocs: TeamMemoryDoc[],
): Promise<OrchestrationResponse> {
  if (!request.key) {
    return buildDemoResponse(request.query, skills, request.platformId);
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${request.key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://cream11-xp.local",
      "X-OpenRouter-Title": "Cream11 XP",
    },
    body: JSON.stringify({
      model: request.model || DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(skills, request.platformId, teamMemoryDocs),
        },
        {
          role: "user",
          content: request.query,
        },
      ],
      provider: {
        require_parameters: true,
      },
      response_format: {
        type: "json_schema",
        json_schema: ORCHESTRATION_RESPONSE_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const failureText = await response.text();

    return {
      ...buildDemoResponse(request.query, skills, request.platformId),
      headline: "OpenRouter request failed",
      summary:
        "The terminal fell back to demo mode because the OpenRouter request did not succeed.",
      risks: [
        `HTTP ${response.status}: ${failureText.slice(0, 180)}`,
        "The provided model slug or API key may be invalid.",
        "No live model output was returned for this run.",
      ],
    };
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
    model?: string;
  };

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    return {
      ...buildDemoResponse(request.query, skills, request.platformId),
      headline: "Empty model response",
      summary:
        "OpenRouter returned successfully, but there was no usable message content to render.",
      risks: [
        "The upstream model did not return a standard chat-completions payload.",
        "The prompt may need a stricter output contract.",
      ],
    };
  }

  const parsed = parseModelOutput(content);

  return {
    mode: "openrouter",
    model: payload.model ?? request.model ?? DEFAULT_MODEL,
    headline: parsed.headline,
    summary: parsed.summary,
    recommendation: parsed.recommendation,
    risks: parsed.risks,
    nextChecks: parsed.nextChecks,
    loadedSkills: skills.map((skill) => skill.slug),
    raw: content,
  };
}

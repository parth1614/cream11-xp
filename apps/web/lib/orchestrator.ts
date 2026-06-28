import type { SkillDoc } from "./skills";
import { getPlatformConfig } from "./platforms";
import type { TeamMemoryDoc } from "./team-memory";

export type OrchestrationRequest = {
  key?: string;
  model?: string;
  query: string;
  platformId: string;
  teamNames?: string[];
  currentDateIso?: string;
  evidenceScore?: number;
};

export type OrchestrationResponse = {
  mode: "openrouter" | "demo";
  model: string;
  headline: string;
  summary: string;
  primaryCall: string;
  confidence: number;
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
      primaryCall: {
        type: "string",
        description:
          "One explicit action-oriented call. It should sound like a decision, not a topic label.",
      },
      confidence: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description:
          "Confidence score from 0 to 100 for the primary call, based only on the supplied evidence.",
      },
      recommendation: {
        type: "array",
        description:
          "Exactly 3 concrete recommendations. Use them for the best angle, the best supporting angle, and the best avoid-or-pivot angle.",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "string",
        },
      },
      risks: {
        type: "array",
        description:
          "Exactly 3 concrete failure modes for the primary call. No vague macro filler.",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "string",
        },
      },
      nextChecks: {
        type: "array",
        description:
          "Exactly 3 refresh checks that could materially change the primary call.",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "string",
        },
      },
    },
    required: [
      "headline",
      "summary",
      "primaryCall",
      "confidence",
      "recommendation",
      "risks",
      "nextChecks",
    ],
    additionalProperties: false,
  },
} as const;

function buildPlatformDecisionRules(platformId: string) {
  switch (platformId) {
    case "fifa":
      return [
        "For FIFA Fantasy, recommendations must name players or roster actions whenever the supplied context supports it.",
        "The primary call should usually be a captain, core-stack, fade, or roster-construction stance.",
        "Do not say 'monitor' or 'prepare' as the main recommendation. Commit to a build direction first.",
      ].join("\n");
    case "kalshi":
      return [
        "For Kalshi, the primary call must be one of: take YES lean, take NO lean, wait/no-trade.",
        "If there is not enough evidence for a trade, say no-trade explicitly instead of inventing edge.",
        "Do not describe the market as 'complex' without converting that into a tradable or no-trade stance.",
      ].join("\n");
    case "polymarket":
      return [
        "For Polymarket, the primary call must be one of: buy, avoid, wait for repricing, or no-trade.",
        "Tie every recommendation to a concrete event angle, player angle, or market-pricing angle.",
        "Do not output broad narrative commentary without a clear trading stance.",
      ].join("\n");
    case "stake":
      return [
        "For Stake-style betting, the primary call must be one of: back side A, back side B, back totals angle, back player angle, or pass.",
        "Use explicit bet framing instead of general match commentary.",
        "If the evidence is thin, return pass/no-bet clearly.",
      ].join("\n");
    default:
      return "Return a concrete decision instead of a vague analytical summary.";
  }
}

function monthNameToIndex(month: string) {
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  return months.indexOf(month.toLowerCase());
}

function containsPastDateReference(text: string, currentDate: Date) {
  const patterns = [
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi,
    /\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const monthToken = typeof match[1] === "string" && isNaN(Number(match[1])) ? match[1] : match[2];
      const dayToken = typeof match[1] === "string" && isNaN(Number(match[1])) ? match[2] : match[1];
      const monthIndex = monthNameToIndex(monthToken);
      const day = Number(dayToken);

      if (monthIndex < 0 || !Number.isFinite(day)) {
        continue;
      }

      const referenced = new Date(Date.UTC(currentDate.getUTCFullYear(), monthIndex, day));

      if (referenced.getTime() < Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate(),
      )) {
        return true;
      }
    }
  }

  return false;
}

function normalizeChecklist(
  items: string[],
  currentDate: Date,
  fallbacks: string[],
) {
  const cleaned = items.filter((item) => !containsPastDateReference(item, currentDate)).slice(0, 3);

  for (const fallback of fallbacks) {
    if (cleaned.length >= 3) {
      break;
    }

    cleaned.push(fallback);
  }

  return cleaned.slice(0, 3);
}

function buildSystemPrompt(
  skills: SkillDoc[],
  platformId: string,
  teamMemoryDocs: TeamMemoryDoc[],
  currentDateIso: string,
  evidenceScore: number,
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
    "Be specific, compact, evidence-aware, and decisional.",
    "Do not use hype language or generic AI phrasing.",
    `Current UTC date/time: ${currentDateIso}.`,
    "Treat this as the authoritative current time for the run.",
    `Evidence density score for this run: ${evidenceScore}/100.`,
    `The active terminal is ${platform.label}.`,
    `Platform descriptor: ${platform.descriptor}.`,
    `Relevant market types: ${platform.marketTypes.join(", ")}.`,
    `Relevant prediction lanes: ${platform.predictionLanes.join(", ")}.`,
    "If the user asks broad product questions, answer in product/operator terms.",
    "If the user asks for predictions or fantasy guidance, be explicit about uncertainty and what information is missing, but still make the strongest evidence-backed call available.",
    "Only use facts that are present in the supplied match context, skill docs, or loaded team memory. Do not invent weather, historical resilience, tactical flexibility, market prices, or hidden lineup news if they were not provided.",
    "Never use placeholder text from team memory as real evidence.",
    "Never tell the user to wait for, monitor, or evaluate an event whose date is already in the past relative to the current run time.",
    "If loaded team memory contains future-fixture notes that are now in the past, treat them as stale and ignore them.",
    "Calibrate confidence to the evidence density. Rich, aligned official data should generally produce medium-high confidence unless the signals clearly conflict.",
    "Do not stay stuck in the 50s or 60s if the evidence packet is strong and the primary call is explicit.",
    "Bad output examples: 'complexity analysis', 'monitor this', 'prepare for volatility', 'high-variance clash', 'keep an eye on'.",
    "Good output style: one primary call, one confidence score, three sharp recommendations, three real failure modes, three concrete flip checks.",
    buildPlatformDecisionRules(platformId),
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
    primaryCall?: string;
    confidence?: number;
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
    primaryCall:
      typeof parsed.primaryCall === "string" ? parsed.primaryCall : "No explicit call returned.",
    confidence:
      typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
        ? Math.max(0, Math.min(100, Math.round(parsed.confidence)))
        : 50,
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
    primaryCall: "No live model call yet. Add an OpenRouter key before trusting the terminal.",
    confidence: 15,
    recommendation: [
      `Primary lane: treat "${query}" as the active ${platform.label} decision and force one explicit call.`,
      "Use the active match context first, then support or reject the call with player and fixture evidence.",
      "If evidence is thin, return pass/no-trade instead of pretending there is edge.",
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
  const currentDateIso = request.currentDateIso ?? new Date().toISOString();
  const evidenceScore =
    typeof request.evidenceScore === "number" && Number.isFinite(request.evidenceScore)
      ? Math.max(0, Math.min(100, Math.round(request.evidenceScore)))
      : 50;

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
          content: buildSystemPrompt(
            skills,
            request.platformId,
            teamMemoryDocs,
            currentDateIso,
            evidenceScore,
          ),
        },
        {
          role: "user",
          content: request.query,
        },
      ],
      provider: {
        require_parameters: true,
      },
      temperature: 0.2,
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
      primaryCall: "No live call available because the OpenRouter request failed.",
      confidence: 0,
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
      primaryCall: "No explicit call available because the model returned empty content.",
      confidence: 0,
      risks: [
        "The upstream model did not return a standard chat-completions payload.",
        "The prompt may need a stricter output contract.",
      ],
    };
  }

  const parsed = parseModelOutput(content);
  const currentDate = new Date(currentDateIso);
  const fallbackChecks = [
    "Recheck confirmed lineups and role changes 45 to 60 minutes before kickoff.",
    "Refresh the latest injury, suspension, and starter status for both teams.",
    "Re-run the call if any major player or market assumption changes before kickoff.",
  ];
  const fallbackRecommendations = [
    "Anchor the decision in the current match context instead of stale prior-fixture references.",
    "Prefer explicit player, side, or no-trade calls over soft narrative commentary.",
    "Downgrade confidence immediately if the live lineup or role assumptions break.",
  ];
  const minConfidenceFromEvidence =
    evidenceScore >= 85 ? 78 : evidenceScore >= 75 ? 72 : evidenceScore >= 65 ? 66 : 0;
  const normalizedConfidence =
    /no-trade|pass|avoid|wait/i.test(parsed.primaryCall) && parsed.confidence < minConfidenceFromEvidence
      ? parsed.confidence
      : Math.max(parsed.confidence, minConfidenceFromEvidence);

  return {
    mode: "openrouter",
    model: payload.model ?? request.model ?? DEFAULT_MODEL,
    headline: parsed.headline,
    summary: parsed.summary,
    primaryCall: parsed.primaryCall,
    confidence: normalizedConfidence,
    recommendation: normalizeChecklist(parsed.recommendation, currentDate, fallbackRecommendations),
    risks: parsed.risks,
    nextChecks: normalizeChecklist(parsed.nextChecks, currentDate, fallbackChecks),
    loadedSkills: skills.map((skill) => skill.slug),
    raw: content,
  };
}

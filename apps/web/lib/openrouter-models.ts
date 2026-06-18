export type OpenRouterModel = {
  id: string;
  name: string;
  description: string;
  contextLength: number | null;
  promptPrice: string | null;
  completionPrice: string | null;
  supportsStructuredOutputs: boolean;
};

type ModelsApiResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    description?: string;
    context_length?: number;
    pricing?: {
      prompt?: string;
      completion?: string;
    };
    supported_parameters?: string[];
  }>;
};

export const FALLBACK_MODELS: OpenRouterModel[] = [
  {
    id: "~openai/gpt-latest",
    name: "OpenAI Latest",
    description: "OpenRouter alias for the latest OpenAI flagship model.",
    contextLength: null,
    promptPrice: null,
    completionPrice: null,
    supportsStructuredOutputs: true,
  },
  {
    id: "openai/gpt-4.1",
    name: "GPT-4.1",
    description: "Reliable OpenAI general-purpose model with structured outputs support.",
    contextLength: null,
    promptPrice: null,
    completionPrice: null,
    supportsStructuredOutputs: true,
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "Fast multimodal OpenAI model commonly used for structured app responses.",
    contextLength: null,
    promptPrice: null,
    completionPrice: null,
    supportsStructuredOutputs: true,
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    description: "Anthropic reasoning model with current structured output support.",
    contextLength: null,
    promptPrice: null,
    completionPrice: null,
    supportsStructuredOutputs: true,
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "High-capability Gemini model for structured orchestration responses.",
    contextLength: null,
    promptPrice: null,
    completionPrice: null,
    supportsStructuredOutputs: true,
  },
];

export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      "HTTP-Referer": "https://cream11-xp.local",
      "X-OpenRouter-Title": "Cream11 XP",
    },
    next: {
      revalidate: 3600,
    },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter models request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as ModelsApiResponse;
  const models =
    payload.data?.map((model) => ({
      id: model.id ?? "unknown-model",
      name: model.name ?? model.id ?? "Unknown model",
      description: model.description ?? "",
      contextLength: model.context_length ?? null,
      promptPrice: model.pricing?.prompt ?? null,
      completionPrice: model.pricing?.completion ?? null,
      supportsStructuredOutputs:
        model.supported_parameters?.includes("response_format") ?? false,
    })) ?? [];

  const structuredModels = models
    .filter((model) => model.supportsStructuredOutputs)
    .sort((left, right) => left.name.localeCompare(right.name));

  return structuredModels.length ? structuredModels : FALLBACK_MODELS;
}

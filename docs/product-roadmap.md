# Product Roadmap

## Vision

Build an open-source AI decision terminal for football fantasy and sports prediction workflows. The interface should look advanced, data-rich, and technical, while the user flow stays simple: understand the event, inspect the signals, review the agent consensus, and act confidently.

## Product thesis

- Most users do not need raw model output; they need ranked, explainable choices.
- A swarm of narrow agents usually beats one generic assistant on volatile sports decisions.
- The winning product is not only "more predictions" but "better decision support under uncertainty."
- Open-source distribution can create fast trust, contributions, and distribution if the system is transparent and modular.
- The fastest onboarding path is bring-your-own-key: users enter their own OpenRouter key and use the product immediately.

## MVP outcome

The first version should help a user answer:

- What is the best squad or lineup for this slate?
- Which picks are strongest, weakest, and most fragile?
- Which assumptions drive those picks?
- What changed since the last refresh?

## Primary use cases

### 1. Fantasy squad builder

- Input budget, contest rules, and slate.
- Recommend a best squad plus 2-3 variants.
- Explain captain/vice-captain logic, upside, and risk.

### 2. Match prediction cockpit

- Summarize expected match dynamics.
- Surface consensus probabilities from multiple agents.
- Flag injuries, rotation risk, travel, weather, and late news.

### 3. Market analysis layer

- Compare internal probability estimates with market-implied odds.
- Highlight where the model thinks a market may be overpriced or underpriced.
- Keep compliance and platform policy boundaries explicit.

## Onboarding model

- Users paste an `OPENROUTER_API_KEY`.
- Optional advanced settings can later accept search-provider keys.
- The default product experience should work with one key and sensible defaults.
- The terminal should feel powerful, but setup should feel nearly instant.

## Product pillars

### Terminal feel, consumer simplicity

- Dense information layout.
- Clear command-center aesthetics.
- Guided actions, not confusing power-user flows.

### Multi-agent by design

- Research agents gather evidence.
- Modeling agents turn evidence into estimates.
- Debate agents challenge assumptions.
- Risk agents identify weak reasoning and stale data.
- Portfolio agents convert ranked picks into actionable combinations.

### Self-improving system

- Store decisions, confidence, inputs, and outcomes.
- Score agents after events settle.
- Reweight prompts, sources, and models based on observed performance.

## Phase plan

### Phase 0: Foundation

- Write product and system specs.
- Define repo structure, contribution norms, and runtime-agnostic skill files.
- Choose the initial tech stack and key strategy.

### Phase 1: Football fantasy MVP

- Bring-your-own-key onboarding flow.
- Fixture and player data ingestion.
- Player signal normalization.
- Squad optimizer with explainable constraints.
- Terminal-style dashboard.

### Phase 2: Swarm orchestration

- Role-based agents.
- Agent memory and experiment logs.
- Evaluator loop and model comparison.
- Prompt/version registry.

### Phase 3: Community and scale

- Public benchmarks.
- Pluggable data connectors.
- Contributor templates for sources, agents, and tests.
- Shared scenario replay datasets.

## Initial stack recommendation

- Frontend: Next.js with TypeScript.
- UI: Tailwind plus a small design token system.
- Backend: Node/TypeScript for orchestration services.
- LLM gateway: OpenRouter.
- Search and crawling: Firecrawl first, Exa as an optional higher-precision search adapter later.
- Jobs: queue-backed workers for crawling, enrichment, and backtests.
- Storage: Postgres for structured entities, object storage for raw artifacts.
- Search: pgvector or equivalent vector index for evidence retrieval.

## Non-goals for the first build

- Cover every sport immediately.
- Build unrestricted scraping against hostile or protected targets.
- Automate financial execution.
- Pretend uncertainty does not exist.

## Guardrails

- Keep source provenance on every material claim.
- Prefer official and licensed data where possible.
- Respect site terms, robots guidance, and legal constraints.
- Separate "forecast" from "fact."

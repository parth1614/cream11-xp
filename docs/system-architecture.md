# System Architecture

## Core idea

The platform should behave like an orchestration layer over a collection of specialized agents, tools, and data pipelines. It is not one chatbot. It is a repeatable research-and-decision engine.

## Top-level components

### 0. Runtime and key layer

Responsibilities:

- Accept user-supplied `OPENROUTER_API_KEY`.
- Store secrets safely and scope them to the user session or workspace.
- Provide one unified model gateway to all agents.
- Support optional provider-specific keys later without changing agent prompts.

Recommended first principle:

- One key should be enough to start using the product.

### 1. Ingestion layer

Responsibilities:

- Pull structured sports data.
- Collect articles, injury updates, lineups, and social/news signals.
- Normalize timestamps, entities, and source provenance.
- Cache raw documents and parsed summaries.

Suggested modules:

- `connectors/official-data`
- `connectors/firecrawl-search`
- `connectors/firecrawl-crawl`
- `connectors/news-and-blogs`
- `connectors/market-data`
- `connectors/community-signals`

Recommended adapter strategy:

- Start with Firecrawl for both search and scrape workflows.
- Keep a provider abstraction so Exa can be added later for premium search quality or side-by-side evaluation.

### 2. Knowledge and evidence layer

Responsibilities:

- Resolve teams, players, competitions, and fixtures.
- Store evidence with source, confidence, and freshness metadata.
- Support retrieval for agents and UI explanations.

Data model primitives:

- event
- team
- player
- market
- signal
- source
- recommendation
- evaluation

### 3. Agent swarm layer

Recommended initial agent roles:

- Research Scout
- Fixture Context Analyst
- Player Projection Analyst
- Risk and Rotation Analyst
- Market Edge Analyst
- Squad Constructor
- Debate Critic
- Final Synthesizer

Each agent should emit:

- `thesis`
- `evidence`
- `confidence`
- `assumptions`
- `staleness_risk`
- `machine_readable_output`

### 4. Orchestrator

Responsibilities:

- Decide which agents to invoke.
- Route the right context to each agent.
- Merge structured outputs.
- Trigger critique and retry loops when confidence is low or disagreement is high.
- Persist run traces for evaluation.
- Load markdown skill files and inject the relevant guidance into agent prompts.

Key loop:

1. Gather fresh context.
2. Invoke role agents.
3. Run disagreement analysis.
4. Re-query weak areas.
5. Build final recommendation package.
6. Store outputs for later scoring.

### 5. Evaluation layer

Responsibilities:

- Track prediction accuracy and calibration.
- Compare agent versions and prompt variants.
- Identify useful sources and noisy sources.
- Rank models by outcome quality, not style.

### 6. Terminal frontend

Responsibilities:

- Display live slates, signals, and recommendations.
- Let users inspect why a squad or pick exists.
- Preserve a dramatic "terminal" visual language without harming usability.

## Data flow

1. Connectors ingest data into raw storage.
2. Parsers normalize entities and facts.
3. Evidence is indexed for retrieval.
4. Orchestrator runs agent swarm for a user query or scheduled slate.
5. Evaluator scores the outputs after results settle.
6. UI renders recommendations, explanations, diffs, and alerts.

## Self-improvement loop

- Save every run with versioned prompts, sources, models, and outputs.
- Save which skill files and prompt recipes were active for that run.
- After matches settle, attach outcomes and measure forecast quality.
- Increase weight for useful agents and sources.
- Decrease weight for stale or noisy pathways.
- Promote successful prompt/model combinations into default orchestration recipes.

## Repo shape to grow toward

```text
apps/
  web/
services/
  orchestrator/
  ingestion/
  evaluator/
packages/
  ui/
  schemas/
  prompts/
  agent-skills/
  data-clients/
connectors/
  official-data/
  firecrawl/
  news-and-blogs/
  markets/
docs/
skills/
```

## First technical milestone

Before building agent complexity, prove this narrow loop:

1. Ingest football fixture and player inputs.
2. Produce one explainable squad recommendation.
3. Show evidence and confidence in the UI.
4. Replay the same slate later for evaluation.

That milestone is small enough to ship and strong enough to validate the product direction.

## Skill runtime model

The files in `skills/` should be treated as shared agent instructions for all runtimes:

- local development agents,
- production orchestration workers,
- interactive website sessions,
- evaluation and backtest jobs.

They are project assets, not tool-specific metadata.

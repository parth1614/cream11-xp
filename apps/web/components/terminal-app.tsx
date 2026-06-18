"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { FifaFixtureDay, FifaMatchDetails } from "@/lib/fifa";
import type { OpenRouterModel } from "@/lib/openrouter-models";
import { PLATFORM_CONFIGS, getPlatformConfig } from "@/lib/platforms";
import type { PlatformConfig } from "@/lib/platforms";
import type { TerminalResponse } from "./terminal-types";

type StatCard = {
  id: "agents" | "sources" | "latency" | "router";
  label: string;
  value: string;
  tone: "good" | "neutral" | "warn";
  detailTitle: string;
  detailBody: string;
  detailItems: string[];
};

type FixtureMatch = FifaFixtureDay["matches"][number];

const fallbackModels: OpenRouterModel[] = [
  {
    id: "~openai/gpt-latest",
    name: "OpenAI Latest",
    description: "Latest OpenAI alias",
    contextLength: null,
    promptPrice: null,
    completionPrice: null,
    supportsStructuredOutputs: true,
  },
];

const initialResponse: TerminalResponse = {
  mode: "demo",
  model: "demo/local-fallback",
  headline: "Terminal awaiting first run",
  summary:
    "Select a World Cup fixture first, then route the same match context through the terminal you want to test.",
  recommendation: [
    "Start from one concrete fixture instead of a broad slate-level question.",
    "Switch between the four terminals to see how the same match maps to fantasy, bets, and prediction markets.",
    "Keep the output structured so each recommendation can be audited fast.",
  ],
  risks: [
    "Without a real key, responses stay in demo mode.",
    "Odds and external market books are still model-side, not live-ingested platform feeds.",
  ],
  nextChecks: [
    "Select a fixture on the board.",
    "Choose the terminal lens you want.",
    "Run the first match-specific prompt.",
  ],
  loadedSkills: [],
};

function getInitialPlatformId(): PlatformConfig["id"] {
  if (typeof window === "undefined") {
    return "fifa";
  }

  return (
    (window.localStorage.getItem("cream11xp.platform") as PlatformConfig["id"] | null) ??
    "fifa"
  );
}

function maskKey(key: string) {
  if (!key) {
    return "not configured";
  }

  if (key.length <= 10) {
    return `${key.slice(0, 3)}***`;
  }

  return `${key.slice(0, 7)}${"*".repeat(Math.max(key.length - 11, 8))}${key.slice(-4)}`;
}

function formatPrice(price: string | null) {
  if (!price) {
    return "n/a";
  }

  const numeric = Number(price);
  if (!Number.isFinite(numeric)) {
    return price;
  }

  return `$${numeric.toFixed(6)}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function buildMatchPrompt(platform: PlatformConfig, match: FifaMatchDetails) {
  const matchup = `${match.homeSquadName} vs ${match.awaySquadName}`;

  switch (platform.id) {
    case "fifa":
      return `Build me a ${platform.label} plan for ${matchup}. Use the current score context, top fantasy form, ownership, and price profile to give me the best captain, safest core plays, and one contrarian build.`;
    case "kalshi":
      return `For ${matchup}, what event-contract style angles would a ${platform.label} terminal evaluate first? Break it into base case, edge case, and no-trade case using the current match context.`;
    case "polymarket":
      return `For ${matchup}, map the strongest prediction-market style narratives a ${platform.label} terminal should test. Compare consensus intuition with what the current match and fantasy data actually support.`;
    case "stake":
      return `For ${matchup}, give me the cleanest sportsbook-style view a ${platform.label} terminal should take. Prioritize match winner, totals, and player-angle logic with explicit invalidation triggers.`;
    default:
      return `Analyze ${matchup} through the ${platform.label} terminal.`;
  }
}

function buildQuickPrompts(platform: PlatformConfig, match: FifaMatchDetails) {
  const matchup = `${match.homeSquadName} vs ${match.awaySquadName}`;

  switch (platform.id) {
    case "fifa":
      return [
        `Best captain call for ${matchup}`,
        `Safest three-player core for ${matchup}`,
        `Contrarian FIFA fantasy angle for ${matchup}`,
      ];
    case "kalshi":
      return [
        `Best event-contract framing for ${matchup}`,
        `What would invalidate a trade on ${matchup}?`,
        `Probability tree for ${matchup}`,
      ];
    case "polymarket":
      return [
        `Prediction-market edge check for ${matchup}`,
        `Consensus vs internal read on ${matchup}`,
        `No-trade checklist for ${matchup}`,
      ];
    case "stake":
      return [
        `Cleanest betting angle for ${matchup}`,
        `Same-game risk check for ${matchup}`,
        `Player prop logic for ${matchup}`,
      ];
    default:
      return platform.starterPrompts;
  }
}

function buildPlatformHeadline(platform: PlatformConfig, match: FifaMatchDetails | null) {
  if (!match) {
    return platform.heroTitle;
  }

  return `${platform.label} terminal for ${match.homeSquadAbbr} vs ${match.awaySquadAbbr}.`;
}

function getDefaultExpandedDayKeys(days: FifaFixtureDay[]) {
  if (!days.length) {
    return [];
  }

  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const expanded = days.filter((day) => day.dateKey >= todayKey).map((day) => day.dateKey);

  return expanded.length ? expanded : [days[days.length - 1].dateKey];
}

export function TerminalApp() {
  const [platformId, setPlatformId] = useState<PlatformConfig["id"]>(getInitialPlatformId);
  const [query, setQuery] = useState(() => getPlatformConfig(getInitialPlatformId()).starterPrompts[0]);
  const [key, setKey] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.localStorage.getItem("cream11xp.openrouterKey") ?? "";
  });
  const [model, setModel] = useState(() => {
    if (typeof window === "undefined") {
      return "~openai/gpt-latest";
    }

    return window.localStorage.getItem("cream11xp.model") ?? "~openai/gpt-latest";
  });
  const [models, setModels] = useState<OpenRouterModel[]>(fallbackModels);
  const [modelsSource, setModelsSource] = useState("fallback");
  const [response, setResponse] = useState<TerminalResponse>(initialResponse);
  const [error, setError] = useState("");
  const [lastRunLatencyMs, setLastRunLatencyMs] = useState<number | null>(null);
  const [activeStatId, setActiveStatId] = useState<StatCard["id"] | null>(null);
  const [fixtureDays, setFixtureDays] = useState<FifaFixtureDay[]>([]);
  const [expandedDayKeys, setExpandedDayKeys] = useState<string[]>([]);
  const [fixturesError, setFixturesError] = useState("");
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null);
  const [activeMatch, setActiveMatch] = useState<FifaMatchDetails | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [isPending, startTransition] = useTransition();

  const platform = useMemo(() => getPlatformConfig(platformId), [platformId]);

  useEffect(() => {
    void fetch("/api/openrouter/models")
      .then((result) => result.json())
      .then((payload: { models?: OpenRouterModel[]; source?: string }) => {
        if (payload.models?.length) {
          setModels(payload.models);
        }

        if (payload.source) {
          setModelsSource(payload.source);
        }
      })
      .catch(() => {
        setModels(fallbackModels);
        setModelsSource("fallback");
      });
  }, []);

  useEffect(() => {
    void fetch("/api/fifa/fixtures")
      .then(async (result) => {
        const payload = (await result.json()) as {
          days?: FifaFixtureDay[];
          detail?: string;
          error?: string;
        };

        if (!result.ok) {
          throw new Error(payload.detail || payload.error || "Failed to load FIFA fixtures.");
        }

        const nextDays = payload.days ?? [];
        setFixtureDays(nextDays);
        setExpandedDayKeys(getDefaultExpandedDayKeys(nextDays));
        setFixturesError("");
      })
      .catch((loadError: unknown) => {
        setFixturesError(
          loadError instanceof Error ? loadError.message : "Failed to load FIFA fixtures.",
        );
      });
  }, []);

  useEffect(() => {
    window.localStorage.setItem("cream11xp.model", model);
  }, [model]);

  useEffect(() => {
    window.localStorage.setItem("cream11xp.platform", platformId);
  }, [platformId]);

  const keyState = useMemo(
    () => ({
      label: key ? "configured" : "demo mode",
      preview: maskKey(key),
    }),
    [key],
  );

  const selectedModel = useMemo(
    () => models.find((entry) => entry.id === model) ?? null,
    [model, models],
  );

  const activeFixture = useMemo(() => {
    if (selectedFixtureId === null) {
      return null;
    }

    for (const day of fixtureDays) {
      const match = day.matches.find((entry) => entry.id === selectedFixtureId);
      if (match) {
        return match;
      }
    }

    return null;
  }, [fixtureDays, selectedFixtureId]);

  const quickPrompts = useMemo(() => {
    if (!activeMatch) {
      return platform.starterPrompts;
    }

    return buildQuickPrompts(platform, activeMatch);
  }, [activeMatch, platform]);

  const heroStats = useMemo<StatCard[]>(() => {
    const latencyValue = lastRunLatencyMs === null ? "IDLE" : `${lastRunLatencyMs}ms`;
    const latencyTone: StatCard["tone"] =
      lastRunLatencyMs === null ? "neutral" : lastRunLatencyMs > 4000 ? "warn" : "good";

    return [
      {
        id: "agents",
        label: "ACTIVE AGENTS",
        value: String(platform.agentRoles.length),
        tone: "good",
        detailTitle: `${platform.label} swarm roles`,
        detailBody:
          "This count comes from the active platform's configured agent roles for the selected match context.",
        detailItems: platform.agentRoles,
      },
      {
        id: "sources",
        label: "DATA SOURCES",
        value: String(platform.dataSources.length),
        tone: "neutral",
        detailTitle: `${platform.label} source map`,
        detailBody:
          "This count comes from the source categories currently mapped to the active terminal.",
        detailItems: platform.dataSources,
      },
      {
        id: "latency",
        label: "RUN LATENCY",
        value: latencyValue,
        tone: latencyTone,
        detailTitle: "Terminal run latency",
        detailBody:
          lastRunLatencyMs === null
            ? "No terminal run has been measured yet. After the first run, this card shows the real end-to-end request latency."
            : "This is the measured front-to-back request time for the most recent terminal run.",
        detailItems:
          lastRunLatencyMs === null
            ? [
                "Current state: idle",
                "Measurement source: browser timing around the /api/orchestrate request",
                "Updates after each run",
              ]
            : [
                `Most recent measured latency: ${lastRunLatencyMs}ms`,
                `Current terminal: ${platform.label}`,
                `Current model: ${selectedModel?.name ?? model}`,
              ],
      },
      {
        id: "router",
        label: "MODEL ROUTER",
        value: "OPENROUTER",
        tone: "neutral",
        detailTitle: "Routing and model selection",
        detailBody:
          "This tile shows the active routing layer and the current structured-output capable model.",
        detailItems: [
          `Selected model: ${selectedModel?.name ?? model}`,
          `Model slug: ${model}`,
          `Registry source: ${modelsSource}`,
          `Structured outputs: ${selectedModel?.supportsStructuredOutputs ? "supported" : "fallback assumed"}`,
        ],
      },
    ];
  }, [lastRunLatencyMs, model, modelsSource, platform, selectedModel]);

  const activeStat = useMemo(
    () => heroStats.find((stat) => stat.id === activeStatId) ?? null,
    [activeStatId, heroStats],
  );

  useEffect(() => {
    if (!activeStat) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveStatId(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeStat]);

  function handleSaveKey() {
    if (!key.trim()) {
      window.localStorage.removeItem("cream11xp.openrouterKey");
      return;
    }

    window.localStorage.setItem("cream11xp.openrouterKey", key.trim());
  }

  function selectPlatform(nextPlatformId: PlatformConfig["id"]) {
    const nextPlatform = getPlatformConfig(nextPlatformId);
    setPlatformId(nextPlatformId);
    setQuery(
      activeMatch ? buildMatchPrompt(nextPlatform, activeMatch) : nextPlatform.starterPrompts[0],
    );
    setError("");
  }

  function selectFixture(match: FixtureMatch) {
    setSelectedFixtureId(match.id);
    setIsLoadingMatch(true);
    setMatchError("");

    void fetch(`/api/fifa/matches/${match.id}`)
      .then(async (result) => {
        const payload = (await result.json()) as FifaMatchDetails & {
          detail?: string;
          error?: string;
        };

        if (!result.ok) {
          throw new Error(payload.detail || payload.error || "Failed to load FIFA match.");
        }

        setActiveMatch(payload);
        setQuery(buildMatchPrompt(platform, payload));
      })
      .catch((loadError: unknown) => {
        setMatchError(
          loadError instanceof Error ? loadError.message : "Failed to load FIFA match.",
        );
      })
      .finally(() => {
        setIsLoadingMatch(false);
      });
  }

  function clearMatchSelection() {
    setSelectedFixtureId(null);
    setActiveMatch(null);
    setMatchError("");
    setError("");
    setQuery(platform.starterPrompts[0]);
    setResponse(initialResponse);
  }

  function toggleFixtureDay(dayKey: string) {
    setExpandedDayKeys((current) =>
      current.includes(dayKey)
        ? current.filter((entry) => entry !== dayKey)
        : [...current, dayKey],
    );
  }

  function runTerminal(nextQuery?: string) {
    const activeQuery = (nextQuery ?? query).trim();

    if (!activeQuery) {
      setError("Enter a query before running the terminal.");
      return;
    }

    setError("");

    const contextualQuery =
      activeMatch === null
        ? activeQuery
        : [
            `Active fixture: ${activeMatch.homeSquadName} vs ${activeMatch.awaySquadName}`,
            `Fixture status: ${activeMatch.status}`,
            `Kickoff: ${activeMatch.kickoff}`,
            `Venue: ${activeMatch.venueName}${activeMatch.venueCity ? `, ${activeMatch.venueCity}` : ""}`,
            `Current score: ${activeMatch.homeScore ?? "-"}-${activeMatch.awayScore ?? "-"} (${activeMatch.homeSquadAbbr}/${activeMatch.awaySquadAbbr})`,
            `Prompt: ${activeQuery}`,
          ].join("\n");

    startTransition(async () => {
      const startedAt = performance.now();
      const result = await fetch("/api/orchestrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: key.trim(),
          model: model.trim(),
          platformId,
          query: contextualQuery,
        }),
      });

      const payload = (await result.json()) as TerminalResponse & {
        error?: string;
        detail?: string;
      };

      if (!result.ok) {
        setError(payload.detail || payload.error || "The terminal request failed.");
        return;
      }

      setLastRunLatencyMs(Math.round(performance.now() - startedAt));
      setResponse(payload);
      setQuery(activeQuery);
    });
  }

  return (
    <main className="terminal-stage">
      <div className="terminal-grid-shell">
        <header className="brutal-panel brutal-panel--hero">
          <div className="terminal-shell-bar">
            <span>C11-XP / world-cup command grid</span>
            <span>{selectedFixtureId === null ? "Fixture board" : "Match terminal stack"}</span>
          </div>

          <div className="hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">Fixture-first multi-terminal workflow</div>
              <h1 className="hero-title">{buildPlatformHeadline(platform, activeMatch)}</h1>
              <p className="hero-text">
                Start from a live World Cup fixture, then route that same match through fantasy,
                Kalshi, Polymarket, and Stake terminals without losing context.
              </p>
            </div>

            <div className="hero-stats">
              {heroStats.map((stat) => (
                <button
                  key={stat.id}
                  type="button"
                  className={`brutal-stat ${activeStat?.id === stat.id ? "brutal-stat--active" : ""}`}
                  onClick={() => setActiveStatId(stat.id)}
                >
                  <span className={`status-dot status-dot--${stat.tone}`} />
                  <span className="brutal-stat__label">{stat.label}</span>
                  <strong className="brutal-stat__value">{stat.value}</strong>
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="workspace-grid">
          <section className="workspace-main">
            {!activeFixture ? (
              <article className="brutal-panel">
                <div className="terminal-shell-bar">
                  <span>01 / Choose World Cup fixture</span>
                  <span>
                    {fixtureDays.reduce((sum, day) => sum + day.matches.length, 0)} live match
                    terminals
                  </span>
                </div>

                <div className="brutal-panel__body">
                  <div className="terminal-note">
                    Choose a match first. The terminal workspace opens only after fixture
                    selection, so the user lands directly in the right market stack.
                  </div>

                  {fixturesError ? <p className="terminal-error">{fixturesError}</p> : null}

                  <div className="fixture-board">
                    {fixtureDays.map((day) => {
                      const isExpanded = expandedDayKeys.includes(day.dateKey);

                      return (
                        <section key={day.dateKey} className="fixture-strip">
                          <button
                            type="button"
                            className="fixture-strip__header fixture-strip__header--button"
                            onClick={() => toggleFixtureDay(day.dateKey)}
                            aria-expanded={isExpanded}
                          >
                            <span>{day.dateLabel}</span>
                            <span className="fixture-strip__meta">
                              {day.matches.length} matches
                              <strong aria-hidden="true">{isExpanded ? "▴" : "▾"}</strong>
                            </span>
                          </button>

                          {isExpanded ? (
                            <div className="fixture-strip__matches">
                              {day.matches.map((match) => (
                                <button
                                  key={match.id}
                                  type="button"
                                  className={`fixture-card ${selectedFixtureId === match.id ? "fixture-card--active" : ""}`}
                                  onClick={() => selectFixture(match)}
                                >
                                  <div className="fixture-card__meta">
                                    <span>{match.stage}</span>
                                    <span>{match.kickoffLabel}</span>
                                  </div>
                                  <div className="fixture-card__matchup">
                                    <strong>{match.homeSquadAbbr}</strong>
                                    <span>{match.homeSquadName}</span>
                                    <span className="fixture-card__versus">vs</span>
                                    <span>{match.awaySquadName}</span>
                                    <strong>{match.awaySquadAbbr}</strong>
                                  </div>
                                  <div className="fixture-card__score">
                                    <span>
                                      {match.homeScore ?? "-"} : {match.awayScore ?? "-"}
                                    </span>
                                    <span>{match.venueCity ?? match.venueName}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </section>
                      );
                    })}
                  </div>
                </div>
              </article>
            ) : null}

            {activeFixture ? (
              <article className="brutal-panel">
                <div className="terminal-shell-bar">
                  <span>01 / Match workspace</span>
                  <button type="button" className="shell-link" onClick={clearMatchSelection}>
                    Back to fixture board
                  </button>
                </div>

                <div className="brutal-panel__body">
                  <div className="match-marquee">
                    <div className="match-marquee__line">
                      <span className="match-marquee__team">{activeFixture.homeSquadName}</span>
                      <strong>
                        {activeFixture.homeScore ?? "-"} : {activeFixture.awayScore ?? "-"}
                      </strong>
                      <span className="match-marquee__team">{activeFixture.awaySquadName}</span>
                    </div>
                    <div className="match-marquee__subline">
                      {activeFixture.kickoffLabel} / {activeFixture.venueName}
                      {activeFixture.venueCity ? `, ${activeFixture.venueCity}` : ""} /{" "}
                      {activeFixture.status}
                    </div>
                  </div>

                  <div className="terminal-selector">
                    {PLATFORM_CONFIGS.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        className={`terminal-selector__tab ${entry.id === platformId ? "terminal-selector__tab--active" : ""}`}
                        onClick={() => selectPlatform(entry.id)}
                      >
                        <span>{entry.label}</span>
                        <strong>{entry.descriptor}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ) : null}

            {activeFixture ? (
              <article className="brutal-panel">
                <div className="terminal-shell-bar">
                  <span>02 / {platform.label} terminal</span>
                  <span>{isPending ? "Running orchestration" : "Ready"}</span>
                </div>

                <div className="brutal-panel__body brutal-panel__body--terminal">
                  <div className="terminal-block">
                    <div className="terminal-block__label">Prompt buffer</div>
                    <textarea
                      className="terminal-textarea terminal-textarea--brutal"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      rows={6}
                      placeholder={`Ask the ${platform.label} terminal about ${activeFixture.homeSquadName} vs ${activeFixture.awaySquadName}.`}
                    />
                  </div>

                  <div className="terminal-controls">
                    <label className="terminal-field">
                      <span className="eyebrow">OpenRouter model</span>
                      <select
                        className="terminal-input terminal-input--brutal"
                        value={model}
                        onChange={(event) => setModel(event.target.value)}
                      >
                        {models.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name} - {entry.id}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="terminal-field">
                      <span className="eyebrow">Key status</span>
                      <div className="terminal-pill terminal-pill--brutal">
                        <span>{keyState.label}</span>
                        <strong>{keyState.preview}</strong>
                      </div>
                    </label>

                    <button
                      type="button"
                      className="terminal-action terminal-action--brutal"
                      onClick={() => runTerminal()}
                      disabled={isPending || isLoadingMatch}
                    >
                      {isPending ? "Running..." : "Execute terminal"}
                    </button>
                  </div>

                  <div className="prompt-strip">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="prompt-chip prompt-chip--brutal"
                        onClick={() => {
                          setQuery(prompt);
                          runTerminal(prompt);
                        }}
                        disabled={isPending || isLoadingMatch}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  {error ? <p className="terminal-error">{error}</p> : null}
                </div>
              </article>
            ) : null}

            {activeFixture ? (
              <article className="brutal-panel">
                <div className="terminal-shell-bar">
                  <span>03 / Terminal output</span>
                  <span>{response.mode === "openrouter" ? response.model : "demo/local-fallback"}</span>
                </div>

                <div className="brutal-panel__body">
                  <div className="output-marquee">
                    <div className="output-marquee__label">Headline</div>
                    <h2>{response.headline}</h2>
                    <p>{response.summary}</p>
                  </div>

                  <div className="output-grid">
                    <section className="signal-card signal-card--brutal">
                      <div className="eyebrow mb-3">Recommendation lane</div>
                      <ul className="terminal-list">
                        {response.recommendation.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>

                    <section className="signal-card signal-card--brutal">
                      <div className="eyebrow mb-3">Risk desk</div>
                      <ul className="terminal-list terminal-list--danger">
                        {response.risks.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>

                    <section className="signal-card signal-card--brutal">
                      <div className="eyebrow mb-3">Next checks</div>
                      <ul className="terminal-list">
                        {response.nextChecks.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  </div>
                </div>
              </article>
            ) : null}
          </section>

          <aside className="workspace-side">
            <article className="brutal-panel">
              <div className="terminal-shell-bar">
                <span>BYOK / OpenRouter</span>
                <span>Local only</span>
              </div>

              <div className="brutal-panel__body">
                <label className="terminal-field">
                  <span className="eyebrow">OpenRouter key</span>
                  <input
                    type="password"
                    className="terminal-input terminal-input--brutal"
                    value={key}
                    onChange={(event) => setKey(event.target.value)}
                    placeholder="or-v1-..."
                  />
                </label>

                <button type="button" className="terminal-secondary terminal-secondary--brutal" onClick={handleSaveKey}>
                  Save key locally
                </button>

                <div className="terminal-note">
                  The key stays in your browser for this MVP. Match context is injected into the
                  active terminal request when you run it.
                </div>
              </div>
            </article>

            <article className="brutal-panel">
              <div className="terminal-shell-bar">
                <span>Model registry</span>
                <span>{modelsSource}</span>
              </div>

              <div className="brutal-panel__body terminal-stack-list">
                <div className="terminal-note">Only structured-output compatible models are shown.</div>
                {models.slice(0, 4).map((entry) => (
                  <div key={entry.id} className="registry-card">
                    <strong>{entry.name}</strong>
                    <span>{entry.id}</span>
                    <span>
                      prompt {formatPrice(entry.promptPrice)} / completion{" "}
                      {formatPrice(entry.completionPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="brutal-panel">
              <div className="terminal-shell-bar">
                <span>{activeMatch ? "Active match feed" : "Selection guide"}</span>
                <span>{activeMatch ? "Loaded" : "Choose first"}</span>
              </div>

              <div className="brutal-panel__body terminal-stack-list">
                {isLoadingMatch ? (
                  <div className="terminal-note">Loading live FIFA match details...</div>
                ) : null}

                {matchError ? <p className="terminal-error">{matchError}</p> : null}

                {activeMatch ? (
                  <>
                    <div className="registry-card">
                      <strong>
                        {activeMatch.homeSquadName} vs {activeMatch.awaySquadName}
                      </strong>
                      <span>{activeMatch.kickoffLabel}</span>
                      <span>
                        {activeMatch.venueName}
                        {activeMatch.venueCity ? `, ${activeMatch.venueCity}` : ""}
                      </span>
                    </div>

                    <section className="signal-card signal-card--brutal">
                      <div className="eyebrow mb-3">Goal contributions</div>
                      <ul className="terminal-list">
                        {activeMatch.scorerSummary.length ? (
                          activeMatch.scorerSummary.map((item) => <li key={item}>{item}</li>)
                        ) : (
                          <li>No goal contributions recorded in the current public feed.</li>
                        )}
                      </ul>
                    </section>

                    <section className="signal-card signal-card--brutal">
                      <div className="eyebrow mb-3">Top fantasy players</div>
                      <ul className="terminal-list">
                        {[...activeMatch.homeTopPlayers.slice(0, 3), ...activeMatch.awayTopPlayers.slice(0, 3)].map((player) => (
                          <li key={player.id}>
                            {player.name} | {player.position} | {player.totalPoints} pts | form{" "}
                            {player.form} | selected {formatPercent(player.percentSelected)}
                          </li>
                        ))}
                      </ul>
                    </section>
                  </>
                ) : (
                  <div className="terminal-note">
                    Choose a fixture from the board to load live player and scorer context.
                  </div>
                )}
              </div>
            </article>

            <article className="brutal-panel">
              <div className="terminal-shell-bar">
                <span>{platform.label} market map</span>
                <span>{platform.marketTypes.length}</span>
              </div>

              <div className="brutal-panel__body terminal-stack-list">
                {platform.marketTypes.map((marketType) => (
                  <div key={marketType} className="registry-card">
                    <strong>{marketType}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="brutal-panel">
              <div className="terminal-shell-bar">
                <span>Loaded playbooks</span>
                <span>{response.loadedSkills.length}</span>
              </div>

              <div className="brutal-panel__body terminal-stack-list">
                {response.loadedSkills.length ? (
                  response.loadedSkills.map((skill) => (
                    <div key={skill} className="registry-card">
                      <strong>{skill}</strong>
                    </div>
                  ))
                ) : (
                  <div className="terminal-note">Skill list will appear after the first run.</div>
                )}
              </div>
            </article>
          </aside>
        </div>
      </div>

      {activeStat ? (
        <div className="modal-overlay" role="presentation" onClick={() => setActiveStatId(null)}>
          <div
            className="modal-card modal-card--brutal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stat-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="terminal-shell-bar">
              <span id="stat-modal-title">{activeStat.detailTitle}</span>
              <button
                type="button"
                className="modal-close modal-close--brutal"
                onClick={() => setActiveStatId(null)}
                aria-label="Close details"
              >
                close
              </button>
            </div>

            <div className="brutal-panel__body">
              <div className="terminal-note">
                <strong>{activeStat.value}</strong>
                <div className="note-row__subtle">{activeStat.detailBody}</div>
              </div>

              <div className="terminal-stack-list">
                {activeStat.detailItems.map((item) => (
                  <div key={item} className="registry-card">
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export type PlatformConfig = {
  id: "fifa" | "kalshi" | "polymarket" | "stake";
  label: string;
  shortLabel: string;
  descriptor: string;
  heroTitle: string;
  intro: string;
  starterPrompts: string[];
  agentRoles: string[];
  dataSources: string[];
  marketTypes: string[];
  predictionLanes: string[];
};

export const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    id: "fifa",
    label: "FIFA Fantasy",
    shortLabel: "FIFA",
    descriptor: "Fantasy squad optimizer",
    heroTitle: "A squad-building control room for FIFA fantasy decisions.",
    intro:
      "Build lineups, captain combinations, and slate variants with a football-first swarm tuned for fantasy roster construction.",
    starterPrompts: [
      "Build me the safest high-floor FIFA fantasy squad for today's slate.",
      "Give me three FIFA fantasy captain choices with different risk levels.",
      "What late-news checks should the terminal verify before locking a FIFA fantasy lineup?",
    ],
    agentRoles: [
      "research scout",
      "fixture context analyst",
      "player projection analyst",
      "risk and rotation analyst",
      "squad constructor",
      "captain optimization analyst",
      "debate critic",
      "final synthesizer",
    ],
    dataSources: [
      "official FIFA fantasy rules and scoring",
      "fixture schedule feed",
      "confirmed lineups",
      "injury and suspension reports",
      "player role and set-piece mapping",
      "weather and venue conditions",
      "pricing and budget slate data",
      "form and minute-allocation signals",
    ],
    marketTypes: [
      "full squad construction",
      "captain and vice-captain choices",
      "budget allocation and value plays",
      "cash-game builds",
      "tournament and contrarian builds",
      "late-swap and injury contingency plans",
    ],
    predictionLanes: [
      "player projection edge",
      "rotation and lineup stability",
      "clean sheet and scoring upside",
      "set-piece and role-based upside",
    ],
  },
  {
    id: "kalshi",
    label: "Kalshi",
    shortLabel: "Kalshi",
    descriptor: "Event contracts terminal",
    heroTitle: "A risk-aware event-contract terminal for Kalshi markets.",
    intro:
      "Focus on event probabilities, contract pricing, scenario trees, and invalidation triggers without pretending uncertainty is lower than it is.",
    starterPrompts: [
      "How should this terminal evaluate a Kalshi contract before taking any position?",
      "Break this Kalshi event into base case, upside case, and failure case.",
      "What evidence should the swarm refresh before touching a fast-moving Kalshi market?",
    ],
    agentRoles: [
      "research scout",
      "event probability analyst",
      "market pricing analyst",
      "catalyst and timing analyst",
      "risk desk",
      "debate critic",
      "final synthesizer",
    ],
    dataSources: [
      "official contract text",
      "resolution criteria",
      "underlying event schedule",
      "news and catalyst feeds",
      "consensus and narrative tracking",
      "historical resolution examples",
      "internal replay and scoring logs",
    ],
    marketTypes: [
      "yes/no event contracts",
      "range and threshold contracts",
      "date-bound outcome contracts",
      "sports-adjacent event contracts",
      "pre-event and live repricing checks",
    ],
    predictionLanes: [
      "internal probability vs market-implied probability",
      "narrative overreaction detection",
      "timing and catalyst sensitivity",
      "confidence-weighted no-trade decisions",
    ],
  },
  {
    id: "polymarket",
    label: "Polymarket",
    shortLabel: "Polymarket",
    descriptor: "Prediction-market scanner",
    heroTitle: "A scenario and pricing terminal for Polymarket opportunities.",
    intro:
      "Scan binary and multi-outcome markets, compare consensus narratives with internal estimates, and highlight where the swarm sees fragility.",
    starterPrompts: [
      "What should the swarm audit before suggesting a Polymarket trade idea?",
      "Compare market-implied probability with an internal football event estimate.",
      "Give me a no-trade checklist for thin or narrative-driven Polymarket contracts.",
    ],
    agentRoles: [
      "research scout",
      "resolution rule analyst",
      "probability analyst",
      "market mismatch analyst",
      "news and catalyst analyst",
      "risk desk",
      "final synthesizer",
    ],
    dataSources: [
      "market description and resolution rules",
      "contract liquidity and pricing snapshots",
      "event and fixture context",
      "news and social headline flow",
      "consensus probability benchmarks",
      "historical market replay logs",
      "internal edge scoring records",
    ],
    marketTypes: [
      "binary yes/no markets",
      "multi-outcome winner markets",
      "resolution-criteria sensitive markets",
      "sports tournament and match markets",
      "momentum and repricing setups",
    ],
    predictionLanes: [
      "resolution rule awareness",
      "consensus disagreement mapping",
      "news and catalyst monitoring",
      "edge persistence and fragility",
    ],
  },
  {
    id: "stake",
    label: "Stake",
    shortLabel: "Stake",
    descriptor: "Betting market terminal",
    heroTitle: "A betting market terminal for Stake-style sportsbook decisions.",
    intro:
      "Frame bet types, compare implied prices to internal views, and route the question through projection, market, and risk lenses before suggesting anything.",
    starterPrompts: [
      "How should the terminal compare a Stake line against its internal football projection?",
      "Give me a checklist for evaluating a same-game bet idea without overfitting.",
      "What would the risk desk want to know before approving a high-volatility betting angle?",
    ],
    agentRoles: [
      "research scout",
      "projection analyst",
      "line and price analyst",
      "prop and derivative analyst",
      "correlation and parlay analyst",
      "risk desk",
      "final synthesizer",
    ],
    dataSources: [
      "market lines and odds board",
      "fixture and team context feed",
      "confirmed lineups",
      "injury and rotation reports",
      "player role and prop context",
      "line-move history",
      "weather and venue conditions",
      "internal pricing replay logs",
    ],
    marketTypes: [
      "moneyline and match winner",
      "spreads and handicaps",
      "totals and team totals",
      "both teams to score",
      "player props",
      "cards, corners, and shots markets",
      "same-game combinations and parlays",
      "live betting re-entry setups",
    ],
    predictionLanes: [
      "price vs projection mismatch",
      "correlation and parlay fragility",
      "line movement and market timing",
      "player-role and matchup prop logic",
    ],
  },
];

export function getPlatformConfig(platformId: string): PlatformConfig {
  return (
    PLATFORM_CONFIGS.find((platform) => platform.id === platformId) ?? PLATFORM_CONFIGS[0]
  );
}

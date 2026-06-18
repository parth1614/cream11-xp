const FIFA_FANTASY_ROUNDS_URL = "https://play.fifa.com/json/fantasy/rounds.json";
const FIFA_FANTASY_PLAYERS_URL = "https://play.fifa.com/json/fantasy/players.json";

type FifaFantasyRound = {
  id: number;
  stage: string;
  status: string;
  startDate: string;
  endDate: string;
  tournaments: FifaFantasyTournament[];
};

type FifaFantasyTournament = {
  id: number;
  period: string;
  minutes: number;
  extraMinutes: number;
  venueName: string;
  venueCity: string | null;
  venueNameTranslationKey: string | null;
  venueCityTranslationKey: string | null;
  venueId: number;
  date: string;
  status: string;
  isSuspended: boolean;
  homeSquadId: number;
  awaySquadId: number;
  homeSquadName: string;
  awaySquadName: string;
  homeSquadAbbr: string;
  awaySquadAbbr: string;
  homeScore: number | null;
  homePenaltyScore: number | null;
  homeGoalScorersAssists:
    | Array<{
        playerId: number;
        assistId: number | null;
        isOwnGoal: boolean;
      }>
    | null;
  awayScore: number | null;
  awayPenaltyScore: number | null;
  awayGoalScorersAssists:
    | Array<{
        playerId: number;
        assistId: number | null;
        isOwnGoal: boolean;
      }>
    | null;
};

type FifaFantasyPlayer = {
  id: number;
  firstName: string;
  lastName: string;
  knownName: string | null;
  squadId: number;
  position: "GK" | "DEF" | "MID" | "FWD" | string;
  price: number;
  status: string;
  matchStatus: string;
  percentSelected: number;
  roundsSelected: Record<string, number>;
  stats: {
    totalPoints: number;
    avgPoints: number;
    form: number;
    lastRoundPoints: number;
    roundPoints: Record<string, number> | number[];
    nextFixtureFromActiveRound: number | null;
    nextFixtureFromScheduledRound: number | null;
  };
  oneToWatch: boolean;
  oneToWatchText: string | null;
  qualificationRoundIds: number[];
  fifaId: number | null;
};

export type FifaMatchCard = {
  id: number;
  roundId: number;
  roundStatus: string;
  stage: string;
  kickoff: string;
  kickoffLabel: string;
  dateKey: string;
  dateLabel: string;
  status: string;
  venueName: string;
  venueCity: string | null;
  homeSquadId: number;
  awaySquadId: number;
  homeSquadName: string;
  awaySquadName: string;
  homeSquadAbbr: string;
  awaySquadAbbr: string;
  homeScore: number | null;
  awayScore: number | null;
  totalTrackedPlayers: number;
};

export type FifaFixtureDay = {
  dateKey: string;
  dateLabel: string;
  matches: FifaMatchCard[];
};

export type FifaMatchPlayer = {
  id: number;
  name: string;
  position: string;
  price: number;
  status: string;
  matchStatus: string;
  percentSelected: number;
  totalPoints: number;
  avgPoints: number;
  form: number;
  lastRoundPoints: number;
  nextFixtureFromScheduledRound: number | null;
  oneToWatch: boolean;
};

export type FifaMatchDetails = {
  id: number;
  roundId: number;
  roundStatus: string;
  stage: string;
  kickoff: string;
  kickoffLabel: string;
  status: string;
  venueName: string;
  venueCity: string | null;
  minutes: number;
  extraMinutes: number;
  homeSquadId: number;
  awaySquadId: number;
  homeSquadName: string;
  awaySquadName: string;
  homeSquadAbbr: string;
  awaySquadAbbr: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTopPlayers: FifaMatchPlayer[];
  awayTopPlayers: FifaMatchPlayer[];
  scorerSummary: string[];
  statsCoverage: string[];
  source: string;
};

type FifaDataSnapshot = {
  rounds: FifaFantasyRound[];
  players: FifaFantasyPlayer[];
  playersById: Map<number, FifaFantasyPlayer>;
  playersBySquadId: Map<number, FifaFantasyPlayer[]>;
};

function formatKickoff(isoDate: string) {
  const date = new Date(isoDate);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function formatFixtureDay(isoDate: string) {
  const date = new Date(isoDate);

  return {
    dateKey: date.toISOString().slice(0, 10),
    dateLabel: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(date),
  };
}

function playerDisplayName(player: FifaFantasyPlayer) {
  return player.knownName || `${player.firstName} ${player.lastName}`.trim();
}

function mapMatchPlayer(player: FifaFantasyPlayer): FifaMatchPlayer {
  return {
    id: player.id,
    name: playerDisplayName(player),
    position: player.position,
    price: player.price,
    status: player.status,
    matchStatus: player.matchStatus,
    percentSelected: player.percentSelected,
    totalPoints: player.stats.totalPoints,
    avgPoints: player.stats.avgPoints,
    form: player.stats.form,
    lastRoundPoints: player.stats.lastRoundPoints,
    nextFixtureFromScheduledRound: player.stats.nextFixtureFromScheduledRound,
    oneToWatch: player.oneToWatch,
  };
}

function buildScorerSummary(
  side: "home" | "away",
  squadName: string,
  entries: FifaFantasyTournament["homeGoalScorersAssists"],
  playersById: Map<number, FifaFantasyPlayer>,
) {
  if (!entries?.length) {
    return [];
  }

  return entries.map((entry) => {
    const scorer = playersById.get(entry.playerId);
    const assist = entry.assistId ? playersById.get(entry.assistId) : null;
    const scorerName = scorer ? playerDisplayName(scorer) : `Player ${entry.playerId}`;
    const assistName = assist ? playerDisplayName(assist) : null;
    const label = side === "home" ? "Home" : "Away";

    if (entry.isOwnGoal) {
      return `${label} goal for ${squadName}: ${scorerName} (own goal)`;
    }

    return `${label} goal for ${squadName}: ${scorerName}${assistName ? `, assist ${assistName}` : ""}`;
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

async function getSnapshot(): Promise<FifaDataSnapshot> {
  const [rounds, players] = await Promise.all([
    fetchJson<FifaFantasyRound[]>(FIFA_FANTASY_ROUNDS_URL),
    fetchJson<FifaFantasyPlayer[]>(FIFA_FANTASY_PLAYERS_URL),
  ]);

  const playersById = new Map<number, FifaFantasyPlayer>();
  const playersBySquadId = new Map<number, FifaFantasyPlayer[]>();

  for (const player of players) {
    playersById.set(player.id, player);

    const squadPlayers = playersBySquadId.get(player.squadId) ?? [];
    squadPlayers.push(player);
    playersBySquadId.set(player.squadId, squadPlayers);
  }

  for (const squadPlayers of playersBySquadId.values()) {
    squadPlayers.sort((left, right) => {
      return (
        right.stats.totalPoints - left.stats.totalPoints ||
        right.stats.form - left.stats.form ||
        right.percentSelected - left.percentSelected
      );
    });
  }

  return {
    rounds,
    players,
    playersById,
    playersBySquadId,
  };
}

export async function getFifaFixtureDays(): Promise<FifaFixtureDay[]> {
  const snapshot = await getSnapshot();
  const days = new Map<string, FifaFixtureDay>();

  for (const round of snapshot.rounds) {
    for (const match of round.tournaments) {
      const { dateKey, dateLabel } = formatFixtureDay(match.date);
      const existingDay = days.get(dateKey) ?? {
        dateKey,
        dateLabel,
        matches: [],
      };

      existingDay.matches.push({
        id: match.id,
        roundId: round.id,
        roundStatus: round.status,
        stage: round.stage,
        kickoff: match.date,
        kickoffLabel: formatKickoff(match.date),
        dateKey,
        dateLabel,
        status: match.status,
        venueName: match.venueName,
        venueCity: match.venueCity,
        homeSquadId: match.homeSquadId,
        awaySquadId: match.awaySquadId,
        homeSquadName: match.homeSquadName,
        awaySquadName: match.awaySquadName,
        homeSquadAbbr: match.homeSquadAbbr,
        awaySquadAbbr: match.awaySquadAbbr,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        totalTrackedPlayers:
          (snapshot.playersBySquadId.get(match.homeSquadId)?.length ?? 0) +
          (snapshot.playersBySquadId.get(match.awaySquadId)?.length ?? 0),
      });

      days.set(dateKey, existingDay);
    }
  }

  return Array.from(days.values())
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey))
    .map((day) => ({
      ...day,
      matches: day.matches.sort((left, right) => left.kickoff.localeCompare(right.kickoff)),
    }));
}

export async function getFifaMatchDetails(matchId: number): Promise<FifaMatchDetails | null> {
  const snapshot = await getSnapshot();

  for (const round of snapshot.rounds) {
    const match = round.tournaments.find((entry) => entry.id === matchId);

    if (!match) {
      continue;
    }

    const homeTopPlayers = (snapshot.playersBySquadId.get(match.homeSquadId) ?? [])
      .slice(0, 8)
      .map(mapMatchPlayer);
    const awayTopPlayers = (snapshot.playersBySquadId.get(match.awaySquadId) ?? [])
      .slice(0, 8)
      .map(mapMatchPlayer);

    return {
      id: match.id,
      roundId: round.id,
      roundStatus: round.status,
      stage: round.stage,
      kickoff: match.date,
      kickoffLabel: formatKickoff(match.date),
      status: match.status,
      venueName: match.venueName,
      venueCity: match.venueCity,
      minutes: match.minutes,
      extraMinutes: match.extraMinutes,
      homeSquadId: match.homeSquadId,
      awaySquadId: match.awaySquadId,
      homeSquadName: match.homeSquadName,
      awaySquadName: match.awaySquadName,
      homeSquadAbbr: match.homeSquadAbbr,
      awaySquadAbbr: match.awaySquadAbbr,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homeTopPlayers,
      awayTopPlayers,
      scorerSummary: [
        ...buildScorerSummary(
          "home",
          match.homeSquadName,
          match.homeGoalScorersAssists,
          snapshot.playersById,
        ),
        ...buildScorerSummary(
          "away",
          match.awaySquadName,
          match.awayGoalScorersAssists,
          snapshot.playersById,
        ),
      ],
      statsCoverage: [
        "Real source: FIFA Fantasy public JSON",
        "Available now: fixture status, kickoff, venue, scoreline, goal scorer and assist pairs",
        "Available now: fantasy player price, selection %, total points, form, and last-round points",
        "Not in this public feed: passing, shots, tackles, and deeper event-by-event match stats",
      ],
      source: "https://play.fifa.com/json/fantasy/rounds.json + https://play.fifa.com/json/fantasy/players.json",
    };
  }

  return null;
}

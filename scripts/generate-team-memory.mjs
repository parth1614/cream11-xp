const ROUNDS_URL = "https://play.fifa.com/json/fantasy/rounds.json";
const PLAYERS_URL = "https://play.fifa.com/json/fantasy/players.json";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const memoryDir = path.join(rootDir, "memory", "teams");

function toTeamSlug(teamName) {
  return teamName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
}

function playerName(player) {
  return player.knownName || `${player.firstName} ${player.lastName}`.trim();
}

function formatIsoDate(value) {
  return new Date(value).toISOString();
}

function formatDisplayDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function buildRecord(fixtures, squadId) {
  let played = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const fixture of fixtures) {
    if (fixture.status !== "complete") {
      continue;
    }

    const isHome = fixture.homeSquadId === squadId;
    const scored = isHome ? fixture.homeScore : fixture.awayScore;
    const conceded = isHome ? fixture.awayScore : fixture.homeScore;

    if (scored == null || conceded == null) {
      continue;
    }

    played += 1;
    goalsFor += scored;
    goalsAgainst += conceded;

    if (scored > conceded) {
      wins += 1;
    } else if (scored === conceded) {
      draws += 1;
    } else {
      losses += 1;
    }
  }

  return { played, wins, draws, losses, goalsFor, goalsAgainst };
}

function collectTeams(rounds) {
  const teams = new Map();

  for (const round of rounds) {
    for (const fixture of round.tournaments ?? []) {
      const items = [
        [fixture.homeSquadId, fixture.homeSquadName, fixture.homeSquadAbbr],
        [fixture.awaySquadId, fixture.awaySquadName, fixture.awaySquadAbbr],
      ];

      for (const [squadId, teamName, abbr] of items) {
        if (!teams.has(squadId)) {
          teams.set(squadId, {
            squadId,
            teamName,
            abbr,
            fixtures: [],
          });
        }
      }

      teams.get(fixture.homeSquadId).fixtures.push({
        id: fixture.id,
        date: fixture.date,
        stage: round.stage,
        status: fixture.status,
        venueName: fixture.venueName,
        venueCity: fixture.venueCity,
        homeSquadId: fixture.homeSquadId,
        awaySquadId: fixture.awaySquadId,
        homeSquadName: fixture.homeSquadName,
        awaySquadName: fixture.awaySquadName,
        homeScore: fixture.homeScore,
        awayScore: fixture.awayScore,
      });

      teams.get(fixture.awaySquadId).fixtures.push({
        id: fixture.id,
        date: fixture.date,
        stage: round.stage,
        status: fixture.status,
        venueName: fixture.venueName,
        venueCity: fixture.venueCity,
        homeSquadId: fixture.homeSquadId,
        awaySquadId: fixture.awaySquadId,
        homeSquadName: fixture.homeSquadName,
        awaySquadName: fixture.awaySquadName,
        homeScore: fixture.homeScore,
        awayScore: fixture.awayScore,
      });
    }
  }

  return teams;
}

function buildTopPlayers(players) {
  return [...players]
    .sort((a, b) => {
      return (
        b.stats.totalPoints - a.stats.totalPoints ||
        b.stats.form - a.stats.form ||
        b.percentSelected - a.percentSelected
      );
    })
    .slice(0, 8);
}

function buildMarkdown(team, players, generatedAt) {
  const slug = toTeamSlug(team.teamName);
  const fixtures = [...team.fixtures].sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
  );
  const completed = fixtures.filter((fixture) => fixture.status === "complete");
  const upcoming = fixtures.filter((fixture) => fixture.status !== "complete");
  const recent = completed.slice(-3).reverse();
  const nextUp = upcoming.slice(0, 3);
  const record = buildRecord(fixtures, team.squadId);
  const topPlayers = buildTopPlayers(players);

  const recentLines = recent.length
    ? recent
        .map((fixture) => {
          const isHome = fixture.homeSquadId === team.squadId;
          const opponent = isHome ? fixture.awaySquadName : fixture.homeSquadName;
          const scored = isHome ? fixture.homeScore : fixture.awayScore;
          const conceded = isHome ? fixture.awayScore : fixture.homeScore;
          return `- ${formatDisplayDate(fixture.date)} | ${team.teamName} ${scored}-${conceded} ${opponent} | ${fixture.stage} | ${fixture.venueCity ?? fixture.venueName}`;
        })
        .join("\n")
    : "- No completed fixtures in the current public feed yet.";

  const nextLines = nextUp.length
    ? nextUp
        .map((fixture) => {
          const isHome = fixture.homeSquadId === team.squadId;
          const opponent = isHome ? fixture.awaySquadName : fixture.homeSquadName;
          return `- ${formatDisplayDate(fixture.date)} | vs ${opponent} | ${fixture.stage} | ${fixture.venueCity ?? fixture.venueName} | status ${fixture.status}`;
        })
        .join("\n")
    : "- No upcoming fixtures listed in the current public feed.";

  const playerLines = topPlayers.length
    ? topPlayers
        .map(
          (player) =>
            `- ${playerName(player)} | ${player.position} | price ${player.price} | ${player.stats.totalPoints} pts | form ${player.stats.form} | selected ${player.percentSelected}% | status ${player.status}`,
        )
        .join("\n")
    : "- No player rows found for this squad in the current public feed.";

  return `---
team_name: ${team.teamName}
team_slug: ${slug}
squad_id: ${team.squadId}
team_abbr: ${team.abbr}
generated_at: ${generatedAt}
primary_source: ${ROUNDS_URL}
secondary_source: ${PLAYERS_URL}
---

# ${team.teamName} Team Memory

## Canonical Profile

- Team name: ${team.teamName}
- FIFA fantasy squad id: ${team.squadId}
- Abbreviation: ${team.abbr}
- Current memory status: active
- Last generated from official structured feed: ${generatedAt}

## Current Tournament Snapshot

- Record from completed fixtures: ${record.wins}-${record.draws}-${record.losses}
- Matches played: ${record.played}
- Goals for: ${record.goalsFor}
- Goals against: ${record.goalsAgainst}
- Current fixture count in feed: ${fixtures.length}

### Recent results

${recentLines}

### Next fixtures

${nextLines}

## Fantasy Priority Board

${playerLines}

## Historical Tournament Notes

- Placeholder: enrich this section with source-backed historical World Cup and major-tournament performance.
- Keep historical claims concise, dated, and source-aware.
- Do not overwrite history without verified newer research.

## Research Targets For Agents

- Check for lineup certainty, rotation risk, and injury news before making recommendations.
- Compare fantasy leaders with role security and next-fixture difficulty.
- Validate whether recent results match underlying player selection and form data.
- Update this file after any team-specific query or relevant match run.

## Memory Update Log

- ${generatedAt} | bootstrap | Generated initial team memory from official FIFA fantasy rounds and players feeds.
`;
}

async function main() {
  const [roundsResponse, playersResponse] = await Promise.all([
    fetch(ROUNDS_URL),
    fetch(PLAYERS_URL),
  ]);

  if (!roundsResponse.ok) {
    throw new Error(`Failed to fetch rounds feed: HTTP ${roundsResponse.status}`);
  }

  if (!playersResponse.ok) {
    throw new Error(`Failed to fetch players feed: HTTP ${playersResponse.status}`);
  }

  const rounds = await roundsResponse.json();
  const players = await playersResponse.json();
  const teams = collectTeams(rounds);
  const playersBySquadId = new Map();

  for (const player of players) {
    const squadPlayers = playersBySquadId.get(player.squadId) ?? [];
    squadPlayers.push(player);
    playersBySquadId.set(player.squadId, squadPlayers);
  }

  const generatedAt = new Date().toISOString();
  await mkdir(memoryDir, { recursive: true });

  const indexLines = [
    "# Team Memory Index",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "These markdown files are long-lived team memory artifacts for orchestrators and agents.",
    "",
    "## Teams",
    "",
  ];

  for (const team of [...teams.values()].sort((left, right) => left.teamName.localeCompare(right.teamName))) {
    const fileName = `${toTeamSlug(team.teamName)}.md`;
    const markdown = buildMarkdown(team, playersBySquadId.get(team.squadId) ?? [], generatedAt);
    await writeFile(path.join(memoryDir, fileName), markdown, "utf8");
    indexLines.push(`- ${team.teamName} \`${fileName}\``);
  }

  await writeFile(path.join(memoryDir, "_index.md"), `${indexLines.join("\n")}\n`, "utf8");

  console.log(`Generated ${teams.size} team memory files in ${memoryDir}`);
}

await main();

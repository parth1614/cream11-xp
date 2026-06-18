import { readFile } from "node:fs/promises";
import path from "node:path";

export type TeamMemoryDoc = {
  slug: string;
  teamName: string;
  squadId: string;
  body: string;
};

const TEAM_MEMORY_DIR = path.resolve(process.cwd(), "..", "..", "memory", "teams");

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return {
      metadata: {},
      body: markdown.trim(),
    };
  }

  const [, rawMetadata, body] = match;
  const metadata = Object.fromEntries(
    rawMetadata
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf(":");
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        return [key, value];
      }),
  );

  return {
    metadata,
    body: body.trim(),
  };
}

export function toTeamSlug(teamName: string) {
  return teamName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
}

async function loadTeamMemoryBySlug(slug: string): Promise<TeamMemoryDoc | null> {
  const filePath = path.join(TEAM_MEMORY_DIR, `${slug}.md`);

  try {
    const raw = await readFile(filePath, "utf8");
    const { metadata, body } = parseFrontmatter(raw);

    return {
      slug,
      teamName: String(metadata.team_name ?? slug),
      squadId: String(metadata.squad_id ?? ""),
      body,
    };
  } catch {
    return null;
  }
}

export async function loadTeamMemoryDocs(teamNames: string[]) {
  const uniqueSlugs = [...new Set(teamNames.map((teamName) => toTeamSlug(teamName)).filter(Boolean))];

  const docs = await Promise.all(uniqueSlugs.map((slug) => loadTeamMemoryBySlug(slug)));

  return docs.filter((doc): doc is TeamMemoryDoc => doc !== null);
}

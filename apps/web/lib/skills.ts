import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type SkillDoc = {
  slug: string;
  name: string;
  description: string;
  body: string;
};

const SKILLS_DIR = path.resolve(process.cwd(), "..", "..", "skills");

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

export async function loadSkillDocs(): Promise<SkillDoc[]> {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });

  const docs = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const skillPath = path.join(SKILLS_DIR, entry.name, "SKILL.md");
        const raw = await readFile(skillPath, "utf8");
        const { metadata, body } = parseFrontmatter(raw);

        return {
          slug: entry.name,
          name: String(metadata.name ?? entry.name),
          description: String(metadata.description ?? ""),
          body,
        };
      }),
  );

  return docs.sort((a, b) => a.slug.localeCompare(b.slug));
}

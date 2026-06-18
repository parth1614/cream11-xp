export type TerminalResponse = {
  mode: "openrouter" | "demo";
  model: string;
  headline: string;
  summary: string;
  recommendation: string[];
  risks: string[];
  nextChecks: string[];
  loadedSkills: string[];
  raw?: string;
};

export type TerminalResponse = {
  mode: "openrouter" | "demo";
  model: string;
  headline: string;
  summary: string;
  primaryCall: string;
  confidence: number;
  recommendation: string[];
  risks: string[];
  nextChecks: string[];
  loadedSkills: string[];
  raw?: string;
};

"use client";

import dynamic from "next/dynamic";

const TerminalApp = dynamic(
  () => import("@/components/terminal-app").then((module) => module.TerminalApp),
  {
    ssr: false,
  },
);

export function TerminalEntry() {
  return <TerminalApp />;
}

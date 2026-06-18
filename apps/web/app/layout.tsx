import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cream11 XP",
  description:
    "An open-source football intelligence terminal powered by agent swarms, OpenRouter, and evidence-first forecasting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

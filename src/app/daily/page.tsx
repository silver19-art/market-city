import { Daily } from "@/components/Daily";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mystery Market | Market City",
  description: "A new hidden stretch of real market history every day. Trade blind, beat the market, guess the era and climb the daily leaderboard.",
};

export default function DailyPage() {
  return <Daily />;
}

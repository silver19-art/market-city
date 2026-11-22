import { Daily } from "@/components/Daily";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mystery Market | Market City",
  description: "A new two-year stretch of real market history from any time since 1927, every day. Trade real companies with the dates hidden, beat the market, guess the era and see how you rank against everyone else today.",
};

export default function DailyPage() {
  return <Daily />;
}

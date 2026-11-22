import { Daily } from "@/components/Daily";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mystery Market | Market City",
  description: "A new hidden stretch of real market history every day. Trade real companies with the dates hidden, beat the market, guess the era and see how you rank against everyone else today.",
};

export default function DailyPage() {
  return <Daily />;
}

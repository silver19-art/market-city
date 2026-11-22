import type { Metadata } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://market-city-game.vercel.app"),
  title: "Market City: invest through real market history",
  description:
    "Fly over a 3D city where every building is a real stock. Replay the 1929 crash, World War II, 1970s stagflation, Black Monday, the dot-com bubble, 2008, COVID or the AI boom with $10,000 and see if you can beat the S&P 500.",
  openGraph: {
    title: "Market City: every building is a real stock",
    description: "Invest $10,000 through real market history, from the 1929 crash to the AI boom, in a 3D city that rises and falls with actual prices.",
    url: "https://market-city-game.vercel.app",
    siteName: "Market City",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="sky min-h-full">{children}</body>
    </html>
  );
}

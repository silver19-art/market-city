import type { Metadata } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market City: invest through real market history",
  description:
    "Fly over a 3D city where every building is a real stock. Replay the 1929 crash, World War II, 1970s stagflation, Black Monday, the dot-com bubble, 2008, COVID or the AI boom with $10,000 and see if you can beat the S&P 500.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="sky min-h-full">{children}</body>
    </html>
  );
}

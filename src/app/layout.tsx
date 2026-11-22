import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market City: invest through real market history",
  description:
    "Fly over a 3D city where every building is a real stock. Replay the dot-com bubble, the 2008 crisis, the COVID crash or the AI boom with $10,000 and see if you can beat the S&P 500.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="sky min-h-full">{children}</body>
    </html>
  );
}

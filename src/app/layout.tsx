import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XAU/USD Signals",
  description: "Private swing and scalping signal dashboard for gold (XAUUSD).",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0a0c0f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

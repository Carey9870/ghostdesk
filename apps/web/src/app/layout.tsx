// path: apps/web/src/app/layout.tsx
// purpose: Root layout: Bricolage Grotesque font, page metadata and the pricing dialog provider.
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

import { Analytics } from "@/components/Analytics";
import { PricingProvider } from "@/components/pricing";

const font = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GhostDesk: the private side of your computer",
  description:
    "An encrypted vault on your own computer for documents, photos and videos. Open it with a pattern and a passphrase.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f3ff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={font.variable}>
      <body className="min-h-dvh bg-paper">
        <PricingProvider>{children}</PricingProvider>
        <Analytics />
      </body>
    </html>
  );
}

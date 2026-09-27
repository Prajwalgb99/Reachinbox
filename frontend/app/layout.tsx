import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ONG — ReachInbox Email Scheduler",
  description:
    "Production-grade cold email scheduler with BullMQ, Redis, Postgres, Elasticsearch, and Slack rate-limit alerts.",
  keywords: ["email scheduler", "BullMQ", "cold outreach", "ReachInbox"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

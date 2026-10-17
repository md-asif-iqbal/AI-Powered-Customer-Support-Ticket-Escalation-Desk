import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniDesk AI — Intelligent Customer Support & SLA Escalation Desk",
  description: "AI-Powered Customer Support, SLA Tracking & Automated Ticket Escalation Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F8FAF9] text-[#111827]">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Support & Escalation Desk",
  description: "Intelligent Customer Support, SLA Tracking & AI Ticket Escalation Platform",
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

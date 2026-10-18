# NT DeskAI — Intelligent Customer Support & Ticket Escalation Desk (Frontend)

[![Next.js](https://img.shields.io/badge/Next.js-16.4.2-1F6F5F?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-2FA084?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-EEEEEE?style=for-the-badge&logo=tailwindcss&logoColor=1F6F5F)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-10%20Passed-1F6F5F?style=for-the-badge&logo=vitest)](https://vitest.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-Ready-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide Icons, Sonner Toasts, and strict 100% Solid Color Palette (`#1F6F5F`, `#2FA084`, `#6FCF97`, `#EEEEEE`).

---

## 🚀 Key Frontend Features
- **Strict Role-Based Dashboards**:
  - `Customer`: Views only own tickets, creates tickets with live heuristic triage feedback, submits 5-star ratings & incident reports, reopens resolved tickets.
  - `Agent`: Manages assigned tickets, writes internal staff notes, updates status, and tracks AI Leaderboard ranking. Read-only protection on colleague tickets.
  - `Admin`: Global SLA oversight, multi-agent co-assignment modal, instant agent reassignment dropdown.
- **AI Triage Copilot (Role-Guarded)**:
  - Staff see Google Gemini / Groq live sentiment scores, urgency meters, auto-escalation flags, and 1-click empathetic reply drafts.
  - Customers see an executive, friendly **"Assigned Support Desk"** card with zero confusing technical AI tags.
- **Resolved Ticket Locking**:
  - UI strictly locks reply composer when ticket is `RESOLVED` or `CLOSED`, displaying a clean status notice and a `Reopen Ticket to Send Reply` action button.
- **Clean Single-Line Action Buttons**:
  - Prevents clumsy button wrapping (`whitespace-nowrap shrink-0`); only `Reopen Ticket` is shown on resolved tickets.
- **Top-Right Toast System**:
  - Powered by `sonner` (`richColors closeButton`) for instant feedback across all actions.
- **AI Agent Performance Leaderboard (`/leaderboard`)**:
  - Live ranks, tier badges (`🌟 Elite`, `🎯 Senior`, `🚀 Specialist`), SLA compliance rates, and incident penalties.

---

## 🛠️ Local Setup
```bash
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_BACKEND_URL=http://localhost:5001/api
npm run dev
# Starts on http://localhost:3000
```

## 🧪 Tests
```bash
npm test
```

## ☁️ Vercel Deployment
Deploy directly to Vercel with framework preset `Next.js` and set:
`NEXT_PUBLIC_BACKEND_URL=https://your-backend.vercel.app/api`

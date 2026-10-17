# AI-Powered-Customer-Support-Ticket-Escalation-Desk

Next.js 16 (App Router), React 19, Firebase Authentication (Google & Email/Password), Lucide Icons, and Tailwind CSS v4 using a strict 100% Solid Color Palette (`#1F6F5F`, `#2FA084`, `#6FCF97`, `#EEEEEE`).

## Features
- **Firebase Auth**: Google Sign-In popup & Email/Password with real-time MongoDB Atlas user synchronization.
- **SLA Countdown & Urgency Visuals**: Real-time SLA progress bar, breach warnings, and status tracking.
- **AI Triage Copilot**: Displays Google Gemini & Groq sentiment scores, urgency levels, and auto-generated reply drafts.
- **100% Responsive Design**: Optimized for 320px mobile displays up to 1440px desktop screens.
- **Global Theme Colors**: Configured in `globals.css` using CSS custom properties (`--color-brand-dark`, `--color-brand-primary`, `--color-brand-mint`, `--color-brand-light`).

## Setup & Running
1. `npm install`
2. Configure `.env.local` (see `.env.example`)
3. `npm run dev` (starts on http://localhost:3000)

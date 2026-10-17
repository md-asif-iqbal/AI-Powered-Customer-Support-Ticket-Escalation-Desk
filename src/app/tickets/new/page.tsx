"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import {
  Headset,
  Send,
  AlertCircle,
  Clock,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { analyzeTicketHeuristically } from "@/lib/ai-service";
import { apiFetch } from "@/lib/api";

export default function NewTicketPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    userId: string;
    name: string;
    email: string;
    role: "CUSTOMER" | "AGENT" | "ADMIN";
  } | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"TECHNICAL" | "BILLING" | "ACCOUNT" | "GENERAL">("GENERAL");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [createdTicketInfo, setCreatedTicketInfo] = useState<{
    id: string;
    ticketNumber: string;
    assignedToName: string;
    category: string;
    priority: string;
    slaHours: number;
    autoEscalated: boolean;
  } | null>(null);

  const [liveAi, setLiveAi] = useState<{
    sentiment: string;
    sentimentScore: number;
    urgencyScore: number;
    recommendedCategory: string;
    recommendedPriority: string;
    autoEscalate: boolean;
  } | null>(null);

  useEffect(() => {
    apiFetch<{ user: typeof currentUser }>("/auth/me")
      .then((data) => {
        if (!data.user) {
          router.push("/login");
        } else {
          setCurrentUser(data.user);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    if (title.length > 5 || description.length > 10) {
      const timer = setTimeout(() => {
        const analysis = analyzeTicketHeuristically({ title, description });
        setLiveAi({
          sentiment: analysis.sentiment,
          sentimentScore: analysis.sentimentScore,
          urgencyScore: analysis.urgencyScore,
          recommendedCategory: analysis.recommendedCategory,
          recommendedPriority: analysis.recommendedPriority,
          autoEscalate: analysis.autoEscalateRecommended,
        });
      }, 350);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setLiveAi(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [title, description]);

  const applyAiRecommendations = () => {
    if (liveAi) {
      setCategory(liveAi.recommendedCategory as typeof category);
      setPriority(liveAi.recommendedPriority as typeof priority);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch<{
        ticket: { _id: string; ticketNumber: string; category: typeof category; priority: typeof priority; slaHours?: number };
        autoEscalated?: boolean;
        autoAssigned?: boolean;
        assignedTo?: string;
        assignedAgents?: string[];
      }>("/tickets", {
        method: "POST",
        body: JSON.stringify({ title, description, category, priority }),
      });

      const assignedDisplay =
        data.assignedAgents && data.assignedAgents.length > 0
          ? data.assignedAgents.join(" & ")
          : data.assignedTo || "AI Availability Queue (Sarah Agent)";

      const ticketId = String(data.ticket._id);

      setCreatedTicketInfo({
        id: ticketId,
        ticketNumber: data.ticket.ticketNumber,
        assignedToName: assignedDisplay,
        category: data.ticket.category,
        priority: data.ticket.priority,
        slaHours: data.ticket.slaHours || slaHoursPreview[priority],
        autoEscalated: Boolean(data.autoEscalated),
      });

      setSuccess(true);

      setTimeout(() => {
        router.push(`/tickets/${ticketId}?created=true`);
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
      setLoading(false);
    }
  };

  const slaHoursPreview: Record<string, number> = {
    URGENT: 2,
    HIGH: 8,
    MEDIUM: 24,
    LOW: 48,
  };

  if (currentUser?.role === "AGENT") {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex flex-col">
        <Navbar currentUser={currentUser} />
        <main className="flex-1 max-w-xl w-full mx-auto px-4 py-16 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-brand-dark">Agent Support Duty Mode</h2>
          <p className="text-xs text-gray-600 leading-relaxed max-w-md">
            Support agents resolve and triage customer issues. Standard customer tickets must be submitted by customers or administrators on their behalf.
          </p>
          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/?filter=my_assigned"
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-dark transition shadow-xs"
            >
              🎯 View My Assigned Tickets
            </Link>
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-white border border-brand-light hover:bg-brand-light transition"
            >
              All Active Tickets
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col">
      <Navbar currentUser={currentUser} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-dark mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-black text-brand-dark tracking-tight">
            Create Support Ticket
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Submit your issue. Our AI will analyze urgency, predict SLA response time, and dispatch to engineers.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Prominent Floating Toast Confirmation Modal */}
        {success && createdTicketInfo && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-brand-mint space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mx-auto text-brand-primary border border-brand-mint shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-brand-primary animate-bounce" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block mb-2 whitespace-nowrap">
                  ✓ Ticket Raised Successfully!
                </span>
                <h3 className="text-xl font-black text-brand-dark">
                  Ticket #{createdTicketInfo.ticketNumber}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Your ticket has been logged and instantly prioritized by AI Dispatch.
                </p>
              </div>

              <div className="p-4 bg-brand-light/50 rounded-2xl border border-brand-light text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Priority:</span>
                  <span className="font-bold text-gray-900 px-2 py-0.5 rounded bg-white border border-brand-light whitespace-nowrap">
                    {createdTicketInfo.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Assigned Support:</span>
                  <span className="font-bold text-brand-dark flex items-center gap-1 whitespace-nowrap">
                    <Headset className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    <span>{createdTicketInfo.assignedToName}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Guaranteed Response:</span>
                  <span className="font-bold text-brand-primary whitespace-nowrap">
                    Within {createdTicketInfo.slaHours} Hours
                  </span>
                </div>
                {createdTicketInfo.autoEscalated && (
                  <div className="pt-2 border-t border-brand-light text-[11px] text-red-600 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    Auto-Escalated directly to Senior Tech Lead!
                  </div>
                )}
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="w-full bg-brand-light h-1.5 rounded-full overflow-hidden">
                  <div className="bg-brand-primary h-full rounded-full transition-all duration-1000" style={{ width: "100%" }} />
                </div>
                <p className="text-[11px] text-gray-400">
                  Opening ticket room now...
                </p>
              </div>

              <Link
                href={`/tickets/${createdTicketInfo.id}?created=true`}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-dark shadow-xs transition whitespace-nowrap shrink-0"
              >
                <span>View Ticket Room</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-brand-mint text-brand-dark text-xs rounded-xl flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
            <span className="font-bold">Ticket created successfully! Redirecting to ticket room...</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-brand-light">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  Subject / Issue Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cannot complete checkout - error 500 on payments"
                  className="w-full text-xs p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  required
                  maxLength={150}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as typeof category)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
                  >
                    <option value="GENERAL">General Inquiry</option>
                    <option value="TECHNICAL">Technical Issue / Bug</option>
                    <option value="BILLING">Billing & Payments</option>
                    <option value="ACCOUNT">Account & Access</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    Priority *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as typeof priority)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white font-semibold"
                  >
                    <option value="LOW">Low (48h SLA)</option>
                    <option value="MEDIUM">Medium (24h SLA)</option>
                    <option value="HIGH">High (8h SLA)</option>
                    <option value="URGENT">🚨 Urgent (2h SLA)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  Detailed Description *
                </label>
                <textarea
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what happened, error messages, and reproduction steps..."
                  className="w-full text-xs p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  required
                  minLength={10}
                />
              </div>

              <div className="p-3 bg-brand-light/30 rounded-xl border border-brand-light flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4 text-brand-primary" />
                  <span>Guaranteed SLA Response Window:</span>
                </div>
                <span className="font-bold px-2 py-0.5 rounded text-white text-[11px] bg-brand-dark">
                  Within {slaHoursPreview[priority]} Hours
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-bold text-white shadow-xs transition hover:opacity-95 bg-brand-primary hover:bg-brand-dark whitespace-nowrap shrink-0"
              >
                <Send className="w-4 h-4 shrink-0" />
                <span>{loading ? "Analyzing & Submitting Ticket..." : "Submit Support Ticket"}</span>
              </button>
            </form>
          </div>

          {/* Live AI Sidebar Preview */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-brand-light space-y-4">
              <div className="flex items-center gap-2 text-brand-dark font-bold text-sm pb-2 border-b border-brand-light">
                <Headset className="w-4 h-4 text-brand-primary" />
                Live AI Triage Preview
              </div>

              {liveAi ? (
                <div className="space-y-3">
                  <div className="p-3 bg-brand-light/40 rounded-lg border border-brand-light space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Detected Sentiment
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800">
                        {liveAi.sentiment}
                      </span>
                      <span className="text-xs font-mono text-gray-500">
                        Score: {liveAi.sentimentScore}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-brand-light/40 rounded-lg border border-brand-light space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Urgency Level
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-brand-light h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${liveAi.urgencyScore > 70 ? "bg-red-600" : "bg-brand-primary"}`}
                          style={{ width: `${liveAi.urgencyScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-800">
                        {liveAi.urgencyScore}/100
                      </span>
                    </div>
                  </div>

                  {liveAi.autoEscalate && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 flex items-start gap-1.5">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                      <span>
                        <strong>Auto-Escalation Alert: </strong> High distress detected. This ticket will automatically jump straight to <strong>ESCALATED</strong> status!
                      </span>
                    </div>
                  )}

                  <div className="p-3 bg-brand-light/40 rounded-lg border border-brand-light space-y-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      AI Suggested Settings
                    </span>
                    <div className="text-xs text-gray-700 flex justify-between">
                      <span>Category: <strong>{liveAi.recommendedCategory}</strong></span>
                      <span>Priority: <strong>{liveAi.recommendedPriority}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={applyAiRecommendations}
                      className="w-full py-1.5 text-[11px] font-bold text-brand-dark bg-brand-mint/20 hover:bg-brand-mint/40 rounded transition"
                    >
                      Apply AI Suggestions
                    </button>

                    <div className="p-2.5 bg-brand-primary/10 border border-brand-primary/30 rounded-lg text-[11px] text-brand-dark flex items-start gap-2">
                      <Headset className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                      <span>
                        {priority === "URGENT" || liveAi.urgencyScore >= 75 ? (
                          <>
                            <strong>AI Priority Multi-Agent Dispatch: </strong>
                            Critical urgency detected. Will auto-assign a <strong>Dual-Agent Team (Lead + Co-Pilot)</strong> from available staff.
                          </>
                        ) : (
                          <>
                            <strong>AI Auto-Assignment: </strong>
                            Automatically assigns ticket to the least-loaded available agent based on real-time capacity.
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 space-y-2">
                  <Headset className="w-8 h-8 mx-auto text-gray-300 animate-pulse" />
                  <p className="text-xs">
                    Start typing your title and description to see live AI sentiment, urgency score, and automated agent assignment.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Demo Presets */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-brand-light space-y-2">
              <span className="text-xs font-bold text-gray-700 block">
                ⚡ Try Sample Scenarios:
              </span>
              <button
                type="button"
                onClick={() => {
                  setTitle("Urgent payment crash - account charged 3 times!");
                  setDescription("Your checkout crashed with a 500 internal server error and debited my card three times. This is totally unacceptable, reverse it immediately!");
                  setCategory("BILLING");
                  setPriority("URGENT");
                }}
                className="w-full text-left p-2 rounded text-[11px] bg-brand-light hover:bg-gray-200 text-gray-800 transition"
              >
                🚨 <strong>Critical Outage (Auto-Escalates)</strong>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTitle("My account is deactivated");
                  setDescription("amar account ta deactivate hoye gese keno solve koro");
                  setCategory("ACCOUNT");
                  setPriority("URGENT");
                }}
                className="w-full text-left p-2 rounded text-[11px] bg-brand-light hover:bg-gray-200 text-gray-800 transition"
              >
                🔒 <strong>Account Deactivated (Urgent / Banglish)</strong>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTitle("White screen error and timeout on dashboard");
                  setDescription("Every time I navigate to the dashboard, it shows a blank white screen with an API timeout 504 error. Please check immediately.");
                  setCategory("TECHNICAL");
                  setPriority("HIGH");
                }}
                className="w-full text-left p-2 rounded text-[11px] bg-brand-light hover:bg-gray-200 text-gray-800 transition"
              >
                🐞 <strong>Technical Bug (High Priority)</strong>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTitle("Need assistance updating email address on team profile");
                  setDescription("Hello, we recently migrated our domain and would like to update our billing contact email address. Thank you for your support!");
                  setCategory("ACCOUNT");
                  setPriority("LOW");
                }}
                className="w-full text-left p-2 rounded text-[11px] bg-brand-light hover:bg-gray-200 text-gray-800 transition"
              >
                💬 <strong>Polite Account Inquiry (Safe SLA)</strong>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

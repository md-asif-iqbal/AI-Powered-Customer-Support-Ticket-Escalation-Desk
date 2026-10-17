"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import {
  Sparkles,
  Send,
  AlertCircle,
  Clock,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { analyzeTicketHeuristically } from "@/lib/ai-service";
import { apiFetch } from "@/lib/api";
import { ITicket } from "@/lib/models/Ticket";

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
      setLiveAi(null);
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
      const data = await apiFetch<{ ticket: ITicket }>("/tickets", {
        method: "POST",
        body: JSON.stringify({ title, description, category, priority }),
      });

      setSuccess(true);
      setTimeout(() => {
        router.push(`/tickets/${data.ticket._id}`);
      }, 1000);
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

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-brand-mint text-brand-dark text-xs rounded-xl flex items-center gap-2">
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
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-bold text-white shadow-xs transition hover:opacity-95 bg-brand-primary hover:bg-brand-dark"
              >
                <Send className="w-4 h-4" />
                {loading ? "Analyzing & Submitting Ticket..." : "Submit Support Ticket"}
              </button>
            </form>
          </div>

          {/* Live AI Sidebar Preview */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-brand-light space-y-4">
              <div className="flex items-center gap-2 text-brand-dark font-bold text-sm pb-2 border-b border-brand-light">
                <Sparkles className="w-4 h-4 text-brand-primary" />
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
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-gray-300 animate-pulse" />
                  <p className="text-xs">
                    Start typing your title and description to see live AI sentiment and escalation suggestions.
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

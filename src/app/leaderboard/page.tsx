"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { apiFetch } from "@/lib/api";
import {
  Trophy,
  Award,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Layers,
  Star,
} from "lucide-react";

interface LeaderboardItem {
  id: string;
  name: string;
  email: string;
  role: "AGENT" | "ADMIN";
  totalAssigned: number;
  ticketsResolved: number;
  activeTickets: number;
  slaComplianceRate: number;
  avgResolutionTimeHours: number;
  customerSatisfaction: number;
  avgRating?: number;
  reviewCount?: number;
  reportsCount?: number;
  recentReviews?: Array<{ rating: number; comment: string; submittedAt: string; ticketNumber: string }>;
  aiPerformanceScore: number;
  availability: "Free" | "Available" | "Busy";
  rank: number;
  badge: string;
}

interface LeaderboardSummary {
  topPerformer: LeaderboardItem | null;
  totalTeamResolved: number;
  avgTeamSla: number;
  activeStaffCount: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [summary, setSummary] = useState<LeaderboardSummary | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    userId: string;
    name: string;
    email: string;
    role: "CUSTOMER" | "AGENT" | "ADMIN";
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("ALL");

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{
        leaderboard: LeaderboardItem[];
        summary: LeaderboardSummary;
      }>("/stats/leaderboard");
      setLeaderboard(data.leaderboard || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check current user
    apiFetch<{ user: { userId: string; name: string; email: string; role: "CUSTOMER" | "AGENT" | "ADMIN" } }>("/auth/me")
      .then((res) => {
        if (res?.user) setCurrentUser(res.user);
      })
      .catch(() => {});

    fetchLeaderboard();
  }, []);

  const filteredLeaderboard = useMemo(() => {
    return leaderboard.filter((agent) => {
      const matchesSearch =
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.badge.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAvailability =
        availabilityFilter === "ALL" || agent.availability === availabilityFilter;

      return matchesSearch && matchesAvailability;
    });
  }, [leaderboard, searchQuery, availabilityFilter]);

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="min-h-screen bg-brand-light/30 text-gray-900 pb-16">
      <Navbar currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-brand-dark via-brand-primary to-brand-dark rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-brand-mint backdrop-blur-xs border border-white/10">
                <Cpu className="w-3.5 h-3.5" />
                AI Real-Time Workforce Analytics & Service Scoring
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Support Agent Service Leaderboard
              </h1>
              <p className="text-sm text-gray-200 max-w-2xl leading-relaxed">
                Autonomous performance ranking calculated from resolved ticket volume, SLA speed, customer sentiment CSAT, and real-time active queue capacity.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchLeaderboard}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white/15 hover:bg-white/25 text-white rounded-xl transition border border-white/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Calculating..." : "Re-calculate Score"}
              </button>

              <Link
                href="/"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-brand-mint text-brand-dark rounded-xl shadow-xs transition hover:bg-emerald-300"
              >
                View Tickets
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Decorative Background Blur */}
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-brand-mint/15 blur-3xl pointer-events-none" />
        </div>

        {/* Live KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-brand-light shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              Top AI Performer
            </span>
            <div className="text-lg font-black text-brand-dark truncate">
              {summary?.topPerformer?.name || "Evaluating..."}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              Score: <span className="font-mono font-bold text-brand-primary">{summary?.topPerformer?.aiPerformanceScore || 0}/100</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-brand-light shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Team Serviced Tickets
            </span>
            <div className="text-2xl font-black text-gray-900">
              {summary?.totalTeamResolved ?? 0}
            </div>
            <div className="text-xs text-gray-500">
              Successfully resolved issues
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-brand-light shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-primary" />
              Team SLA Compliance
            </span>
            <div className="text-2xl font-black text-brand-dark">
              {summary?.avgTeamSla ?? 100}%
            </div>
            <div className="text-xs text-gray-500">
              Resolution within SLA deadline
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-brand-light shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              Active Support Team
            </span>
            <div className="text-2xl font-black text-gray-900">
              {summary?.activeStaffCount ?? 0}
            </div>
            <div className="text-xs text-gray-500">
              Assigned agents & specialists
            </div>
          </div>
        </div>

        {/* Podium for Top 3 Performers */}
        {top3.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-brand-dark flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Top 3 Support Leaders (AI Performance Podium)
              </h2>
              <span className="text-xs text-gray-500">Ranked by weighted service score</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {top3.map((agent, index) => {
                const podiumTheme = [
                  {
                    border: "border-amber-400/60",
                    badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
                    medal: "🥇 1st Place",
                    glow: "shadow-amber-100",
                    gradient: "from-amber-50/50 to-white",
                    rankBg: "bg-amber-500 text-white",
                  },
                  {
                    border: "border-slate-300",
                    badgeBg: "bg-slate-100 text-slate-800 border-slate-300",
                    medal: "🥈 2nd Place",
                    glow: "shadow-slate-100",
                    gradient: "from-slate-50/50 to-white",
                    rankBg: "bg-slate-400 text-white",
                  },
                  {
                    border: "border-amber-700/30",
                    badgeBg: "bg-amber-50 text-amber-900 border-amber-200",
                    medal: "🥉 3rd Place",
                    glow: "shadow-orange-50",
                    gradient: "from-orange-50/30 to-white",
                    rankBg: "bg-amber-700 text-white",
                  },
                ][index];

                return (
                  <div
                    key={agent.id}
                    className={`rounded-2xl border-2 ${podiumTheme.border} bg-gradient-to-b ${podiumTheme.gradient} p-6 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-4`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${podiumTheme.rankBg} shadow-xs`}
                        >
                          #{agent.rank}
                        </div>
                        <div>
                          <div className="font-bold text-base text-gray-900">
                            {agent.name}
                          </div>
                          <div className="text-xs text-gray-500">{agent.email}</div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${podiumTheme.badgeBg}`}
                      >
                        {podiumTheme.medal}
                      </span>
                    </div>

                    {/* AI Badge & Availability */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-light text-brand-dark border border-brand-mint/40">
                        {agent.badge}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          agent.availability === "Free"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : agent.availability === "Available"
                            ? "bg-blue-50 text-blue-800 border-blue-300"
                            : "bg-amber-50 text-amber-800 border-amber-300"
                        }`}
                      >
                        ● {agent.availability} ({agent.activeTickets} active)
                      </span>
                    </div>

                    {/* Performance Progress */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-600">
                          AI Performance Score
                        </span>
                        <span className="font-mono font-black text-brand-dark text-sm">
                          {agent.aiPerformanceScore} / 100
                        </span>
                      </div>
                      <div className="w-full bg-brand-light h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-brand-primary h-full rounded-full transition-all duration-700"
                          style={{ width: `${agent.aiPerformanceScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Customer Rating & Reports Pill */}
                    <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-white/90 border border-brand-light">
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-gray-900 font-black">{agent.avgRating || 5.0}</span>
                        <span className="text-gray-500 text-[10px]">({agent.reviewCount || 0} reviews)</span>
                      </div>

                      {agent.reportsCount && agent.reportsCount > 0 ? (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap shrink-0">
                          <ShieldAlert className="w-3 h-3 text-red-600" />
                          {agent.reportsCount} Reported (-{agent.reportsCount * 15} pts)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap shrink-0">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Clean Record
                        </span>
                      )}
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-brand-light/70 text-center">
                      <div className="bg-white/80 p-2 rounded-lg border border-brand-light">
                        <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                          Solved
                        </span>
                        <span className="text-xs font-black text-gray-900">
                          {agent.ticketsResolved}
                        </span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-brand-light">
                        <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                          SLA Rate
                        </span>
                        <span className="text-xs font-black text-brand-dark">
                          {agent.slaComplianceRate}%
                        </span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-brand-light">
                        <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                          Avg Speed
                        </span>
                        <span className="text-xs font-black text-gray-900">
                          {agent.avgResolutionTimeHours}h
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Leaderboard Table */}
        <div className="bg-white rounded-3xl border border-brand-light shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-brand-dark flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-primary" />
                Comprehensive Agent Service Standings
              </h2>
              <p className="text-xs text-gray-500">
                Detailed breakdowns of tickets serviced, SLA compliance, and capacity
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-brand-light/40 border border-brand-light rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary text-gray-800"
                />
              </div>

              {/* Availability Filter */}
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="text-xs bg-brand-light/40 border border-brand-light rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-brand-primary font-semibold text-gray-700"
              >
                <option value="ALL">All Availability</option>
                <option value="Free">🟢 Free (0 active)</option>
                <option value="Available">🟡 Available (1-2 active)</option>
                <option value="Busy">🔴 Busy (3+ active)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-light/60 text-brand-dark uppercase tracking-wider text-[10px] font-bold border-y border-brand-light">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Rank</th>
                  <th className="py-3 px-4 whitespace-nowrap">Agent Name & Role</th>
                  <th className="py-3 px-4 whitespace-nowrap">Capacity Status</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Tickets Solved</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Active Load</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">SLA Compliance</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Avg Resolution</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">⭐ Rating & Reviews</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Customer CSAT</th>
                  <th className="py-3 px-4 whitespace-nowrap">AI Score</th>
                  <th className="py-3 px-4 whitespace-nowrap">Badge & Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-light">
                {filteredLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-gray-400 text-xs">
                      No support agents matched your search query.
                    </td>
                  </tr>
                ) : (
                  filteredLeaderboard.map((agent) => (
                    <tr key={agent.id} className="hover:bg-brand-light/20 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-700 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black ${
                            agent.rank === 1
                              ? "bg-amber-400 text-amber-950"
                              : agent.rank === 2
                              ? "bg-slate-300 text-slate-800"
                              : agent.rank === 3
                              ? "bg-amber-700 text-white"
                              : "bg-brand-light text-gray-600"
                          }`}
                        >
                          {agent.rank}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900">{agent.name}</div>
                        <div className="text-[11px] text-gray-500">{agent.email}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            agent.availability === "Free"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : agent.availability === "Available"
                              ? "bg-blue-50 text-blue-800 border-blue-300"
                              : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              agent.availability === "Free"
                                ? "bg-emerald-500"
                                : agent.availability === "Available"
                                ? "bg-blue-500"
                                : "bg-amber-500"
                            }`}
                          />
                          {agent.availability}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-gray-900 whitespace-nowrap">
                        {agent.ticketsResolved}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-medium text-gray-600 whitespace-nowrap">
                        {agent.activeTickets}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`font-mono font-bold ${
                            agent.slaComplianceRate >= 90
                              ? "text-emerald-700"
                              : agent.slaComplianceRate >= 75
                              ? "text-amber-700"
                              : "text-red-700"
                          }`}
                        >
                          {agent.slaComplianceRate}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono text-gray-700 whitespace-nowrap">
                        {agent.avgResolutionTimeHours} hrs
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{agent.avgRating || 5.0}</span>
                          <span className="text-[10px] text-gray-500">({agent.reviewCount || 0})</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {agent.customerSatisfaction}%
                      </td>

                      <td className="py-3.5 px-4 min-w-[130px] whitespace-nowrap">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-mono font-black text-brand-dark">
                            {agent.aiPerformanceScore}
                          </span>
                          <span className="text-[10px] text-gray-400">/ 100</span>
                        </div>
                        <div className="w-full bg-brand-light h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-primary h-full rounded-full"
                            style={{ width: `${agent.aiPerformanceScore}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-brand-light text-brand-dark border border-brand-mint/40 whitespace-nowrap shrink-0">
                            {agent.badge}
                          </span>
                          {agent.reportsCount && agent.reportsCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-red-100 text-red-800 border border-red-300 whitespace-nowrap shrink-0">
                              <ShieldAlert className="w-2.5 h-2.5 text-red-600" />
                              {agent.reportsCount} Report Penalized
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold text-emerald-700 flex items-center gap-1 whitespace-nowrap shrink-0">
                              <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                              Clean Audit
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Priority Dispatch & Multi-Agent Allocation Rules */}
        <div className="bg-white rounded-3xl border border-brand-light shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 text-brand-dark font-bold text-sm">
            <Layers className="w-5 h-5 text-brand-primary" />
            <h3>AI Priority Auto-Assignment & Multi-Agent Workload Matrix</h3>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            The platform dynamically assigns tickets using real-time availability queues, priority matching, and domain specialization:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 space-y-2">
              <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                🚨 URGENT Priority (Multi-Agent Dispatch)
              </div>
              <p className="text-[11px] text-red-800 leading-relaxed">
                When critical outages or severe customer frustration (Urgency &gt;= 75) is detected, AI automatically pairs a <strong>Primary Lead Agent</strong> with a <strong>Collaborating Co-Pilot</strong> from free staff to ensure rapid resolution.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                ⚡ HIGH Priority (Top Free Specialist)
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                High-priority issues are routed to available agents with <strong>0 active tickets</strong> and top domain expertise in Technical or Billing systems before considering other staff.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-brand-light bg-brand-light/30 space-y-2">
              <div className="flex items-center gap-2 text-brand-dark font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
                💬 MEDIUM & LOW (Workload Balancing)
              </div>
              <p className="text-[11px] text-gray-700 leading-relaxed">
                General inquiries and routine tasks are evenly distributed among available agents based on lowest active ticket backlog to prevent agent burnout and bottleneck delays.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

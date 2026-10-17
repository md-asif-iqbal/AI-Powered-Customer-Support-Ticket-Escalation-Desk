"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { SlaBadge } from "@/components/SlaBadge";
import { ITicket } from "@/lib/models/Ticket";
import { SlaCalculationResult } from "@/lib/sla";
import { apiFetch } from "@/lib/api";
import {
  PlusCircle,
  Search,
  ShieldAlert,
  Clock,
  ArrowRight,
  TrendingUp,
  Inbox,
  Headset,
} from "lucide-react";

interface EnrichedTicket extends Omit<ITicket, "customer" | "assignedTo"> {
  customer: { _id: string; name: string; email: string; role: string };
  assignedTo?: { _id: string; name: string; email: string; role: string };
  slaStatus: SlaCalculationResult;
}

interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  escalated: number;
  resolved: number;
  closed: number;
  urgent: number;
  breached: number;
  slaComplianceRate: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    userId: string;
    name: string;
    email: string;
    role: "CUSTOMER" | "AGENT" | "ADMIN";
  } | null>(null);

  const [tickets, setTickets] = useState<EnrichedTicket[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);
      if (selectedPriority !== "ALL") params.append("priority", selectedPriority);
      if (selectedCategory !== "ALL") params.append("category", selectedCategory);
      if (search.trim()) params.append("q", search.trim());

      const [ticketsData, statsData] = await Promise.all([
        apiFetch<{ tickets: EnrichedTicket[] }>(`/tickets?${params.toString()}`),
        apiFetch<{ stats: DashboardStats }>("/stats"),
      ]);

      setTickets(ticketsData.tickets || []);
      setStats(statsData.stats || null);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedPriority, selectedCategory, search, router]);

  useEffect(() => {
    apiFetch<{ user: typeof currentUser }>("/auth/me")
      .then((data) => {
        if (!data.user) {
          router.push("/login");
        } else {
          setCurrentUser(data.user);
          loadData();
        }
      })
      .catch(() => router.push("/login"));
  }, [loadData, router]);

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col">
      <Navbar currentUser={currentUser} onRefresh={loadData} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Welcome & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-brand-dark tracking-tight">
              Support & Escalation Operations
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Real-time ticket tracking, SLA countdowns, and AI-powered sentiment triage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/tickets/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition hover:opacity-95 bg-brand-primary"
            >
              <PlusCircle className="w-4 h-4" />
              Create Ticket
            </Link>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Tickets */}
            <div className="bg-white p-5 rounded-2xl border border-brand-light shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Total Active
                </span>
                <Inbox className="w-4 h-4 text-brand-dark" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-brand-dark">{stats.total}</span>
                <span className="text-xs text-gray-400">tickets</span>
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-white p-5 rounded-2xl border border-brand-light shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  In Progress
                </span>
                <Clock className="w-4 h-4 text-brand-primary" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-brand-primary">
                  {stats.inProgress + stats.open}
                </span>
                <span className="text-xs text-gray-400">in queue</span>
              </div>
            </div>

            {/* Escalated Queue */}
            <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
                  Escalated Queue
                </span>
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-red-600">{stats.escalated}</span>
                <span className="text-xs text-red-500 font-semibold">needs action</span>
              </div>
            </div>

            {/* SLA Compliance */}
            <div className="bg-white p-5 rounded-2xl border border-brand-light shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  SLA Compliance
                </span>
                <TrendingUp className="w-4 h-4 text-brand-mint" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-brand-dark">
                  {stats.slaComplianceRate}%
                </span>
                <span className="text-xs text-gray-400">
                  {stats.breached} breached
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-brand-light shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket # or keywords..."
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white text-gray-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ESCALATED">🚨 Escalated</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white text-gray-700"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent (2h SLA)</option>
                <option value="HIGH">High (8h SLA)</option>
                <option value="MEDIUM">Medium (24h SLA)</option>
                <option value="LOW">Low (48h SLA)</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white text-gray-700"
              >
                <option value="ALL">All Categories</option>
                <option value="TECHNICAL">Technical</option>
                <option value="BILLING">Billing</option>
                <option value="ACCOUNT">Account</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
            <span>Ticket Queue ({tickets.length})</span>
            <span>Sorted by Latest</span>
          </div>

          {loading ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-brand-light space-y-3">
              <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-400 font-medium">Refreshing tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-brand-light space-y-3">
              <Inbox className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-gray-700">No tickets match the selected filters</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Try resetting your search query or create a new support ticket using the button above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {tickets.map((t) => (
                <Link
                  key={t._id.toString()}
                  href={`/tickets/${t._id}`}
                  className="block bg-white p-5 rounded-2xl border border-brand-light shadow-xs hover:shadow-md hover:border-brand-primary/40 transition group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-gray-400">
                          {t.ticketNumber}
                        </span>
                        <StatusBadge status={t.status} size="sm" />
                        <PriorityBadge priority={t.priority} size="sm" />
                        <span className="text-[11px] font-semibold text-gray-500 bg-brand-light px-2 py-0.5 rounded">
                          {t.category}
                        </span>

                        {t.aiAnalysis && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded ${
                              t.aiAnalysis.sentiment === "FRUSTRATED"
                                ? "bg-red-100 text-red-800"
                                : t.aiAnalysis.sentiment === "NEGATIVE"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            <Headset className="w-2.5 h-2.5" />
                            {t.aiAnalysis.sentiment}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-gray-900 group-hover:text-brand-dark transition truncate">
                        {t.title}
                      </h3>

                      <p className="text-xs text-gray-500 line-clamp-1">
                        {t.description}
                      </p>

                      <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-3 pt-1">
                        <span>Customer: <strong>{t.customer?.name}</strong></span>
                        <span>•</span>
                        <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* SLA Timer & Arrow */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-brand-light">
                      <SlaBadge slaStatus={t.slaStatus} />
                      <div className="flex items-center gap-1 text-xs font-bold text-brand-primary group-hover:translate-x-1 transition">
                        <span>View</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

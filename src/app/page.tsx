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
  Target,
  UserCheck,
  Users,
  Check,
  X,
} from "lucide-react";

interface EnrichedTicket extends Omit<ITicket, "_id" | "customer" | "assignedTo" | "assignedAgents"> {
  _id: string;
  customer: { _id: string; name: string; email: string; role: string };
  assignedTo?: { _id: string; name: string; email: string; role: string };
  assignedAgents?: { _id: string; name: string; email: string; role: string }[];
  slaStatus: SlaCalculationResult;
}

interface AgentOption {
  _id: string;
  name: string;
  email: string;
  role: string;
  activeTickets: number;
  availability: string;
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
    assignedTicketsCount?: number;
  } | null>(null);

  const [tickets, setTickets] = useState<EnrichedTicket[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [onlyAssignedToMe, setOnlyAssignedToMe] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("filter") === "my_assigned";
    }
    return false;
  });
  const [assignedCount, setAssignedCount] = useState<number>(0);

  // Admin Quick Assign States
  const [availableAgents, setAvailableAgents] = useState<AgentOption[]>([]);
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);
  const [assignSuccessTicketId, setAssignSuccessTicketId] = useState<string | null>(null);

  // Multi-Agent Modal State
  const [teamModalTicket, setTeamModalTicket] = useState<EnrichedTicket | null>(null);
  const [selectedTeamAgentIds, setSelectedTeamAgentIds] = useState<string[]>([]);
  const [savingTeam, setSavingTeam] = useState(false);

  const loadAvailableAgents = useCallback(async () => {
    try {
      const res = await apiFetch<{ agents: AgentOption[] }>("/tickets/agents/available");
      setAvailableAgents(res.agents || []);
    } catch (err) {
      console.error("Failed to fetch available agents:", err);
    }
  }, []);

  const handleQuickAssign = async (ticketId: string, currentStatus: string, newAgentId: string) => {
    try {
      setAssigningTicketId(ticketId);
      const res = await apiFetch<{ ticket: EnrichedTicket }>(`/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: currentStatus,
          assignedTo: newAgentId || null,
          assignedAgents: newAgentId ? [newAgentId] : [],
        }),
      });

      setTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? { ...t, ...res.ticket } : t))
      );
      setAssignSuccessTicketId(ticketId);
      setTimeout(() => setAssignSuccessTicketId(null), 2500);
      loadAvailableAgents();
    } catch (err) {
      console.error("Failed to assign agent:", err);
    } finally {
      setAssigningTicketId(null);
    }
  };

  const handleOpenTeamModal = (t: EnrichedTicket) => {
    setTeamModalTicket(t);
    const current: string[] =
      t.assignedAgents && t.assignedAgents.length > 0
        ? t.assignedAgents.map((a) => (typeof a === "object" && a._id ? a._id : String(a)))
        : t.assignedTo
        ? [typeof t.assignedTo === "object" && t.assignedTo._id ? t.assignedTo._id : String(t.assignedTo)]
        : [];
    setSelectedTeamAgentIds(current);
  };

  const handleToggleTeamAgent = (agentId: string) => {
    setSelectedTeamAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const handleSaveTeam = async () => {
    if (!teamModalTicket) return;
    try {
      setSavingTeam(true);
      const res = await apiFetch<{ ticket: EnrichedTicket }>(`/tickets/${teamModalTicket._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: teamModalTicket.status,
          assignedAgents: selectedTeamAgentIds,
          assignedTo: selectedTeamAgentIds[0] || null,
        }),
      });

      setTickets((prev) =>
        prev.map((t) => (t._id === teamModalTicket._id ? { ...t, ...res.ticket } : t))
      );
      setAssignSuccessTicketId(teamModalTicket._id);
      setTimeout(() => setAssignSuccessTicketId(null), 2500);
      setTeamModalTicket(null);
      loadAvailableAgents();
    } catch (err) {
      console.error("Failed to save team:", err);
    } finally {
      setSavingTeam(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);
      if (selectedPriority !== "ALL") params.append("priority", selectedPriority);
      if (selectedCategory !== "ALL") params.append("category", selectedCategory);
      if (search.trim()) params.append("q", search.trim());
      if (onlyAssignedToMe) params.append("assignedToMe", "true");

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
  }, [selectedStatus, selectedPriority, selectedCategory, search, onlyAssignedToMe, router]);

  useEffect(() => {
    apiFetch<{ user: typeof currentUser; assignedTicketsCount?: number }>("/auth/me")
      .then((data) => {
        if (!data.user) {
          router.push("/login");
        } else {
          setCurrentUser(data.user);
          if (typeof data.assignedTicketsCount === "number") {
            setAssignedCount(data.assignedTicketsCount);
          }
          if (data.user.role === "ADMIN") {
            loadAvailableAgents();
          }
          loadData();
        }
      })
      .catch(() => router.push("/login"));
  }, [loadData, loadAvailableAgents, router]);

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col">
      <Navbar currentUser={currentUser} assignedTicketsCount={assignedCount} onRefresh={loadData} />

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
            {currentUser?.role !== "AGENT" ? (
              <Link
                href="/tickets/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition hover:opacity-95 bg-brand-primary"
              >
                <PlusCircle className="w-4 h-4" />
                Create Ticket
              </Link>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-light text-brand-dark border border-brand-mint/40">
                <Headset className="w-4 h-4 text-brand-primary" />
                <span>Agent Support Workspace</span>
              </div>
            )}
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
          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOnlyAssignedToMe(false)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  !onlyAssignedToMe
                    ? "bg-brand-dark text-white shadow-xs"
                    : "bg-white text-gray-700 border border-brand-light hover:bg-brand-light"
                }`}
              >
                All Tickets
              </button>

              {(currentUser?.role === "AGENT" || currentUser?.role === "ADMIN") && (
                <button
                  type="button"
                  onClick={() => setOnlyAssignedToMe(true)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    onlyAssignedToMe
                      ? "bg-brand-primary text-white shadow-xs"
                      : "bg-white text-gray-700 border border-brand-light hover:bg-brand-light"
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>🎯 Assigned to Me</span>
                  {assignedCount > 0 && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        onlyAssignedToMe ? "bg-white text-brand-dark" : "bg-brand-light text-brand-dark"
                      }`}
                    >
                      {assignedCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {onlyAssignedToMe && (
              <span className="text-[11px] font-semibold text-brand-primary bg-brand-light px-2.5 py-1 rounded-md">
                Filtering by: Tickets Assigned to You
              </span>
            )}
          </div>

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
              {tickets.map((t) => {
                const isAdmin = currentUser?.role === "ADMIN";
                const isResolvedOrClosed = t.status === "RESOLVED" || t.status === "CLOSED";
                const canAdminAssign = isAdmin && !isResolvedOrClosed;

                return (
                  <div
                    key={t._id.toString()}
                    className="bg-white p-5 rounded-2xl border border-brand-light shadow-xs hover:shadow-md hover:border-brand-primary/40 transition group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
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

                        <Link href={`/tickets/${t._id}`} className="block">
                          <h3 className="text-sm font-bold text-gray-900 group-hover:text-brand-dark transition truncate">
                            {t.title}
                          </h3>
                        </Link>

                        <p className="text-xs text-gray-500 line-clamp-1">
                          {t.description}
                        </p>

                        <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-3 pt-1">
                          <span>Customer: <strong>{t.customer?.name}</strong></span>
                          <span>•</span>
                          <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1.5">
                            <Headset className="w-3.5 h-3.5 text-brand-primary" />
                            <span>Assigned:</span>
                            {t.assignedAgents && t.assignedAgents.length > 0 ? (
                              <strong className="text-brand-dark">
                                {t.assignedAgents.map((a) => a.name).join(" & ")}
                              </strong>
                            ) : t.assignedTo ? (
                              <strong className="text-brand-dark">{t.assignedTo.name}</strong>
                            ) : (
                              <span className="text-amber-600 font-semibold italic">Unassigned</span>
                            )}
                          </span>
                        </div>

                        {/* Admin Direct Quick Assign Bar (Active for all tickets except RESOLVED and CLOSED) */}
                        {canAdminAssign && (
                          <div className="pt-2.5 mt-2 border-t border-brand-light flex flex-wrap items-center gap-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-dark flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-brand-primary" />
                              Admin Assign:
                            </span>

                            <div className="relative inline-flex items-center">
                              <select
                                disabled={assigningTicketId === t._id}
                                value={t.assignedTo?._id || ""}
                                onChange={(e) => handleQuickAssign(t._id, t.status, e.target.value)}
                                className="text-xs py-1.5 px-3 rounded-lg border border-brand-mint/60 bg-white text-brand-dark font-semibold focus:ring-2 focus:ring-brand-primary focus:outline-none shadow-2xs hover:border-brand-primary cursor-pointer"
                              >
                                <option value="">-- Assign Support Agent --</option>
                                {availableAgents.map((agent) => (
                                  <option key={agent._id} value={agent._id}>
                                    {agent.name} • {agent.availability} ({agent.activeTickets} active)
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenTeamModal(t)}
                              className="text-[11px] font-bold text-brand-primary hover:text-brand-dark hover:underline underline-offset-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-light/70 border border-brand-mint/30 transition hover:bg-brand-mint/20"
                            >
                              <Users className="w-3.5 h-3.5 text-brand-primary" />
                              Manage Team
                            </button>

                            {assignSuccessTicketId === t._id && (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Assigned!
                              </span>
                            )}

                            {assigningTicketId === t._id && (
                              <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                                Updating...
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* SLA Timer & Arrow */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-brand-light">
                        <SlaBadge slaStatus={t.slaStatus} />
                        <Link
                          href={`/tickets/${t._id}`}
                          className="flex items-center gap-1 text-xs font-bold text-brand-primary group-hover:translate-x-1 transition"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Admin Multi-Agent Team Assignment Modal */}
      {teamModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-brand-light space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-brand-light">
              <div className="flex items-center gap-2 text-brand-dark font-bold text-sm">
                <Users className="w-4 h-4 text-brand-primary" />
                <h3>Assign Support Team • {teamModalTicket.ticketNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setTeamModalTicket(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Select one or more support agents to co-assign to ticket{" "}
              <strong>{teamModalTicket.ticketNumber}</strong>:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableAgents.map((ag) => {
                const isSelected = selectedTeamAgentIds.includes(ag._id);
                return (
                  <label
                    key={ag._id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition ${
                      isSelected
                        ? "bg-brand-mint/15 border-brand-primary text-brand-dark font-bold"
                        : "bg-brand-light/30 border-brand-light hover:bg-brand-light/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleTeamAgent(ag._id)}
                        className="rounded text-brand-primary focus:ring-brand-primary"
                      />
                      <div>
                        <div>{ag.name}</div>
                        <div className="text-[10px] text-gray-500 font-normal">{ag.email}</div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ag.availability === "Free"
                          ? "bg-emerald-100 text-emerald-800"
                          : ag.availability === "Available"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {ag.availability} ({ag.activeTickets} active)
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-light">
              <button
                type="button"
                onClick={() => setTeamModalTicket(null)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-lg hover:bg-brand-light transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingTeam}
                onClick={handleSaveTeam}
                className="px-4 py-1.5 text-xs font-bold text-white bg-brand-primary hover:bg-brand-dark rounded-lg transition disabled:opacity-50"
              >
                {savingTeam ? "Saving..." : "Save Assignees"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

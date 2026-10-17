"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { SlaBadge } from "@/components/SlaBadge";
import { AiInsightBox } from "@/components/AiInsightBox";
import { EscalationModal } from "@/components/EscalationModal";
import { ITicket, TicketStatus } from "@/lib/models/Ticket";
import { ITicketComment } from "@/lib/models/TicketComment";
import { IEscalationLog } from "@/lib/models/EscalationLog";
import { SlaCalculationResult } from "@/lib/sla";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  Send,
  ShieldAlert,
  CheckCircle,
  Clock,
  User,
  Tag,
  AlertTriangle,
  History,
  Lock,
  MessageSquare,
  Headset,
} from "lucide-react";

interface TicketDetailData {
  ticket: Omit<ITicket, "customer" | "assignedTo" | "assignedAgents"> & {
    customer: { _id: string; name: string; email: string; role: string };
    assignedTo?: { _id: string; name: string; email: string; role: string };
    assignedAgents?: { _id: string; name: string; email: string; role: string }[];
    slaStatus: SlaCalculationResult;
  };
  comments: (ITicketComment & {
    author: { _id: string; name: string; email: string; role: string };
  })[];
  escalationLogs: (IEscalationLog & {
    triggeredBy?: { _id: string; name: string; email: string; role: string };
  })[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TicketDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<{
    userId: string;
    name: string;
    email: string;
    role: "CUSTOMER" | "AGENT" | "ADMIN";
  } | null>(null);

  const [data, setData] = useState<TicketDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [replyMessage, setReplyMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [analyzingAi, setAnalyzingAi] = useState(false);

  // Multi-Agent Co-Assignment States
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<{
    _id: string;
    name: string;
    email: string;
    role: string;
    activeTickets: number;
    availability: string;
  }[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [savingAssignees, setSavingAssignees] = useState(false);

  const loadTicket = useCallback(async () => {
    try {
      setLoading(true);
      const json = await apiFetch<TicketDetailData>(`/tickets/${ticketId}`);
      setData(json);
      setLoading(false);
    } catch {
      setError("Failed to load ticket details");
      setLoading(false);
    }
  }, [ticketId]);

  const handleOpenAssignModal = async () => {
    try {
      const res = await apiFetch<{
        agents: {
          _id: string;
          name: string;
          email: string;
          role: string;
          activeTickets: number;
          availability: string;
        }[];
      }>("/tickets/agents/available");
      setAvailableAgents(res.agents || []);
      const current: string[] =
        data?.ticket?.assignedAgents && data.ticket.assignedAgents.length > 0
          ? data.ticket.assignedAgents.map((a: { _id?: string } | string) =>
              typeof a === "object" && a?._id ? a._id : String(a)
            )
          : data?.ticket?.assignedTo
          ? [
              typeof data.ticket.assignedTo === "object" && (data.ticket.assignedTo as { _id?: string })?._id
                ? (data.ticket.assignedTo as { _id: string })._id
                : String(data.ticket.assignedTo),
            ]
          : [];
      setSelectedAgentIds(current);
      setAssignModalOpen(true);
    } catch (err) {
      console.error("Failed to load available agents:", err);
    }
  };

  const handleToggleAgentSelection = (agentId: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const handleSaveAssignees = async () => {
    if (!data?.ticket) return;
    try {
      setSavingAssignees(true);
      await apiFetch(`/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: data.ticket.status,
          assignedAgents: selectedAgentIds,
          assignedTo: selectedAgentIds[0] || null,
        }),
      });
      await loadTicket();
      setAssignModalOpen(false);
    } catch (err) {
      console.error("Failed to save assignees:", err);
    } finally {
      setSavingAssignees(false);
    }
  };

  const handleTriggerInactivityCheck = async () => {
    try {
      await apiFetch("/tickets/check-inactivity", {
        method: "POST",
        body: JSON.stringify({ thresholdMinutes: 15 }),
      });
      await loadTicket();
    } catch (err) {
      console.error("Failed to trigger inactivity check:", err);
    }
  };

  useEffect(() => {
    apiFetch<{ user: typeof currentUser }>("/auth/me")
      .then((authData) => {
        if (!authData.user) {
          router.push("/login");
        } else {
          setCurrentUser(authData.user);
          loadTicket();
        }
      })
      .catch(() => router.push("/login"));
  }, [loadTicket, router]);

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setSubmittingReply(true);
    try {
      await apiFetch(`/tickets/${ticketId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          message: replyMessage,
          isInternalNote,
        }),
      });

      setReplyMessage("");
      setIsInternalNote(false);
      await loadTicket();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    try {
      await apiFetch(`/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await loadTicket();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEscalateSubmit = async (reason: string, notes?: string) => {
    try {
      setEscalating(true);
      await apiFetch(`/tickets/${ticketId}/escalate`, {
        method: "POST",
        body: JSON.stringify({ reason, notes }),
      });
      await loadTicket();
    } catch (err) {
      console.error(err);
    } finally {
      setEscalating(false);
    }
  };

  const handleRefreshAi = async () => {
    try {
      setAnalyzingAi(true);
      await apiFetch(`/tickets/${ticketId}/ai-analyze`, {
        method: "POST",
      });
      await loadTicket();
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingAi(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex flex-col">
        <Navbar currentUser={currentUser} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-gray-500">Loading Ticket #{ticketId}...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex flex-col">
        <Navbar currentUser={currentUser} />
        <div className="flex-1 max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-gray-800">{error || "Ticket not found"}</h2>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg bg-brand-dark"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Tickets
          </Link>
        </div>
      </div>
    );
  }

  const { ticket, comments, escalationLogs } = data;
  const isAgentOrAdmin = currentUser?.role === "AGENT" || currentUser?.role === "ADMIN";
  const isAdmin = currentUser?.role === "ADMIN";
  const isCustomerOwner = currentUser?.role === "CUSTOMER" && ticket.customer?._id === currentUser.userId;

  const isAssignedAgent =
    currentUser?.role === "AGENT" &&
    ((ticket.assignedTo &&
      (typeof ticket.assignedTo === "object"
        ? (ticket.assignedTo as { _id?: string })._id === currentUser.userId
        : ticket.assignedTo === currentUser.userId)) ||
      (ticket.assignedAgents &&
        ticket.assignedAgents.some((ag) =>
          typeof ag === "object" ? (ag as { _id?: string })._id === currentUser.userId : ag === currentUser.userId
        )));

  // If user is an AGENT but not assigned to this ticket, they are in read-only mode!
  const isUnassignedAgent = currentUser?.role === "AGENT" && !isAssignedAgent;
  const canModifyTicket = isAdmin || isCustomerOwner || isAssignedAgent;

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col">
      <Navbar currentUser={currentUser} onRefresh={loadTicket} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Unassigned Agent Notice Banner */}
        {isUnassignedAgent && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <span className="font-bold">Read-Only Ticket Access:</span> You are viewing a ticket assigned to{" "}
                <strong className="underline underline-offset-2">
                  {ticket.assignedAgents && ticket.assignedAgents.length > 0
                    ? ticket.assignedAgents.map((a: { name?: string }) => a.name).join(" & ")
                    : ticket.assignedTo?.name || "another colleague"}
                </strong>
                . Support agents cannot resolve, escalate, or reply to tickets assigned to another agent.
              </div>
            </div>
            <Link
              href="/?filter=my_assigned"
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-primary hover:bg-brand-dark transition shrink-0"
            >
              My Assigned Tickets
            </Link>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-brand-light space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-dark"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Tickets
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-gray-400">
                {ticket.ticketNumber}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <SlaBadge slaStatus={ticket.slaStatus} showProgress={true} />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-brand-dark tracking-tight">
                {ticket.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand-primary" />
                  Submitted by: <strong className="text-gray-800">{ticket.customer?.name}</strong> ({ticket.customer?.email})
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  Created: {new Date(ticket.createdAt).toLocaleString()}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-brand-dark" />
                  Category: <strong className="text-gray-800">{ticket.category}</strong>
                </span>
                <span>•</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <Headset className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="text-gray-500">Assigned Team:</span>
                  {ticket.assignedAgents && ticket.assignedAgents.length > 0 ? (
                    ticket.assignedAgents.map((ag: { _id?: string; name?: string }, idx: number) => (
                      <span
                        key={ag._id || idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-brand-light text-brand-dark border border-brand-mint/50"
                      >
                        {ag.name || "Agent"}
                        <span className="text-[9px] px-1 py-0.2 rounded bg-brand-primary/20 text-brand-dark uppercase font-extrabold">
                          {idx === 0 ? "Lead" : "Co-Pilot"}
                        </span>
                      </span>
                    ))
                  ) : ticket.assignedTo ? (
                    <span className="inline-flex items-center gap-1.5">
                      <strong className="text-gray-800">{ticket.assignedTo.name}</strong>
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold italic">Unassigned</span>
                  )}

                  {ticket.aiAnalysis?.autoAssigned && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-primary/10 text-brand-dark border border-brand-primary/30">
                      🤖 AI Auto-Assigned
                    </span>
                  )}

                  {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
                    <>
                      {ticket.firstResponseAt ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-brand-mint">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          First Reply Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-700" />
                          15m Inactivity Auto-Switch Active
                        </span>
                      )}
                    </>
                  )}

                  {ticket.reassignmentCount && ticket.reassignmentCount > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-300">
                      🔄 AI Auto-Switched ({ticket.reassignmentCount}x)
                    </span>
                  ) : null}

                  {(isAdmin || isAssignedAgent) && (
                    <div className="inline-flex items-center gap-2 ml-1">
                      <button
                        type="button"
                        onClick={handleOpenAssignModal}
                        className="text-[11px] font-bold text-brand-primary hover:text-brand-dark underline underline-offset-2"
                      >
                        + Manage Team
                      </button>
                      <button
                        type="button"
                        onClick={handleTriggerInactivityCheck}
                        title="Evaluate 15-minute response rule immediately"
                        className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded transition"
                      >
                        ⚡ Test Inactivity Check
                      </button>
                    </div>
                  )}
                </span>
              </div>
            </div>

            {/* Actions */}
            {canModifyTicket ? (
              <div className="flex flex-wrap items-center gap-2">
                {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("RESOLVED")}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-lg shadow-xs transition hover:opacity-95 bg-brand-primary hover:bg-brand-dark"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Resolved
                  </button>
                )}

                {ticket.status !== "ESCALATED" && ticket.status !== "CLOSED" && (
                  <button
                    type="button"
                    onClick={() => setEscalateModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Escalate Ticket
                  </button>
                )}

                {ticket.status === "RESOLVED" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("OPEN")}
                    className="px-3 py-2 text-xs font-bold text-gray-700 bg-brand-light hover:bg-gray-200 rounded-lg transition"
                  >
                    Reopen Ticket
                  </button>
                )}
              </div>
            ) : isUnassignedAgent ? (
              <div className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-amber-800 bg-amber-100 rounded-lg">
                <Lock className="w-3.5 h-3.5" />
                <span>Assigned to Other Agent</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Two-Column Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Conversation */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Original Description */}
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-brand-light space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-brand-light">
                <span className="font-bold text-gray-700 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-brand-primary" />
                  Initial Customer Problem Description
                </span>
                <span className="text-gray-400 font-mono text-[11px]">
                  {new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="text-xs text-gray-800 whitespace-pre-line leading-relaxed">
                {ticket.description}
              </div>

              {ticket.tags && ticket.tags.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {ticket.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-light text-brand-dark"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Conversation Thread */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                Conversation History & Updates ({comments.length})
              </h3>

              {comments.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-brand-light text-gray-400 text-xs">
                  No replies yet. Use the reply composer below to contact the customer.
                </div>
              ) : (
                comments.map((comment) => {
                  const isStaff = comment.author?.role === "AGENT" || comment.author?.role === "ADMIN";
                  return (
                    <div
                      key={comment._id.toString()}
                      className={`p-4 rounded-2xl border text-xs space-y-2 transition shadow-xs ${
                        comment.isInternalNote
                          ? "bg-amber-50 border-amber-200"
                          : isStaff
                          ? "bg-white border-brand-mint/40"
                          : "bg-white border-brand-light"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <strong className="text-gray-900">{comment.author?.name}</strong>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              comment.isInternalNote
                                ? "bg-amber-500 text-white"
                                : isStaff
                                ? "bg-brand-primary text-white"
                                : "bg-brand-light text-brand-dark"
                            }`}
                          >
                            {comment.isInternalNote ? "Internal Note" : comment.author?.role}
                          </span>
                        </div>
                        <span className="text-gray-400">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-gray-800 whitespace-pre-line leading-relaxed">
                        {comment.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Composer Form */}
            {canModifyTicket ? (
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-brand-light space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800">
                    Write a Response
                  </span>
                  {isAgentOrAdmin && (
                    <label className="flex items-center gap-2 text-xs font-medium text-amber-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        Internal Staff Note (Customer won&apos;t see)
                      </span>
                    </label>
                  )}
                </div>

                <form onSubmit={handlePostReply} className="space-y-3">
                  <textarea
                    rows={4}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder={
                      isInternalNote
                        ? "Add internal technical notes, findings, or handover details..."
                        : "Type your reply to the customer..."
                    }
                    className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    required
                  />

                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-gray-400">
                      Pressing send will notify all participants in this ticket.
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReply}
                      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs transition hover:opacity-95 ${
                        isInternalNote ? "bg-amber-600" : "bg-brand-dark hover:bg-brand-primary"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submittingReply ? "Posting..." : isInternalNote ? "Save Internal Note" : "Send Reply"}
                    </button>
                  </div>
                </form>
              </div>
            ) : isUnassignedAgent ? (
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-brand-light text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-700">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-gray-800">Reply & Note Actions Locked</h4>
                <p className="text-[11px] text-gray-500 max-w-md mx-auto leading-relaxed">
                  You are viewing this ticket in read-only observation mode. Support agents cannot post customer replies or internal notes on tickets assigned to other colleagues.
                </p>
              </div>
            ) : null}
          </div>

          {/* Right Column: AI Copilot & Escalation Audit Trail */}
          <div className="space-y-6">
            <AiInsightBox
              aiAnalysis={ticket.aiAnalysis}
              onApplySuggestedReply={(reply) => setReplyMessage(reply)}
              onRefreshAi={handleRefreshAi}
              isLoading={analyzingAi}
            />

            <div className="bg-white rounded-2xl p-6 shadow-xs border border-brand-light space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-brand-light">
                <div className="flex items-center gap-2 text-brand-dark font-bold text-xs uppercase tracking-wider">
                  <History className="w-4 h-4 text-brand-primary" />
                  Escalation Audit Trail ({escalationLogs.length})
                </div>
              </div>

              {escalationLogs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  No escalation events recorded. Ticket is proceeding normally.
                </p>
              ) : (
                <div className="relative pl-4 border-l-2 border-brand-mint space-y-4">
                  {escalationLogs.map((log) => (
                    <div key={log._id.toString()} className="text-xs space-y-1 relative">
                      <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-red-600 border-2 border-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-red-700 text-[11px]">
                          [{log.triggerType}] {log.fromStatus} → {log.toStatus}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-gray-800 text-[11px] leading-relaxed">
                        {log.reason}
                      </p>
                      {log.triggeredBy && (
                        <div className="text-[10px] text-gray-500">
                          By: {log.triggeredBy.name} ({log.triggeredBy.role})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Escalation Modal */}
      <EscalationModal
        isOpen={escalateModalOpen}
        ticketNumber={ticket.ticketNumber}
        onClose={() => setEscalateModalOpen(false)}
        onSubmit={handleEscalateSubmit}
        isLoading={escalating}
      />

      {/* Manage / Co-Assign Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-brand-light space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-brand-light">
              <div className="flex items-center gap-2 text-brand-dark font-bold text-sm">
                <Headset className="w-4 h-4 text-brand-primary" />
                <h3>Assign Support Agents (Multiple Assignees)</h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Select one or more available support agents to co-assign to ticket{" "}
              <strong>{ticket.ticketNumber}</strong>:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableAgents.map((ag) => {
                const isSelected = selectedAgentIds.includes(ag._id);
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
                        onChange={() => handleToggleAgentSelection(ag._id)}
                        className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary w-4 h-4"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">{ag.name}</div>
                        <div className="text-[10px] text-gray-500">
                          {ag.email} ({ag.role})
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        ag.availability === "Free"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : ag.availability === "Available"
                          ? "bg-blue-50 text-blue-800 border-blue-300"
                          : "bg-amber-50 text-amber-800 border-amber-300"
                      }`}
                    >
                      ● {ag.availability} ({ag.activeTickets} active)
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-light">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-brand-light rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignees}
                disabled={savingAssignees}
                className="px-4 py-1.5 text-xs font-bold text-white bg-brand-primary hover:bg-brand-dark rounded-lg shadow-xs transition"
              >
                {savingAssignees ? "Saving..." : "Update Assignees"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

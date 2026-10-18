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
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  ShieldAlert,
  CheckCircle,
  CheckCircle2,
  Clock,
  User,
  Tag,
  AlertTriangle,
  History,
  Lock,
  MessageSquare,
  Headset,
  Star,
  Bell,
  RotateCcw,
} from "lucide-react";

interface TicketDetailData {
  ticket: Omit<ITicket, "customer" | "assignedTo" | "assignedAgents"> & {
    customer: { _id: string; name: string; email: string; role: string };
    assignedTo?: { _id: string; name: string; email: string; role: string };
    assignedAgents?: {
      _id: string;
      name: string;
      email: string;
      role: string;
    }[];
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

interface AuthUser {
  _id?: string;
  userId: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "AGENT" | "ADMIN";
  assignedTicketsCount?: number;
}

export default function TicketDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [data, setData] = useState<TicketDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [replyMessage, setReplyMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState("");

  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [analyzingAi, setAnalyzingAi] = useState(false);

  // Multi-Agent Co-Assignment States
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<
    {
      _id: string;
      name: string;
      email: string;
      role: string;
      activeTickets: number;
      availability: string;
    }[]
  >([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [savingAssignees, setSavingAssignees] = useState(false);

  // Customer Review & Incident Reporting States
  const [rating, setRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isReported, setIsReported] = useState(false);
  const [reportReason, setReportReason] = useState("Unresponsive / SLA breach");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [showCreatedToast, setShowCreatedToast] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("created") === "true";
    }
    return false;
  });

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

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError("");
    setFeedbackSuccess("");
    setSubmittingFeedback(true);

    try {
      await apiFetch(`/tickets/${ticketId}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          comment: reviewComment,
          isReported,
          reportReason: isReported ? reportReason : "",
        }),
      });

      const message = isReported
        ? "Incident report filed with administrators. Escalation audit created."
        : "Thank you! Your feedback has been recorded and factored into AI leaderboard scores.";
      setFeedbackSuccess(message);
      toast.success(message);
      await loadTicket();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to submit feedback";
      setFeedbackError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmittingFeedback(false);
    }
  };

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
              typeof a === "object" && a?._id ? a._id : String(a),
            )
          : data?.ticket?.assignedTo
            ? [
                typeof data.ticket.assignedTo === "object" &&
                (data.ticket.assignedTo as { _id?: string })?._id
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
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId],
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
      toast.success("Assigned team updated successfully!");
      await loadTicket();
      setAssignModalOpen(false);
    } catch (err) {
      console.error("Failed to save assignees:", err);
      toast.error("Failed to update assignees", {
        description: err instanceof Error ? err.message : "An error occurred.",
      });
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
      toast.info("Inactivity evaluation completed.");
      await loadTicket();
    } catch (err) {
      console.error("Failed to trigger inactivity check:", err);
      toast.error("Inactivity check failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  useEffect(() => {
    apiFetch<{
      user: AuthUser & { _id?: string };
      assignedTicketsCount?: number;
    }>("/auth/me")
      .then((authData) => {
        if (!authData.user) {
          router.push("/login");
        } else {
          const u = authData.user;
          const normalized: AuthUser = {
            _id: u._id || u.userId,
            userId: u.userId || u._id || "",
            name: u.name,
            email: u.email,
            role: u.role,
            assignedTicketsCount: authData.assignedTicketsCount,
          };
          setCurrentUser(normalized);
          loadTicket();
        }
      })
      .catch(() => router.push("/login"));
  }, [loadTicket, router]);

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setSubmittingReply(true);
    setReplyError("");
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
      toast.success(isInternalNote ? "Internal staff note saved." : "Reply sent successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post comment";
      setReplyError(msg);
      toast.error(msg);
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
      if (newStatus === "RESOLVED") {
        toast.success("Ticket has been marked as Resolved.");
      } else if (newStatus === "OPEN") {
        toast.info("Ticket reopened successfully. Replies are now unlocked.");
      } else {
        toast.success(`Ticket status updated to ${newStatus}.`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
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
      toast.error("Ticket escalated to senior engineering team.", {
        description: `Reason: ${reason}`,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Escalation failed");
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
      toast.success("AI re-analysis completed.");
    } catch (err) {
      toast.error("Failed to run AI re-analysis.");
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
            <span className="text-xs font-bold text-gray-500">
              Loading Ticket #{ticketId}...
            </span>
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
          <h2 className="text-lg font-bold text-gray-800">
            {error || "Ticket not found"}
          </h2>
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
  const isAgentOrAdmin =
    currentUser?.role === "AGENT" || currentUser?.role === "ADMIN";
  const isAdmin = currentUser?.role === "ADMIN";
  const currentUserId = currentUser?.userId || currentUser?._id || "";

  const isCustomerOwner =
    currentUser?.role === "CUSTOMER" &&
    Boolean(
      currentUserId &&
      (typeof ticket.customer === "object"
        ? (ticket.customer as { _id?: string })._id === currentUserId
        : String(ticket.customer) === currentUserId),
    );

  const isAssignedAgent =
    currentUser?.role === "AGENT" &&
    Boolean(
      currentUserId &&
      ((ticket.assignedTo &&
        (typeof ticket.assignedTo === "object"
          ? (ticket.assignedTo as { _id?: string })._id === currentUserId
          : String(ticket.assignedTo) === currentUserId)) ||
        (ticket.assignedAgents &&
          ticket.assignedAgents.some((ag) => {
            const agId =
              typeof ag === "object"
                ? (ag as { _id?: string })._id
                : String(ag);
            return agId === currentUserId;
          }))),
    );

  const isUnassignedTicket =
    !ticket.assignedTo &&
    (!ticket.assignedAgents || ticket.assignedAgents.length === 0);

  // If user is an AGENT but not assigned to this ticket and ticket is assigned to someone else, they are in read-only mode!
  const isUnassignedAgent =
    currentUser?.role === "AGENT" && !isAssignedAgent && !isUnassignedTicket;
  const canModifyTicket =
    isAdmin ||
    isCustomerOwner ||
    isAssignedAgent ||
    (currentUser?.role === "AGENT" && isUnassignedTicket);

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col">
      <Navbar currentUser={currentUser} onRefresh={loadTicket} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Ticket Creation Confirmation Toast for Customer */}
        {showCreatedToast && (
          <div className="bg-emerald-50 border border-brand-mint text-emerald-900 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">
                  Ticket Created Successfully #{ticket.ticketNumber}
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Your support request has been logged and assigned to{" "}
                  <strong>
                    {ticket.assignedAgents && ticket.assignedAgents.length > 0
                      ? ticket.assignedAgents
                          .map((a: { name?: string }) => a.name)
                          .join(" & ")
                      : ticket.assignedTo?.name || "Support Team"}
                  </strong>
                  . We will respond within your priority SLA window.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCreatedToast(false)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 transition whitespace-nowrap shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Support Agent Notification Alert: New Ticket Arrived & Assigned */}
        {currentUser?.role === "AGENT" &&
          isAssignedAgent &&
          !ticket.firstResponseAt &&
          ticket.status !== "RESOLVED" &&
          ticket.status !== "CLOSED" && (
            <div className="bg-linear-to-r from-emerald-50 via-teal-50 to-brand-light/40 border-2 border-brand-primary/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 bg-brand-primary text-white rounded-xl shadow-xs shrink-0">
                  <Bell className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-brand-primary text-white rounded-md">
                      Action Required
                    </span>
                    <h4 className="text-xs font-black text-brand-dark tracking-tight">
                      🔔 New Ticket Arrived & Assigned to You!
                    </h4>
                  </div>
                  <p className="text-xs text-gray-700 mt-1">
                    Customer <strong>{ticket.customer?.name}</strong> raised this issue (&quot;{ticket.title}&quot;). AI Auto-Assignment selected you based on priority & availability. Please post a reply within 15 minutes to uphold SLA standards!
                  </p>
                </div>
              </div>
              <a
                href="#reply-textarea"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-dark shadow-xs transition whitespace-nowrap shrink-0"
              >
                Reply Now <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

        {/* Unassigned Agent Notice Banner */}
        {isUnassignedAgent && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <span className="font-bold">Read-Only Ticket Access:</span> You
                are viewing a ticket assigned to{" "}
                <strong className="underline underline-offset-2">
                  {ticket.assignedAgents && ticket.assignedAgents.length > 0
                    ? ticket.assignedAgents
                        .map((a: { name?: string }) => a.name)
                        .join(" & ")
                    : ticket.assignedTo?.name || "another colleague"}
                </strong>
                . Support agents cannot resolve, escalate, or reply to tickets
                assigned to another agent.
              </div>
            </div>
            <Link
              href="/?filter=my_assigned"
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-primary hover:bg-brand-dark transition whitespace-nowrap shrink-0"
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-dark whitespace-nowrap shrink-0"
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
                  Submitted by:{" "}
                  <strong className="text-gray-800">
                    {ticket.customer?.name}
                  </strong>{" "}
                  ({ticket.customer?.email})
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  Created: {new Date(ticket.createdAt).toLocaleString()}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-brand-dark" />
                  Category:{" "}
                  <strong className="text-gray-800">{ticket.category}</strong>
                </span>
                <span>•</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <Headset className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="text-gray-500">Assigned Team:</span>
                  {ticket.assignedAgents && ticket.assignedAgents.length > 0 ? (
                    ticket.assignedAgents.map(
                      (ag: { _id?: string; name?: string }, idx: number) => (
                        <span
                          key={ag._id || idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-brand-light text-brand-dark border border-brand-mint/50"
                        >
                          {ag.name || "Agent"}
                          <span className="text-[9px] px-1 py-0.2 rounded bg-brand-primary/20 text-brand-dark uppercase font-extrabold">
                            {idx === 0 ? "Lead" : "Co-Pilot"}
                          </span>
                        </span>
                      ),
                    )
                  ) : ticket.assignedTo ? (
                    <span className="inline-flex items-center gap-1.5">
                      <strong className="text-gray-800">
                        {ticket.assignedTo.name}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold italic">
                      Unassigned
                    </span>
                  )}

                  {ticket.aiAnalysis?.autoAssigned && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-primary/10 text-brand-dark border border-brand-primary/30">
                      AI Auto-Assigned
                    </span>
                  )}

                  {ticket.status !== "RESOLVED" &&
                    ticket.status !== "CLOSED" && (
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
                        className="text-[11px] font-bold text-brand-primary hover:text-brand-dark underline underline-offset-2 whitespace-nowrap shrink-0"
                      >
                        + Manage Team
                      </button>
                      <button
                        type="button"
                        onClick={handleTriggerInactivityCheck}
                        title="Evaluate 15-minute response rule immediately"
                        className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded transition whitespace-nowrap shrink-0"
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
              <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
                {/* When Resolved: ONLY show Reopen button */}
                {ticket.status === "RESOLVED" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("OPEN")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-brand-dark bg-white border border-brand-mint/70 hover:bg-brand-light hover:border-brand-primary rounded-xl shadow-xs transition hover:scale-102 whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    <span>Reopen Ticket</span>
                  </button>
                )}

                {/* When Closed: ONLY show Reopen button */}
                {ticket.status === "CLOSED" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("OPEN")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-brand-dark bg-white border border-brand-mint/70 hover:bg-brand-light hover:border-brand-primary rounded-xl shadow-xs transition hover:scale-102 whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    <span>Reopen Ticket</span>
                  </button>
                )}

                {/* When Active (OPEN, IN_PROGRESS, ESCALATED): Show Mark as Resolved and Escalate (if not already escalated) */}
                {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStatusChange("RESOLVED")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-primary hover:bg-brand-dark rounded-xl shadow-xs transition hover:scale-102 whitespace-nowrap shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Mark as Resolved</span>
                    </button>

                    {ticket.status !== "ESCALATED" && (
                      <button
                        type="button"
                        onClick={() => setEscalateModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition hover:scale-102 whitespace-nowrap shrink-0"
                      >
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>Escalate Ticket</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : isUnassignedAgent ? (
              <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-800 bg-amber-100 rounded-xl whitespace-nowrap shrink-0">
                <Lock className="w-3.5 h-3.5 shrink-0" />
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
                  {new Date(ticket.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
                  No replies yet. Use the reply composer below to contact the
                  customer.
                </div>
              ) : (
                comments.map((comment) => {
                  const isStaff =
                    comment.author?.role === "AGENT" ||
                    comment.author?.role === "ADMIN";
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
                          <strong className="text-gray-900">
                            {comment.author?.name}
                          </strong>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              comment.isInternalNote
                                ? "bg-amber-500 text-white"
                                : isStaff
                                  ? "bg-brand-primary text-white"
                                  : "bg-brand-light text-brand-dark"
                            }`}
                          >
                            {comment.isInternalNote
                              ? "Internal Note"
                              : comment.author?.role}
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

            {/* Customer Review & Incident Reporting Card - ONLY visible after ticket is RESOLVED or CLOSED */}
            {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") &&
              (ticket.customerFeedback?.submittedAt || isCustomerOwner) && (
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-brand-light space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-brand-light">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-brand-dark">
                      Agent Review & Service Rating
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">
                    Powers AI Leaderboard & Agent Scores
                  </span>
                </div>

                {ticket.customerFeedback?.submittedAt ? (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-700">Your Rating:</span>
                        <div className="flex items-center text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${
                                s <= ticket.customerFeedback!.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-gray-800">
                          ({ticket.customerFeedback.rating}/5)
                        </span>
                      </div>
                      {ticket.customerFeedback.isReported && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-300">
                          Incident Reported
                        </span>
                      )}
                    </div>
                    {ticket.customerFeedback.comment && (
                      <p className="text-xs text-gray-700 italic">
                        &ldquo;{ticket.customerFeedback.comment}&rdquo;
                      </p>
                    )}
                    {ticket.customerFeedback.isReported && ticket.customerFeedback.reportReason && (
                      <p className="text-[11px] text-red-700 font-medium">
                        Reason for report: {ticket.customerFeedback.reportReason}
                      </p>
                    )}
                    <span className="text-[10px] text-gray-400 block pt-1">
                      Submitted on {new Date(ticket.customerFeedback.submittedAt).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitFeedback} className="space-y-4">
                    {feedbackSuccess && (
                      <div className="p-3 bg-emerald-50 border border-brand-mint text-emerald-800 text-xs rounded-xl flex items-center justify-between">
                        <span>{feedbackSuccess}</span>
                        <button
                          type="button"
                          onClick={() => setFeedbackSuccess("")}
                          className="text-emerald-700 font-bold ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {feedbackError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
                        <span>{feedbackError}</span>
                        <button
                          type="button"
                          onClick={() => setFeedbackError("")}
                          className="text-red-700 font-bold ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700">
                        Rate your assigned support agent&apos;s service:
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((starValue) => (
                          <button
                            key={starValue}
                            type="button"
                            onClick={() => setRating(starValue)}
                            className="p-1 hover:scale-110 transition shrink-0"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                starValue <= rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-gray-300 hover:text-amber-300"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-black text-gray-700 ml-2">
                          {rating === 5
                            ? "⭐⭐⭐⭐⭐ Outstanding (5/5)"
                            : rating === 4
                              ? "⭐⭐⭐⭐ Very Good (4/5)"
                              : rating === 3
                                ? "⭐⭐⭐ Average (3/5)"
                                : rating === 2
                                  ? "⭐⭐ Poor (2/5)"
                                  : "⭐ Very Poor (1/5)"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-700">
                        Service Review Comments (Optional):
                      </label>
                      <input
                        type="text"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share your experience with the agent..."
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>

                    {/* Report Misconduct Checkbox */}
                    <div className="pt-2 border-t border-gray-100 space-y-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-red-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isReported}
                          onChange={(e) => setIsReported(e.target.checked)}
                          className="rounded text-red-600 focus:ring-red-500"
                        />
                        <span>Report Agent Misconduct / Service Issue to Administrators</span>
                      </label>

                      {isReported && (
                        <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl space-y-2">
                          <label className="block text-[11px] font-bold text-red-900">
                            Select reason for incident report:
                          </label>
                          <select
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-red-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="Unresponsive / SLA breach">Unresponsive / Missed SLA response window</option>
                            <option value="Unprofessional or unhelpful responses">Unprofessional or unhelpful responses</option>
                            <option value="Prematurely closed or unresolved issue">Issue marked resolved without resolution</option>
                            <option value="Incorrect technical instructions">Incorrect technical instructions</option>
                            <option value="Other misconduct">Other service misconduct</option>
                          </select>
                          <p className="text-[10px] text-red-600">
                            Reporting an agent creates an audit escalation log and applies a -15 pt penalty to their AI Leaderboard Performance score.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingFeedback}
                        className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition whitespace-nowrap shrink-0 ${
                          isReported
                            ? "bg-red-600 hover:bg-red-700 shadow-xs"
                            : "bg-brand-primary hover:bg-brand-dark shadow-xs"
                        }`}
                      >
                        {submittingFeedback
                          ? "Submitting..."
                          : isReported
                            ? "Submit Incident Report & Review"
                            : "Submit Review & Rating"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Reply Composer Section */}
            {ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? (
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-brand-light text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-brand-mint text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-brand-dark">
                    This Ticket is Marked as {ticket.status === "RESOLVED" ? "Resolved" : "Closed"}
                  </h4>
                  <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                    Posting replies is locked because this ticket is resolved. If your issue still requires attention or you have further queries, please reopen the ticket.
                  </p>
                </div>
                {canModifyTicket && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleStatusChange("OPEN")}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-brand-primary hover:bg-brand-dark rounded-xl shadow-xs transition hover:scale-102 whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="w-4 h-4 shrink-0" />
                      Reopen Ticket to Send Reply
                    </button>
                  </div>
                )}
              </div>
            ) : canModifyTicket ? (
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
                  {replyError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
                      <span>{replyError}</span>
                      <button
                        type="button"
                        onClick={() => setReplyError("")}
                        className="text-red-500 hover:text-red-800 font-bold ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <textarea
                    id="reply-textarea"
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
                      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs transition hover:opacity-95 whitespace-nowrap shrink-0 ${
                        isInternalNote
                          ? "bg-amber-600"
                          : "bg-brand-dark hover:bg-brand-primary"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submittingReply
                        ? "Posting..."
                        : isInternalNote
                          ? "Save Internal Note"
                          : "Send Reply"}
                    </button>
                  </div>
                </form>
              </div>
            ) : isUnassignedAgent ? (
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-brand-light text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-700">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-gray-800">
                  Reply & Note Actions Locked
                </h4>
                <p className="text-[11px] text-gray-500 max-w-md mx-auto leading-relaxed">
                  You are viewing this ticket in read-only observation mode.
                  Support agents cannot post customer replies or internal notes
                  on tickets assigned to other colleagues.
                </p>
              </div>
            ) : null}
          </div>

          {/* Right Column: AI Copilot (Staff Only) / Support Overview (Customer) & Escalation Audit Trail */}
          <div className="space-y-6">
            {isAgentOrAdmin ? (
              <AiInsightBox
                aiAnalysis={ticket.aiAnalysis}
                onApplySuggestedReply={(reply) => setReplyMessage(reply)}
                onRefreshAi={handleRefreshAi}
                isLoading={analyzingAi}
              />
            ) : (
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-brand-light space-y-4">
                <div className="flex items-center gap-2 text-brand-dark font-bold text-xs uppercase tracking-wider pb-2 border-b border-brand-light">
                  <Headset className="w-4 h-4 text-brand-primary" />
                  Assigned Support Desk
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Ticket Reference:</span>
                    <span className="font-mono font-bold text-brand-dark">{ticket.ticketNumber}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Service Category:</span>
                    <span className="font-bold text-gray-800">{ticket.category}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Priority Level:</span>
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Assigned Agent:</span>
                    <span className="font-bold text-brand-dark">
                      {ticket.assignedAgents && ticket.assignedAgents.length > 0
                        ? ticket.assignedAgents.map((a: { name?: string }) => a.name).join(" & ")
                        : ticket.assignedTo?.name || "Support Availability Queue"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-gray-500">Target SLA Window:</span>
                    <span className="font-bold text-brand-primary">Within {ticket.slaHours || 24} Hours</span>
                  </div>
                </div>
              </div>
            )}

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
                    <div
                      key={log._id.toString()}
                      className="text-xs space-y-1 relative"
                    >
                      <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-red-600 border-2 border-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-red-700 text-[11px]">
                          [{log.triggerType}] {log.fromStatus} → {log.toStatus}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(log.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
                        <div className="font-semibold text-gray-900">
                          {ag.name}
                        </div>
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
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-brand-light rounded-lg transition whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignees}
                disabled={savingAssignees}
                className="px-4 py-1.5 text-xs font-bold text-white bg-brand-primary hover:bg-brand-dark rounded-lg shadow-xs transition whitespace-nowrap shrink-0"
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

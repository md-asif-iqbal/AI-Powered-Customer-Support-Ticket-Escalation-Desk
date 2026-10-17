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
} from "lucide-react";

interface TicketDetailData {
  ticket: ITicket & {
    customer: { _id: string; name: string; email: string; role: string };
    assignedTo?: { _id: string; name: string; email: string; role: string };
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

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col">
      <Navbar currentUser={currentUser} onRefresh={loadTicket} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
              </div>
            </div>

            {/* Actions */}
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
    </div>
  );
}

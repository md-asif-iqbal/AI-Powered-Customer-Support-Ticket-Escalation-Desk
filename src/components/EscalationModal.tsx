"use client";

import React, { useState } from "react";
import { ShieldAlert, X } from "lucide-react";

interface EscalationModalProps {
  isOpen: boolean;
  ticketNumber: string;
  onClose: () => void;
  onSubmit: (reason: string, notes?: string) => Promise<void>;
  isLoading?: boolean;
}

export function EscalationModal({
  isOpen,
  ticketNumber,
  onClose,
  onSubmit,
  isLoading = false,
}: EscalationModalProps) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError("Please provide a reason of at least 5 characters.");
      return;
    }
    setError("");
    await onSubmit(reason, notes);
    onClose();
  };

  const presetReasons = [
    "Customer requested urgent manager intervention",
    "Production outage or severe financial impact",
    "Third-party API dependency blocked",
    "SLA time limit exceeded without resolution",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#EEEEEE] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Escalate Ticket {ticketNumber}</h3>
              <p className="text-xs text-gray-500">Trigger immediate senior supervisor notification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Escalation Reason *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Critical customer payment failure unresolved"
              className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2FA084]"
              required
            />
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-gray-500 mb-1.5">
              Quick Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presetReasons.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className="text-[11px] px-2 py-1 bg-[#EEEEEE] hover:bg-gray-200 text-gray-700 rounded transition text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Additional Internal Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide technical context or steps already attempted..."
              className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2FA084]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EEEEEE]">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-[#EEEEEE] hover:bg-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition"
            >
              {isLoading ? "Escalating..." : "Confirm Escalation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

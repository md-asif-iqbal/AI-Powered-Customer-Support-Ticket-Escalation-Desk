import React from "react";
import { TicketStatus } from "@/lib/models/Ticket";

interface StatusBadgeProps {
  status: TicketStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs font-semibold";

  switch (status) {
    case "OPEN":
      return (
        <span className={`inline-flex items-center rounded-md font-medium text-white bg-brand-primary ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-white opacity-80 animate-pulse" />
          OPEN
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className={`inline-flex items-center rounded-md font-medium text-white bg-brand-dark ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-brand-mint" />
          IN PROGRESS
        </span>
      );
    case "ESCALATED":
      return (
        <span className={`inline-flex items-center rounded-md font-bold text-white bg-red-600 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-white animate-ping" />
          ESCALATED
        </span>
      );
    case "RESOLVED":
      return (
        <span className={`inline-flex items-center rounded-md font-medium text-brand-dark bg-emerald-50 border border-brand-mint ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-brand-primary" />
          RESOLVED
        </span>
      );
    case "CLOSED":
      return (
        <span className={`inline-flex items-center rounded-md font-medium text-gray-600 bg-brand-light ${sizeClasses}`}>
          CLOSED
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded-md font-medium bg-brand-light text-gray-700 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
}

import React from "react";
import { TicketPriority } from "@/lib/models/Ticket";

interface PriorityBadgeProps {
  priority: TicketPriority;
  size?: "sm" | "md";
}

export function PriorityBadge({ priority, size = "md" }: PriorityBadgeProps) {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-semibold";

  switch (priority) {
    case "URGENT":
      return (
        <span className={`inline-flex items-center rounded font-bold text-white tracking-wide bg-red-700 ${sizeClasses}`}>
          🚨 URGENT
        </span>
      );
    case "HIGH":
      return (
        <span className={`inline-flex items-center rounded font-semibold text-white bg-amber-600 ${sizeClasses}`}>
          HIGH
        </span>
      );
    case "MEDIUM":
      return (
        <span className={`inline-flex items-center rounded font-medium text-white bg-brand-primary ${sizeClasses}`}>
          MEDIUM
        </span>
      );
    case "LOW":
      return (
        <span className={`inline-flex items-center rounded font-medium text-brand-dark bg-brand-light border border-gray-300 ${sizeClasses}`}>
          LOW
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded font-medium bg-brand-light text-gray-700 ${sizeClasses}`}>
          {priority}
        </span>
      );
  }
}

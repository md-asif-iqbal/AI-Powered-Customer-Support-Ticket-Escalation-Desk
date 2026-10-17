import React from "react";
import { SlaCalculationResult } from "@/lib/sla";
import { Clock, AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";

interface SlaBadgeProps {
  slaStatus: SlaCalculationResult;
  showProgress?: boolean;
}

export function SlaBadge({ slaStatus, showProgress = false }: SlaBadgeProps) {
  const { isBreached, statusText, urgencyLevel, percentageRemaining } = slaStatus;

  let colorClasses = "bg-emerald-50 text-emerald-800 border-brand-mint";
  let Icon = Clock;

  if (isBreached) {
    colorClasses = "bg-red-50 text-red-800 border-red-300";
    Icon = ShieldAlert;
  } else if (urgencyLevel === "WARNING") {
    colorClasses = "bg-amber-50 text-amber-800 border-amber-300";
    Icon = AlertTriangle;
  } else if (urgencyLevel === "RESOLVED") {
    colorClasses = "bg-emerald-50 text-brand-dark border-brand-mint";
    Icon = CheckCircle;
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border ${colorClasses}`}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{statusText}</span>
      </div>

      {showProgress && !isBreached && urgencyLevel !== "RESOLVED" && (
        <div className="w-full bg-brand-light h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              urgencyLevel === "WARNING" ? "bg-amber-600" : "bg-brand-primary"
            }`}
            style={{ width: `${percentageRemaining}%` }}
          />
        </div>
      )}
    </div>
  );
}

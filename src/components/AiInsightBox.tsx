"use client";

import React, { useState } from "react";
import { IAiAnalysis } from "@/lib/models/Ticket";
import { Headset, Copy, Check, Info, Cpu } from "lucide-react";

interface AiInsightBoxProps {
  aiAnalysis?: IAiAnalysis | null;
  onApplySuggestedReply?: (reply: string) => void;
  onRefreshAi?: () => void;
  isLoading?: boolean;
}

export function AiInsightBox({
  aiAnalysis,
  onApplySuggestedReply,
  onRefreshAi,
  isLoading = false,
}: AiInsightBoxProps) {
  const [copied, setCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  if (!aiAnalysis) {
    return (
      <div className="bg-white border border-brand-light rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-dark font-semibold">
            <Headset className="w-5 h-5 text-brand-primary" />
            <h3>AI Triage & Sentiment Copilot</h3>
          </div>
          {onRefreshAi && (
            <button
              onClick={onRefreshAi}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-dark rounded-lg transition"
            >
              {isLoading ? "Analyzing..." : "Run AI Analysis"}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          No AI evaluation generated yet. Click above to analyze ticket sentiment, urgency, and draft replies.
        </p>
      </div>
    );
  }

  const handleCopy = () => {
    if (aiAnalysis.suggestedReply) {
      navigator.clipboard.writeText(aiAnalysis.suggestedReply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sentimentClasses = {
    POSITIVE: "bg-emerald-50 text-emerald-800 border-brand-mint",
    NEUTRAL: "bg-brand-light text-gray-700 border-gray-300",
    NEGATIVE: "bg-amber-50 text-amber-800 border-amber-300",
    FRUSTRATED: "bg-red-700 text-white border-red-800",
  }[aiAnalysis.sentiment] || "bg-brand-light text-gray-700 border-gray-300";

  return (
    <div className="bg-white border-2 border-brand-primary/20 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-brand-light">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-brand-dark">
            <Headset className="w-4 h-4 text-brand-mint" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-brand-dark">AI Triage Copilot</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-white uppercase tracking-wider flex items-center gap-1 bg-brand-primary">
                <Cpu className="w-2.5 h-2.5" />
                {aiAnalysis.modelUsed || "gemini-3.8-flash"}
              </span>
            </div>
            <p className="text-xs text-gray-500">Live NLP Sentiment & Smart Escalation Predictor</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-dark font-medium"
          >
            <Info className="w-3.5 h-3.5" />
            {showExplanation ? "Hide Specs" : "AI Specs & Limitations"}
          </button>
          {onRefreshAi && (
            <button
              onClick={onRefreshAi}
              disabled={isLoading}
              className="px-2.5 py-1 text-xs font-semibold text-white bg-brand-dark hover:bg-brand-primary rounded transition"
            >
              {isLoading ? "Running..." : "Re-Analyze"}
            </button>
          )}
        </div>
      </div>

      {/* Model Specs Collapsible */}
      {showExplanation && (
        <div className="p-3.5 bg-brand-light/40 border border-brand-light rounded-lg text-xs space-y-2 text-gray-700">
          <p className="font-semibold text-brand-dark flex items-center gap-1.5">
            <Info className="w-4 h-4 text-brand-primary" />
            AI / ML Feature Architectural Report (For Technical Review)
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[11px] leading-relaxed">
            <li><strong>Inputs:</strong> Ticket title, description, category, and timestamps.</li>
            <li><strong>Outputs:</strong> Sentiment score (-1.0 to 1.0), Urgency score (0-100), Suggested Reply, Auto-Escalation trigger.</li>
            <li><strong>Models:</strong> Primary Google Gemini 3.8 Flash & Groq (openai/gpt-oss-20b) with zero-dependency heuristic NLP fallback.</li>
          </ul>
        </div>
      )}

      {/* Metric Cards - Pixel-perfect stacked layout with zero text clipping on any screen */}
      <div className="space-y-3">
        {/* Sentiment Card */}
        <div className="p-3.5 rounded-xl border border-brand-light bg-brand-light/30 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Detected Sentiment
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${sentimentClasses}`}>
              {aiAnalysis.sentiment}
            </span>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider block">
              Confidence
            </span>
            <span className="text-xs font-mono font-black text-gray-800">
              Score: {aiAnalysis.sentimentScore > 0 ? `+${aiAnalysis.sentimentScore}` : aiAnalysis.sentimentScore}
            </span>
          </div>
        </div>

        {/* Urgency Score Card */}
        <div className="p-3.5 rounded-xl border border-brand-light bg-brand-light/30 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Urgency Level
            </span>
            <span className="font-mono text-gray-900 font-black text-xs">
              {aiAnalysis.urgencyScore} / 100
            </span>
          </div>
          <div className="w-full bg-brand-light h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                aiAnalysis.urgencyScore >= 75 ? "bg-red-600" : "bg-brand-primary"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, aiAnalysis.urgencyScore))}%` }}
            />
          </div>
        </div>

        {/* AI Recommendations Card */}
        <div className="p-3.5 rounded-xl border border-brand-light bg-brand-light/30 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
              Recommended Priority
            </span>
            <span className="text-xs font-bold text-gray-900">
              {aiAnalysis.recommendedPriority} Priority
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
              Category
            </span>
            <span className="text-xs font-bold text-brand-dark px-2.5 py-0.5 rounded-md bg-brand-mint/20 border border-brand-mint/40">
              {aiAnalysis.recommendedCategory}
            </span>
          </div>
        </div>
      </div>



      {/* Suggested Reply Draft */}
      {aiAnalysis.suggestedReply && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-dark flex items-center gap-1.5">
              <Headset className="w-3.5 h-3.5 text-brand-primary" />
              Suggested First Response Draft
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs flex items-center gap-1 text-gray-600 hover:text-black font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              {onApplySuggestedReply && (
                <button
                  type="button"
                  onClick={() => onApplySuggestedReply(aiAnalysis.suggestedReply)}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-dark rounded transition"
                >
                  Use Draft in Reply
                </button>
              )}
            </div>
          </div>
          <div className="p-3 bg-brand-light/40 border border-brand-light rounded-lg text-xs font-sans text-gray-800 whitespace-pre-line leading-relaxed">
            {aiAnalysis.suggestedReply}
          </div>
        </div>
      )}
    </div>
  );
}

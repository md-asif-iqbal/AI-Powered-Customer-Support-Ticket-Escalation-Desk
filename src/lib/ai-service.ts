import { GoogleGenerativeAI } from "@google/generative-ai";
import { IAiAnalysis, TicketCategory, TicketPriority } from "./models/Ticket";

export interface TicketInputForAi {
  title: string;
  description: string;
  category?: string;
  priority?: string;
}

/**
 * Heuristic sentiment and NLP triage engine (Used as fallback or standalone engine)
 */
export function analyzeTicketHeuristically(
  input: TicketInputForAi
): IAiAnalysis {
  const fullText = `${input.title} ${input.description}`.toLowerCase();

  // Keyword lexicons
  const angryWords = [
    "furious", "angry", "terrible", "worst", "unacceptable", "scam",
    "ridiculous", "sue", "lawsuit", "refund now", "cancel subscription",
    "disaster", "horrible", "broken for days", "lost money", "urgent",
    "emergency", "down", "crash", "hacked", "stolen", "churi", "harassment",
    "unjustified", "why deactivated", "cheated", "batpar", "dhokabaji",
    "faltu service", "baje service", "shiggir solve koro", "police",
    "consumer court", "illegal", "fraud", "threat"
  ];

  const negativeWords = [
    "not working", "fails", "failed", "bug", "error", "problem", "glitch",
    "slow", "cannot", "can't", "unable", "frustrated", "delay", "waiting",
    "disappointed", "stuck", "wrong", "missing", "deactivate", "deactivated",
    "deactivating", "suspended", "suspend", "banned", "ban", "blocked", "block",
    "disabled", "disable", "locked", "lost access", "denied", "cannot login",
    "cant login", "solve koro", "keno", "somossa", "somossha", "bondho",
    "kaj kore na", "kaj korche na", "problem hocche", "help koro", "loss",
    "khoti", "deri", "late", "damage", "broken", "freeze", "loading error",
    "timeout", "crash hoyeche", "open hoy na", "kaj hoy na", "invalid", "rejected", "declined"
  ];

  const positiveWords = [
    "thanks", "thank you", "great", "awesome", "appreciate", "helpful",
    "love", "quick", "fixed", "good", "dhonnobad", "valobasha", "shundor", "resolved", "solved"
  ];

  const billingWords = [
    "charge", "charged", "billing", "invoice", "payment", "credit card", "debit card",
    "refund", "subscription", "pricing", "dollar", "taka", "receipt", "pay",
    "bkash", "nagad", "rocket", "upay", "cellfin", "kete nise", "keteche", "taka ferot",
    "double charge", "overcharge", "voucher", "coupon", "discount", "promo code",
    "checkout", "transaction", "gateway", "stripe", "sslcommerz", "bank transfer",
    "vat", "tax", "deposit", "withdraw", "money", "balance"
  ];

  const techWords = [
    "api", "server", "crash", "database", "500", "404", "502", "503", "stack trace",
    "exception", "code", "latency", "timeout", "frontend", "backend",
    "deploy", "docker", "bug", "outage", "downtime", "white screen", "blank screen",
    "load hoy na", "ghurtese", "infinite loop", "upload failed", "download error",
    "network error", "ssl error", "connection failed", "app hang", "lagging", "memory leak", "sync error"
  ];

  const accountWords = [
    "account", "login", "password", "reset", "2fa", "otp", "profile", "access",
    "permission", "locked", "email change", "authenticate", "deactivate",
    "deactivated", "suspended", "suspend", "banned", "ban", "blocked", "disabled",
    "reactivate", "reactivation", "unban", "kyc", "verification", "user", "akount", "khata",
    "sign in", "signup", "sign up", "register", "forgot password", "pass vule gechi",
    "code ashe na", "sms ashe na", "phone number", "nid", "identity", "security question",
    "hacked account", "unauthorized access", "profile update"
  ];

  const generalWords = [
    "order", "tracking", "delivery", "parcel", "shipment", "courier", "delayed",
    "where is my", "missing product", "wrong item", "damaged product", "return",
    "exchange", "warranty", "guarantee", "claim", "feature request", "how to use",
    "guide", "tutorial", "feedback", "support agent", "human agent", "contact number",
    "hotline", "kothay", "ashe nai", "kivabe", "jante chai", "help lagbe", "manush agent"
  ];

  let angryCount = 0;
  for (const w of angryWords) {
    if (fullText.includes(w)) angryCount++;
  }

  let negCount = 0;
  for (const w of negativeWords) {
    if (fullText.includes(w)) negCount++;
  }

  let posCount = 0;
  for (const w of positiveWords) {
    if (fullText.includes(w)) posCount++;
  }

  // Calculate sentiment score (-1.0 to 1.0)
  let sentimentScore = 0;
  if (angryCount > 0) {
    sentimentScore = -0.5 - Math.min(0.5, angryCount * 0.15);
  } else if (negCount > 0) {
    sentimentScore = -0.2 - Math.min(0.6, negCount * 0.12) + posCount * 0.1;
  } else if (posCount > 0) {
    sentimentScore = Math.min(0.9, 0.3 + posCount * 0.2);
  }

  sentimentScore = Math.max(-1, Math.min(1, Math.round(sentimentScore * 100) / 100));

  let sentiment: IAiAnalysis["sentiment"] = "NEUTRAL";
  if (angryCount >= 2 || sentimentScore <= -0.6) {
    sentiment = "FRUSTRATED";
  } else if (sentimentScore <= -0.2) {
    sentiment = "NEGATIVE";
  } else if (sentimentScore >= 0.2) {
    sentiment = "POSITIVE";
  }

  // Determine Category
  let recommendedCategory: TicketCategory = "GENERAL";
  const billingScore = billingWords.filter((w) => fullText.includes(w)).length;
  const techScore = techWords.filter((w) => fullText.includes(w)).length;
  const accountScore = accountWords.filter((w) => fullText.includes(w)).length;

  if (accountScore >= billingScore && accountScore >= techScore && accountScore > 0) {
    recommendedCategory = "ACCOUNT";
  } else if (billingScore >= techScore && billingScore >= accountScore && billingScore > 0) {
    recommendedCategory = "BILLING";
  } else if (techScore > 0 && techScore >= billingScore && techScore >= accountScore) {
    recommendedCategory = "TECHNICAL";
  } else {
    recommendedCategory = "GENERAL";
  }

  // Urgency score (0 - 100)
  let urgencyScore = 30;
  if (sentiment === "FRUSTRATED") urgencyScore += 45;
  else if (sentiment === "NEGATIVE") urgencyScore += 25;
  if (angryCount > 0) urgencyScore += 20;
  if (fullText.includes("urgent") || fullText.includes("immediately") || fullText.includes("outage") || fullText.includes("emergency")) {
    urgencyScore += 25;
  }
  // Account lockout or deactivation or billing loss is an acute operational blocker
  if (
    fullText.includes("deactivate") ||
    fullText.includes("deactivated") ||
    fullText.includes("suspend") ||
    fullText.includes("banned") ||
    fullText.includes("blocked") ||
    fullText.includes("locked") ||
    fullText.includes("hacked") ||
    fullText.includes("double charge") ||
    fullText.includes("kete nise") ||
    fullText.includes("crash") ||
    fullText.includes("outage")
  ) {
    urgencyScore += 35;
  }
  urgencyScore = Math.min(100, Math.max(10, urgencyScore));

  // Recommended Priority
  let recommendedPriority: TicketPriority = "MEDIUM";
  if (urgencyScore >= 80) recommendedPriority = "URGENT";
  else if (urgencyScore >= 60) recommendedPriority = "HIGH";
  else if (urgencyScore <= 35) recommendedPriority = "LOW";

  const autoEscalateRecommended = urgencyScore >= 80 || sentiment === "FRUSTRATED";
  const escalationReason = autoEscalateRecommended
    ? `Heuristic NLP identified high customer frustration (${sentiment}) and urgency score of ${urgencyScore}/100.`
    : "";

  // Extract key issues
  const extractedWords = [
    ...angryWords,
    ...negativeWords,
    ...billingWords,
    ...techWords,
    ...accountWords,
    ...generalWords,
  ];
  const keyIssues = Array.from(
    new Set(extractedWords.filter((w) => fullText.includes(w)).slice(0, 5))
  );

  // Suggested response draft
  const suggestedReply = `Hello,\n\nThank you for reaching out to our support team regarding "${input.title}". We sincerely acknowledge the issue you are experiencing${
    keyIssues.length > 0 ? ` with ${keyIssues.slice(0, 2).join(" and ")}` : ""
  }.\n\nOur team has categorized this as a ${recommendedPriority} priority ${recommendedCategory} matter. We are already looking into this and will provide a resolution shortly.\n\nBest regards,\nCustomer Support Operations`;

  return {
    sentiment,
    sentimentScore,
    urgencyScore,
    recommendedCategory,
    recommendedPriority,
    autoEscalateRecommended,
    escalationReason,
    suggestedReply,
    keyIssues,
    modelUsed: "heuristic-nlp-engine",
    analyzedAt: new Date(),
  };
}

/**
 * Triage ticket using Google Gemini API if configured, falling back to Grok or Heuristics
 */
export async function analyzeTicketWithAi(
  input: TicketInputForAi
): Promise<IAiAnalysis> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const grokKey = process.env.GROK_API_KEY;

  // 1. Attempt Google Gemini API
  if (geminiKey && geminiKey.trim().length > 10) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are an AI Support Triage & Ticket Escalation Specialist.
Analyze the following customer support ticket and return STRICT JSON with NO MARKDOWN OR BACKTICKS:

Title: "${input.title}"
Description: "${input.description}"

Expected JSON Schema:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "FRUSTRATED",
  "sentimentScore": <number between -1.0 (most angry) and 1.0 (most delighted)>,
  "urgencyScore": <integer between 0 and 100>,
  "recommendedCategory": "TECHNICAL" | "BILLING" | "ACCOUNT" | "GENERAL",
  "recommendedPriority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "autoEscalateRecommended": <boolean>,
  "escalationReason": "<brief explanation if escalated, else empty string>",
  "keyIssues": ["<issue1>", "<issue2>"],
  "suggestedReply": "<empathic, professional first response draft ready for agent to send>"
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleanJson = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleanJson);

      return {
        sentiment: parsed.sentiment || "NEUTRAL",
        sentimentScore: Number(parsed.sentimentScore) || 0,
        urgencyScore: Number(parsed.urgencyScore) || 50,
        recommendedCategory: parsed.recommendedCategory || "GENERAL",
        recommendedPriority: parsed.recommendedPriority || "MEDIUM",
        autoEscalateRecommended: Boolean(parsed.autoEscalateRecommended),
        escalationReason: parsed.escalationReason || "",
        suggestedReply: parsed.suggestedReply || "",
        keyIssues: Array.isArray(parsed.keyIssues) ? parsed.keyIssues : [],
        modelUsed: "gemini-1.5-flash",
        analyzedAt: new Date(),
      };
    } catch (err: unknown) {
      console.warn("Gemini API call failed, attempting fallback:", err instanceof Error ? err.message : err);
    }
  }

  // 2. Attempt Grok (xAI) API if available
  if (grokKey && grokKey.trim().length > 10) {
    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${grokKey}`,
        },
        body: JSON.stringify({
          model: "grok-beta",
          messages: [
            {
              role: "system",
              content:
                "You are an AI Support Triage engine. Always reply with raw JSON only, no backticks.",
            },
            {
              role: "user",
              content: `Analyze ticket:\nTitle: "${input.title}"\nDescription: "${input.description}"\nJSON format: {"sentiment":"POSITIVE"|"NEUTRAL"|"NEGATIVE"|"FRUSTRATED","sentimentScore":number,"urgencyScore":number,"recommendedCategory":"TECHNICAL"|"BILLING"|"ACCOUNT"|"GENERAL","recommendedPriority":"LOW"|"MEDIUM"|"HIGH"|"URGENT","autoEscalateRecommended":boolean,"escalationReason":string,"keyIssues":string[],"suggestedReply":string}`,
            },
          ],
          temperature: 0.2,
        }),
      });

      if (response.ok) {
        const grokData = await response.json();
        const content = grokData.choices?.[0]?.message?.content?.trim();
        const cleanJson = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(cleanJson);

        return {
          sentiment: parsed.sentiment || "NEUTRAL",
          sentimentScore: Number(parsed.sentimentScore) || 0,
          urgencyScore: Number(parsed.urgencyScore) || 50,
          recommendedCategory: parsed.recommendedCategory || "GENERAL",
          recommendedPriority: parsed.recommendedPriority || "MEDIUM",
          autoEscalateRecommended: Boolean(parsed.autoEscalateRecommended),
          escalationReason: parsed.escalationReason || "",
          suggestedReply: parsed.suggestedReply || "",
          keyIssues: Array.isArray(parsed.keyIssues) ? parsed.keyIssues : [],
          modelUsed: "grok-beta",
          analyzedAt: new Date(),
        };
      }
    } catch (grokErr: unknown) {
      console.warn("Grok API call failed, falling back to heuristics:", grokErr instanceof Error ? grokErr.message : grokErr);
    }
  }

  // 3. Fallback: Native NLP Heuristic Classifier
  return analyzeTicketHeuristically(input);
}

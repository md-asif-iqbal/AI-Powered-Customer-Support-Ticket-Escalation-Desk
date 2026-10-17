import { describe, it, expect } from "vitest";
import { analyzeTicketHeuristically } from "../lib/ai-service";

describe("AI Support Triage & Sentiment Analysis", () => {
  it("should classify furious / angry billing issue as FRUSTRATED with negative sentiment", () => {
    const analysis = analyzeTicketHeuristically({
      title: "Unacceptable double charge on my credit card!",
      description: "You charged me twice for my subscription. This is terrible and a complete disaster. Refund now!",
    });

    expect(analysis.sentiment).toBe("FRUSTRATED");
    expect(analysis.sentimentScore).toBeLessThan(-0.4);
    expect(analysis.recommendedCategory).toBe("BILLING");
    expect(analysis.autoEscalateRecommended).toBe(true);
    expect(analysis.suggestedReply).toContain("BILLING");
  });

  it("should identify technical crash issues and recommend TECHNICAL category with HIGH/URGENT priority", () => {
    const analysis = analyzeTicketHeuristically({
      title: "Production backend API returning 500 server crash",
      description: "Docker container is restarting continuously due to database connection timeout exception.",
    });

    expect(analysis.recommendedCategory).toBe("TECHNICAL");
    expect(["HIGH", "URGENT"]).toContain(analysis.recommendedPriority);
    expect(analysis.keyIssues.length).toBeGreaterThan(0);
  });

  it("should classify calm account question with POSITIVE or NEUTRAL sentiment", () => {
    const analysis = analyzeTicketHeuristically({
      title: "Help with password reset and 2FA",
      description: "Thank you for the quick service earlier. Could you guide me on how to enable 2FA on my profile?",
    });

    expect(["NEUTRAL", "POSITIVE"]).toContain(analysis.sentiment);
    expect(analysis.recommendedCategory).toBe("ACCOUNT");
    expect(analysis.autoEscalateRecommended).toBe(false);
  });
});

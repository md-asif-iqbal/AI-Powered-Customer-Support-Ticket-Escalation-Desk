import { describe, it, expect } from "vitest";
import {
  calculateSlaDeadline,
  evaluateSlaStatus,
  checkAutoEscalationRules,
  SLA_HOURS_MAP,
} from "../lib/sla";

describe("SLA Business Logic Engine", () => {
  it("should calculate correct SLA deadlines for each priority", () => {
    const baseDate = new Date("2026-10-19T10:00:00Z");

    const urgent = calculateSlaDeadline(baseDate, "URGENT");
    expect(urgent.slaHours).toBe(2);
    expect(urgent.deadline.toISOString()).toBe("2026-10-19T12:00:00.000Z");

    const high = calculateSlaDeadline(baseDate, "HIGH");
    expect(high.slaHours).toBe(8);
    expect(high.deadline.toISOString()).toBe("2026-10-19T18:00:00.000Z");

    const medium = calculateSlaDeadline(baseDate, "MEDIUM");
    expect(medium.slaHours).toBe(24);
    expect(medium.deadline.toISOString()).toBe("2026-10-20T10:00:00.000Z");

    const low = calculateSlaDeadline(baseDate, "LOW");
    expect(low.slaHours).toBe(48);
    expect(low.deadline.toISOString()).toBe("2026-10-21T10:00:00.000Z");
  });

  it("should report SAFE urgency level when plenty of SLA time remains", () => {
    const created = new Date("2026-10-19T10:00:00Z");
    const deadline = new Date("2026-10-20T10:00:00Z"); // 24 hours total
    const now = new Date("2026-10-19T12:00:00Z"); // 22 hours remaining (> 25%)

    const status = evaluateSlaStatus(deadline, "OPEN", created, null, now);
    expect(status.isBreached).toBe(false);
    expect(status.urgencyLevel).toBe("SAFE");
    expect(status.percentageRemaining).toBeGreaterThan(80);
  });

  it("should report WARNING urgency level when less than 25% of SLA window remains", () => {
    const created = new Date("2026-10-19T10:00:00Z");
    const deadline = new Date("2026-10-20T10:00:00Z"); // 24 hours total
    const now = new Date("2026-10-20T08:00:00Z"); // only 2 hours remaining (~8%)

    const status = evaluateSlaStatus(deadline, "IN_PROGRESS", created, null, now);
    expect(status.isBreached).toBe(false);
    expect(status.urgencyLevel).toBe("WARNING");
    expect(status.percentageRemaining).toBeLessThanOrEqual(25);
  });

  it("should detect SLA breach when current time exceeds deadline", () => {
    const created = new Date("2026-10-19T10:00:00Z");
    const deadline = new Date("2026-10-19T12:00:00Z"); // 2 hours total
    const now = new Date("2026-10-19T13:30:00Z"); // 1.5 hours overdue

    const status = evaluateSlaStatus(deadline, "OPEN", created, null, now);
    expect(status.isBreached).toBe(true);
    expect(status.urgencyLevel).toBe("BREACHED");
    expect(status.statusText).toContain("Breached by");
  });

  it("should evaluate RESOLVED tickets based on whether resolution was within deadline", () => {
    const created = new Date("2026-10-19T10:00:00Z");
    const deadline = new Date("2026-10-19T18:00:00Z");
    const onTimeResolved = new Date("2026-10-19T15:00:00Z");

    const status = evaluateSlaStatus(deadline, "RESOLVED", created, onTimeResolved);
    expect(status.isBreached).toBe(false);
    expect(status.urgencyLevel).toBe("RESOLVED");
    expect(status.statusText).toBe("Resolved Within SLA");
  });

  it("should auto-escalate ticket if sentiment is FRUSTRATED or severely negative", () => {
    const created = new Date();
    const deadline = new Date(created.getTime() + 24 * 3600 * 1000);

    const check = checkAutoEscalationRules({
      priority: "MEDIUM",
      status: "OPEN",
      createdAt: created,
      slaDeadline: deadline,
      sentiment: "FRUSTRATED",
      sentimentScore: -0.75,
    });

    expect(check.shouldEscalate).toBe(true);
    expect(check.triggerType).toBe("AI_SENTIMENT");
  });

  it("should auto-escalate ticket if SLA is breached", () => {
    const created = new Date(Date.now() - 5 * 3600 * 1000);
    const deadline = new Date(Date.now() - 1 * 3600 * 1000); // 1 hour overdue

    const check = checkAutoEscalationRules({
      priority: "HIGH",
      status: "OPEN",
      createdAt: created,
      slaDeadline: deadline,
    });

    expect(check.shouldEscalate).toBe(true);
    expect(check.triggerType).toBe("SLA_BREACH");
  });
});

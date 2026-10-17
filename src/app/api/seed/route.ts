import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Ticket } from "@/lib/models/Ticket";
import { TicketComment } from "@/lib/models/TicketComment";
import { EscalationLog } from "@/lib/models/EscalationLog";
import { hashPassword } from "@/lib/auth";
import { calculateSlaDeadline } from "@/lib/sla";
import { analyzeTicketHeuristically } from "@/lib/ai-service";

export async function POST() {
  try {
    await connectToDatabase();

    // 1. Clean existing demo data if needed or populate if empty
    const demoPasswordHash = await hashPassword("password123");

    // Upsert Demo Users
    const customer = await User.findOneAndUpdate(
      { email: "customer@demo.com" },
      {
        name: "John Customer",
        email: "customer@demo.com",
        passwordHash: demoPasswordHash,
        role: "CUSTOMER",
      },
      { upsert: true, new: true }
    );

    const agent = await User.findOneAndUpdate(
      { email: "agent@demo.com" },
      {
        name: "Sarah Agent",
        email: "agent@demo.com",
        passwordHash: demoPasswordHash,
        role: "AGENT",
      },
      { upsert: true, new: true }
    );

    const admin = await User.findOneAndUpdate(
      { email: "admin@demo.com" },
      {
        name: "Alex Admin",
        email: "admin@demo.com",
        passwordHash: demoPasswordHash,
        role: "ADMIN",
      },
      { upsert: true, new: true }
    );

    // Check if tickets already exist; if so, return user info
    const existingTicketCount = await Ticket.countDocuments();
    if (existingTicketCount >= 4) {
      return NextResponse.json({
        message: "Demo users and sample tickets already initialized",
        credentials: {
          customer: { email: "customer@demo.com", password: "password123" },
          agent: { email: "agent@demo.com", password: "password123" },
          admin: { email: "admin@demo.com", password: "password123" },
        },
      });
    }

    // Clear old tickets to create a fresh realistic showcase
    await Ticket.deleteMany({});
    await TicketComment.deleteMany({});
    await EscalationLog.deleteMany({});

    const now = new Date();

    // Sample Ticket 1: Escalated Outage (High Frustration)
    const t1Title = "URGENT: Payment gateway double charged our client and crashed!";
    const t1Desc =
      "This is completely unacceptable. Our production checkout is throwing 500 internal server error and our customers were charged twice. Refund now and fix this immediately!";
    const t1Ai = analyzeTicketHeuristically({ title: t1Title, description: t1Desc });
    const t1Created = new Date(now.getTime() - 90 * 60 * 1000); // 1.5 hours ago
    const t1Sla = calculateSlaDeadline(t1Created, "URGENT");

    const ticket1 = await Ticket.create({
      ticketNumber: "TC-90412",
      title: t1Title,
      description: t1Desc,
      category: "BILLING",
      priority: "URGENT",
      status: "ESCALATED",
      customer: customer._id,
      assignedTo: agent._id,
      slaHours: t1Sla.slaHours,
      slaDeadline: t1Sla.deadline,
      slaBreached: false,
      aiAnalysis: t1Ai,
      tags: ["billing", "crash", "payment", "urgent"],
      createdAt: t1Created,
    });

    await EscalationLog.create({
      ticketId: ticket1._id,
      triggeredBy: undefined,
      triggerType: "AI_SENTIMENT",
      fromStatus: "OPEN",
      toStatus: "ESCALATED",
      reason: "High customer distress detected by AI sentiment analyzer (Score: -0.85). Priority set to URGENT.",
      notes: "Triggered at ticket creation.",
      createdAt: t1Created,
    });

    await TicketComment.create({
      ticketId: ticket1._id,
      author: agent._id,
      message:
        "Investigating the gateway logs right away. Our payment gateway partner confirmed a brief webhook latency spike. Reversal transactions are being initiated.",
      isInternalNote: false,
      createdAt: new Date(t1Created.getTime() + 20 * 60 * 1000),
    });

    // Sample Ticket 2: Technical API timeout (Impending SLA warning)
    const t2Title = "REST API Webhooks returning 504 Gateway Timeout intermittently";
    const t2Desc =
      "We noticed that during peak traffic hours between 2 PM and 4 PM, webhooks dispatch fails with a 504 status. Could you inspect whether the rate limit or socket pool is exhausted?";
    const t2Ai = analyzeTicketHeuristically({ title: t2Title, description: t2Desc });
    const t2Created = new Date(now.getTime() - 6 * 60 * 60 * 1000); // 6 hours ago
    const t2Sla = calculateSlaDeadline(t2Created, "HIGH"); // 8 hours window, 2h remaining -> WARNING

    const ticket2 = await Ticket.create({
      ticketNumber: "TC-81204",
      title: t2Title,
      description: t2Desc,
      category: "TECHNICAL",
      priority: "HIGH",
      status: "IN_PROGRESS",
      customer: customer._id,
      assignedTo: agent._id,
      slaHours: t2Sla.slaHours,
      slaDeadline: t2Sla.deadline,
      slaBreached: false,
      aiAnalysis: t2Ai,
      tags: ["api", "latency", "timeout"],
      createdAt: t2Created,
    });

    await TicketComment.create({
      ticketId: ticket2._id,
      author: agent._id,
      message: "Thread pool dump retrieved. Verifying Redis cache saturation.",
      isInternalNote: true,
      createdAt: new Date(t2Created.getTime() + 45 * 60 * 1000),
    });

    // Sample Ticket 3: SLA Breached Ticket
    const t3Title = "Database replica lag causing stale reports on dashboard";
    const t3Desc =
      "Daily analytics reports generated at midnight show data from 2 days ago. Please check read-replica replication lag.";
    const t3Ai = analyzeTicketHeuristically({ title: t3Title, description: t3Desc });
    const t3Created = new Date(now.getTime() - 36 * 60 * 60 * 1000); // 36 hours ago
    const t3Sla = calculateSlaDeadline(t3Created, "MEDIUM"); // 24 hours window -> Breached by 12 hours!

    const ticket3 = await Ticket.create({
      ticketNumber: "TC-74190",
      title: t3Title,
      description: t3Desc,
      category: "TECHNICAL",
      priority: "MEDIUM",
      status: "ESCALATED",
      customer: customer._id,
      assignedTo: undefined,
      slaHours: t3Sla.slaHours,
      slaDeadline: t3Sla.deadline,
      slaBreached: true,
      aiAnalysis: t3Ai,
      tags: ["database", "stale", "lag"],
      createdAt: t3Created,
    });

    await EscalationLog.create({
      ticketId: ticket3._id,
      triggeredBy: undefined,
      triggerType: "SLA_BREACH",
      fromStatus: "OPEN",
      toStatus: "ESCALATED",
      reason: "SLA window expired (24h limit breached). Ticket remained unaddressed.",
      createdAt: t3Sla.deadline,
    });

    // Sample Ticket 4: Successfully Resolved Ticket
    const t4Title = "Need help setting up SSO and SAML 2.0 with Okta";
    const t4Desc =
      "Hello team, could you please provide the ACS URL and Entity ID metadata XML for our enterprise Okta tenant?";
    const t4Ai = analyzeTicketHeuristically({ title: t4Title, description: t4Desc });
    const t4Created = new Date(now.getTime() - 20 * 60 * 60 * 1000);
    const t4Sla = calculateSlaDeadline(t4Created, "LOW");
    const t4Resolved = new Date(now.getTime() - 8 * 60 * 60 * 1000);

    await Ticket.create({
      ticketNumber: "TC-62019",
      title: t4Title,
      description: t4Desc,
      category: "ACCOUNT",
      priority: "LOW",
      status: "RESOLVED",
      customer: customer._id,
      assignedTo: agent._id,
      slaHours: t4Sla.slaHours,
      slaDeadline: t4Sla.deadline,
      slaBreached: false,
      resolvedAt: t4Resolved,
      aiAnalysis: t4Ai,
      tags: ["sso", "saml", "okta"],
      createdAt: t4Created,
    });

    return NextResponse.json({
      message: "Database successfully seeded with realistic support data & demo users!",
      credentials: {
        customer: { email: "customer@demo.com", password: "password123" },
        agent: { email: "agent@demo.com", password: "password123" },
        admin: { email: "admin@demo.com", password: "password123" },
      },
    });
  } catch (error: unknown) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed. Verify MongoDB is running.", details: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}

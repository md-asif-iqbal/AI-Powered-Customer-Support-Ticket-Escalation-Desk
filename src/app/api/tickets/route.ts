import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Ticket } from "@/lib/models/Ticket";
import { EscalationLog } from "@/lib/models/EscalationLog";
import { getAuthUser } from "@/lib/auth";
import { CreateTicketSchema } from "@/lib/validations";
import { calculateSlaDeadline, checkAutoEscalationRules, evaluateSlaStatus } from "@/lib/sla";
import { analyzeTicketWithAi } from "@/lib/ai-service";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized. Please login." }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
    const q = searchParams.get("q");

    // Role-based scoping: Customers only see their tickets
    const query: Record<string, unknown> = {};
    if (authUser.role === "CUSTOMER") {
      query.customer = authUser.userId;
    }

    if (status && status !== "ALL") query.status = status;
    if (priority && priority !== "ALL") query.priority = priority;
    if (category && category !== "ALL") query.category = category;

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { ticketNumber: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const tickets = await Ticket.find(query)
      .populate("customer", "name email role")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    // Augment with computed live SLA evaluations
    const now = new Date();
    const enrichedTickets = tickets.map((t) => {
      const slaEval = evaluateSlaStatus(
        new Date(t.slaDeadline),
        t.status,
        new Date(t.createdAt),
        t.resolvedAt ? new Date(t.resolvedAt) : null,
        now
      );
      return {
        ...t,
        slaStatus: slaEval,
      };
    });

    return NextResponse.json({ tickets: enrichedTickets });
  } catch (error: unknown) {
    console.error("Fetch tickets error:", error);
    return NextResponse.json(
      { error: "Failed to load tickets", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();

    const parseResult = CreateTicketSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, description, category, priority } = parseResult.data;

    // 1. Run AI analysis for sentiment, triage recommendations & response draft
    const aiAnalysis = await analyzeTicketWithAi({
      title,
      description,
      category,
      priority,
    });

    // 2. Determine SLA deadline based on priority
    const createdAt = new Date();
    const { deadline, slaHours } = calculateSlaDeadline(createdAt, priority);

    // 3. Evaluate Business Logic: Check if ticket qualifies for immediate auto-escalation
    const escalationDecision = checkAutoEscalationRules({
      priority,
      status: "OPEN",
      createdAt,
      slaDeadline: deadline,
      sentimentScore: aiAnalysis.sentimentScore,
      sentiment: aiAnalysis.sentiment,
      now: createdAt,
    });

    const initialStatus = escalationDecision.shouldEscalate ? "ESCALATED" : "OPEN";

    // 4. Generate unique Ticket Number (e.g. TC-48291)
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const ticketNumber = `TC-${randomSuffix}`;

    // 5. Persist Ticket in Database
    const ticket = await Ticket.create({
      ticketNumber,
      title,
      description,
      category,
      priority,
      status: initialStatus,
      customer: authUser.userId,
      slaHours,
      slaDeadline: deadline,
      slaBreached: false,
      aiAnalysis,
      tags: aiAnalysis.keyIssues || [],
    });

    // 6. If auto-escalated, log the audit record
    if (escalationDecision.shouldEscalate) {
      await EscalationLog.create({
        ticketId: ticket._id,
        triggeredBy: undefined, // System AI trigger
        triggerType: escalationDecision.triggerType || "AI_SENTIMENT",
        fromStatus: "OPEN",
        toStatus: "ESCALATED",
        reason: escalationDecision.reason,
        notes: `AI Sentiment: ${aiAnalysis.sentiment} (${aiAnalysis.sentimentScore.toFixed(
          2
        )}). Model: ${aiAnalysis.modelUsed}`,
      });
    }

    const populated = await Ticket.findById(ticket._id)
      .populate("customer", "name email role")
      .lean();

    return NextResponse.json(
      {
        message: "Ticket created successfully",
        ticket: populated,
        autoEscalated: escalationDecision.shouldEscalate,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create ticket error:", error);
    return NextResponse.json(
      { error: "Failed to create ticket", details: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}

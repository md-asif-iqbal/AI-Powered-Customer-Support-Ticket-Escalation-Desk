import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Ticket } from "@/lib/models/Ticket";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Customers only see stats for their own tickets
    const matchFilter: Record<string, unknown> = {};
    if (authUser.role === "CUSTOMER") {
      matchFilter.customer = authUser.userId;
    }

    const tickets = await Ticket.find(matchFilter).lean();

    const total = tickets.length;
    let openCount = 0;
    let inProgressCount = 0;
    let escalatedCount = 0;
    let resolvedCount = 0;
    let closedCount = 0;
    let urgentCount = 0;
    let breachedCount = 0;

    const categoryMap: Record<string, number> = {
      TECHNICAL: 0,
      BILLING: 0,
      ACCOUNT: 0,
      GENERAL: 0,
    };

    const sentimentMap: Record<string, number> = {
      POSITIVE: 0,
      NEUTRAL: 0,
      NEGATIVE: 0,
      FRUSTRATED: 0,
    };

    const now = new Date();

    for (const t of tickets) {
      if (t.status === "OPEN") openCount++;
      else if (t.status === "IN_PROGRESS") inProgressCount++;
      else if (t.status === "ESCALATED") escalatedCount++;
      else if (t.status === "RESOLVED") resolvedCount++;
      else if (t.status === "CLOSED") closedCount++;

      if (t.priority === "URGENT") urgentCount++;

      // Check SLA breach
      const isResolved = t.status === "RESOLVED" || t.status === "CLOSED";
      const checkDate = isResolved && t.resolvedAt ? new Date(t.resolvedAt) : now;
      if (checkDate.getTime() > new Date(t.slaDeadline).getTime()) {
        breachedCount++;
      }

      if (t.category && categoryMap[t.category] !== undefined) {
        categoryMap[t.category]++;
      }

      if (t.aiAnalysis?.sentiment && sentimentMap[t.aiAnalysis.sentiment] !== undefined) {
        sentimentMap[t.aiAnalysis.sentiment]++;
      }
    }

    const slaComplianceRate =
      total > 0 ? Math.round(((total - breachedCount) / total) * 100) : 100;

    return NextResponse.json({
      stats: {
        total,
        open: openCount,
        inProgress: inProgressCount,
        escalated: escalatedCount,
        resolved: resolvedCount,
        closed: closedCount,
        urgent: urgentCount,
        breached: breachedCount,
        slaComplianceRate,
        byCategory: categoryMap,
        bySentiment: sentimentMap,
      },
    });
  } catch (error: unknown) {
    console.error("Stats API error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

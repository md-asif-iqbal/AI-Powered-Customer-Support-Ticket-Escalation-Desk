import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Ticket } from "@/lib/models/Ticket";
import { EscalationLog } from "@/lib/models/EscalationLog";
import { getAuthUser } from "@/lib/auth";
import { EscalateTicketSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.status === "ESCALATED") {
      return NextResponse.json({ error: "Ticket is already escalated" }, { status: 400 });
    }

    const body = await req.json();
    const parseResult = EscalateTicketSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { reason, notes } = parseResult.data;
    const oldStatus = ticket.status;

    ticket.status = "ESCALATED";
    // If priority was LOW or MEDIUM, auto-bump to HIGH on escalation
    if (ticket.priority === "LOW" || ticket.priority === "MEDIUM") {
      ticket.priority = "HIGH";
    }

    await ticket.save();

    const log = await EscalationLog.create({
      ticketId: ticket._id,
      triggeredBy: authUser.userId,
      triggerType: "MANUAL",
      fromStatus: oldStatus,
      toStatus: "ESCALATED",
      reason,
      notes: notes || `Triggered by ${authUser.name} (${authUser.role})`,
    });

    const populatedLog = await EscalationLog.findById(log._id)
      .populate("triggeredBy", "name email role")
      .lean();

    return NextResponse.json({
      message: "Ticket escalated successfully",
      ticket,
      escalationLog: populatedLog,
    });
  } catch (error: unknown) {
    console.error("Escalate ticket error:", error);
    return NextResponse.json({ error: "Failed to escalate ticket" }, { status: 500 });
  }
}

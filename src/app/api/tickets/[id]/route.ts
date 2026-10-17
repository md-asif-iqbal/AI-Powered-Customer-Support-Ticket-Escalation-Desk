import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Ticket, TicketStatus } from "@/lib/models/Ticket";
import { TicketComment } from "@/lib/models/TicketComment";
import { EscalationLog } from "@/lib/models/EscalationLog";
import { getAuthUser } from "@/lib/auth";
import { evaluateSlaStatus } from "@/lib/sla";
import { UpdateTicketStatusSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const ticket = await Ticket.findById(id)
      .populate("customer", "name email role")
      .populate("assignedTo", "name email role")
      .lean();

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Role security check
    if (authUser.role === "CUSTOMER" && ticket.customer._id.toString() !== authUser.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch conversation thread and escalation audit logs
    const [comments, escalationLogs] = await Promise.all([
      TicketComment.find({ ticketId: id })
        .populate("author", "name email role")
        .sort({ createdAt: 1 })
        .lean(),
      EscalationLog.find({ ticketId: id })
        .populate("triggeredBy", "name email role")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // SLA computation
    const slaStatus = evaluateSlaStatus(
      new Date(ticket.slaDeadline),
      ticket.status,
      new Date(ticket.createdAt),
      ticket.resolvedAt ? new Date(ticket.resolvedAt) : null
    );

    return NextResponse.json({
      ticket: {
        ...ticket,
        slaStatus,
      },
      comments,
      escalationLogs,
    });
  } catch (error: unknown) {
    console.error("Get ticket detail error:", error);
    return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
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

    // Role check: Customers can only re-open or mark as resolved
    const body = await req.json();
    const parseResult = UpdateTicketStatusSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status: newStatus, assignedTo, note } = parseResult.data;
    const oldStatus = ticket.status;

    // Customers cannot assign agents or change status except to close/re-open their own
    if (authUser.role === "CUSTOMER") {
      if (ticket.customer.toString() !== authUser.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (newStatus !== "RESOLVED" && newStatus !== "OPEN") {
        return NextResponse.json(
          { error: "Customers can only resolve or reopen their own tickets" },
          { status: 403 }
        );
      }
    }

    ticket.status = newStatus as TicketStatus;

    if (assignedTo !== undefined) {
      ticket.assignedTo = assignedTo ? (assignedTo as unknown as typeof ticket.assignedTo) : undefined;
    }

    if (newStatus === "RESOLVED" && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    } else if (newStatus === "CLOSED" && !ticket.closedAt) {
      ticket.closedAt = new Date();
    } else if (newStatus !== "RESOLVED" && newStatus !== "CLOSED") {
      ticket.resolvedAt = undefined;
      ticket.closedAt = undefined;
    }

    await ticket.save();

    // If moved to ESCALATED, record audit log
    if (newStatus === "ESCALATED" && oldStatus !== "ESCALATED") {
      await EscalationLog.create({
        ticketId: ticket._id,
        triggeredBy: authUser.userId,
        triggerType: "MANUAL",
        fromStatus: oldStatus,
        toStatus: newStatus,
        reason: note || "Manually escalated by staff member",
      });
    }

    // If an optional note was provided, save it as a comment
    if (note && note.trim().length > 0) {
      await TicketComment.create({
        ticketId: ticket._id,
        author: authUser.userId,
        message: `Status updated from ${oldStatus} to ${newStatus}: ${note}`,
        isInternalNote: true,
      });
    }

    const updated = await Ticket.findById(id)
      .populate("customer", "name email role")
      .populate("assignedTo", "name email role")
      .lean();

    return NextResponse.json({
      message: "Ticket updated successfully",
      ticket: updated,
    });
  } catch (error: unknown) {
    console.error("Update ticket error:", error);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}

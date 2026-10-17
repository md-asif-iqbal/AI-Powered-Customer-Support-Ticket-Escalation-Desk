import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Ticket } from "@/lib/models/Ticket";
import { TicketComment } from "@/lib/models/TicketComment";
import { getAuthUser } from "@/lib/auth";
import { CreateCommentSchema } from "@/lib/validations";

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

    // Role check: Customers can only comment on their own tickets and cannot create internal notes
    if (authUser.role === "CUSTOMER") {
      if (ticket.customer.toString() !== authUser.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const parseResult = CreateCommentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { message, isInternalNote, isAiGenerated } = parseResult.data;

    // Disallow customers from writing internal notes
    const actualInternalNote = authUser.role === "CUSTOMER" ? false : isInternalNote;

    const comment = await TicketComment.create({
      ticketId: ticket._id,
      author: authUser.userId,
      message,
      isInternalNote: actualInternalNote,
      isAiGenerated,
    });

    // If ticket was OPEN and an AGENT replies, transition to IN_PROGRESS
    if (ticket.status === "OPEN" && authUser.role !== "CUSTOMER") {
      ticket.status = "IN_PROGRESS";
      await ticket.save();
    }

    const populated = await TicketComment.findById(comment._id)
      .populate("author", "name email role")
      .lean();

    return NextResponse.json(
      { message: "Comment added", comment: populated },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create comment error:", error);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}

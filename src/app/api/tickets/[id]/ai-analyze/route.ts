import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Ticket } from "@/lib/models/Ticket";
import { getAuthUser } from "@/lib/auth";
import { analyzeTicketWithAi } from "@/lib/ai-service";

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

    const aiAnalysis = await analyzeTicketWithAi({
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
    });

    ticket.aiAnalysis = aiAnalysis;
    await ticket.save();

    return NextResponse.json({
      message: "AI analysis refreshed successfully",
      aiAnalysis,
    });
  } catch (error: unknown) {
    console.error("AI re-analysis error:", error);
    return NextResponse.json({ error: "Failed to perform AI analysis" }, { status: 500 });
  }
}

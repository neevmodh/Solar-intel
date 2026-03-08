/**
 * Solar Intel - API: /api/chat
 * RAG-powered conversational interface with agentic capabilities.
 * 
 * POST: Send message, get RAG-grounded response
 * GET:  Get conversation history
 * DELETE: Clear conversation
 */

import { NextResponse } from "next/server";
import { queryRAG, getConversationHistory, clearConversation } from "@/backend/services/rag.service";
import { runAgentWorkflow } from "@/backend/services/agent.service";
import { runInputGuardrails } from "@/backend/services/guardrails.service";

/** Detect if the user wants an autonomous agent action */
function isAgentRequest(message: string): boolean {
  const agentTriggers = [
    "run assessment", "run risk assessment", "generate tickets",
    "maintenance tickets", "autonomous", "auto-assess",
    "scan all", "check all inverters", "full scan",
    "draft tickets", "create tickets",
  ];
  const lower = message.toLowerCase();
  return agentTriggers.some((t) => lower.includes(t));
}

/** Extract plant ID from agent request if specified */
function extractPlantIdForAgent(message: string): string | undefined {
  const match = message.match(/PLANT-\d+/i);
  return match ? match[0].toUpperCase() : undefined;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, sessionId = `session-${Date.now()}` } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // ── Guardrail check at API gateway level ──
    const guardrailCheck = runInputGuardrails(sessionId, message);
    if (!guardrailCheck.allowed) {
      return NextResponse.json({
        sessionId,
        message: {
          id: `msg-${Date.now()}-guard`,
          role: "assistant",
          content: guardrailCheck.reason || "I can only help with solar plant operations.",
          timestamp: new Date().toISOString(),
          sources: [],
        },
        agentMode: false,
        guardrailBlocked: true,
      });
    }

    // Check if this is an agentic workflow request
    if (isAgentRequest(message)) {
      const plantId = extractPlantIdForAgent(message);
      const result = await runAgentWorkflow(plantId);

      return NextResponse.json({
        sessionId,
        message: result.message,
        agentMode: true,
        actions: result.actions,
        tickets: result.tickets,
      });
    }

    // Standard RAG query
    const response = await queryRAG(sessionId, message);

    return NextResponse.json({
      sessionId,
      message: response,
      agentMode: false,
    });
  } catch (err: unknown) {
    console.error("POST /api/chat error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Chat failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const history = getConversationHistory(sessionId);
    return NextResponse.json({ sessionId, messages: history });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    clearConversation(sessionId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

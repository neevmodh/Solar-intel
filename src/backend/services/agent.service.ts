/**
 * Solar Intel - Agentic AI Service
 * 
 * Autonomous workflow that:
 *   1. Retrieves inverter/plant data
 *   2. Runs ML risk assessment
 *   3. Generates maintenance tickets
 *   4. Provides actionable recommendations
 * 
 * Implements tool-calling pattern with Groq LLM.
 */

import { connectDB } from "@/backend/config";
import { env } from "@/backend/config/env";
import { Plant, Inverter } from "@/backend/models";
import { getMLPredictions } from "./ml-prediction.service";
import { runOutputGuardrails } from "./guardrails.service";
import logger from "@/backend/utils/logger";
import type { AgentAction, ChatMessage } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface MaintenanceTicket {
  ticketId: string;
  inverterId: string;
  inverterName: string;
  plantId: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  estimatedDuration: string;
  riskScore: number;
  topFactors: string[];
  createdAt: string;
}

/** Agent Tool: Retrieve plant/inverter data */
async function toolRetrieveData(plantId?: string): Promise<{ plants: any[]; inverters: any[] }> {
  await connectDB();
  const plants = plantId
    ? await Plant.find({ plantId }).lean()
    : await Plant.find({}).lean();
  const inverters = plantId
    ? await Inverter.find({ plantId }).lean()
    : await Inverter.find({}).lean();
  return { plants, inverters };
}

/** Agent Tool: Run ML risk assessment */
async function toolRunRiskAssessment(inverters: any[]): Promise<any[]> {
  const predictions = await getMLPredictions(inverters);
  return predictions || [];
}

/** Agent Tool: Draft maintenance tickets for high-risk inverters */
function toolDraftTickets(inverters: any[], predictions: any[]): MaintenanceTicket[] {
  const tickets: MaintenanceTicket[] = [];
  const predMap = new Map<string, any>();
  for (const p of predictions) predMap.set(p.inverter_id, p);

  for (const inv of inverters) {
    const pred = predMap.get(inv.inverterId);
    if (!pred) continue;

    if (pred.risk_score >= 0.5 || pred.failure_predicted) {
      const priority =
        pred.risk_score >= 0.75 ? "critical" :
        pred.risk_score >= 0.5 ? "high" :
        pred.risk_score >= 0.25 ? "medium" : "low";

      tickets.push({
        ticketId: `TKT-${Date.now()}-${inv.inverterId}`,
        inverterId: inv.inverterId,
        inverterName: inv.name,
        plantId: inv.plantId || "unknown",
        priority,
        title: `${priority.toUpperCase()} - Preventive Maintenance: ${inv.name}`,
        description: `ML model predicts ${(pred.risk_score * 100).toFixed(1)}% failure risk within 7-10 days. Top contributing factors: ${pred.top_factors?.join(", ") || "N/A"}. Recommended action: ${pred.recommended_action || "Schedule inspection"}`,
        estimatedDuration: priority === "critical" ? "4-6 hours" : priority === "high" ? "2-4 hours" : "1-2 hours",
        riskScore: Math.round(pred.risk_score * 100),
        topFactors: pred.top_factors || [],
        createdAt: new Date().toISOString(),
      });
    }
  }

  return tickets.sort((a, b) => b.riskScore - a.riskScore);
}

/** Generate agent narrative using Groq */
async function generateAgentNarrative(
  tickets: MaintenanceTicket[],
  plantSummary: string
): Promise<string> {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) {
    return buildFallbackNarrative(tickets);
  }

  const prompt = `You are Solar Intel's autonomous maintenance agent. You have just completed an automated risk assessment.

ASSESSMENT RESULTS:
${plantSummary}

GENERATED MAINTENANCE TICKETS:
${tickets.map((t) => `- [${t.priority.toUpperCase()}] ${t.title} | Risk: ${t.riskScore}% | Factors: ${t.topFactors.join(", ")}`).join("\n")}

Write a concise executive summary (3-5 sentences) of the findings and recommended immediate actions. Be specific with inverter IDs and risk percentages.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a solar energy maintenance AI agent. Be concise, technical, and actionable." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!res.ok) return buildFallbackNarrative(tickets);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || buildFallbackNarrative(tickets);
  } catch {
    return buildFallbackNarrative(tickets);
  }
}

function buildFallbackNarrative(tickets: MaintenanceTicket[]): string {
  if (tickets.length === 0) {
    return "All inverters are operating within normal parameters. No maintenance tickets generated.";
  }

  const critical = tickets.filter((t) => t.priority === "critical");
  const high = tickets.filter((t) => t.priority === "high");

  let narrative = `Automated risk assessment complete. Generated ${tickets.length} maintenance ticket(s).`;
  if (critical.length > 0) {
    narrative += ` CRITICAL: ${critical.map((t) => `${t.inverterId} (${t.riskScore}% risk)`).join(", ")} require immediate attention.`;
  }
  if (high.length > 0) {
    narrative += ` HIGH priority: ${high.map((t) => `${t.inverterId} (${t.riskScore}% risk)`).join(", ")} should be scheduled within 48 hours.`;
  }
  return narrative;
}

/** Main agentic workflow - autonomous execution */
export async function runAgentWorkflow(plantId?: string): Promise<{
  actions: AgentAction[];
  tickets: MaintenanceTicket[];
  narrative: string;
  message: ChatMessage;
}> {
  const actions: AgentAction[] = [];
  const startTime = Date.now();

  // Step 1: Retrieve Data
  actions.push({
    type: "data-retrieval",
    status: "running",
    description: `Retrieving data${plantId ? ` for ${plantId}` : " for all plants"}...`,
  });

  const { plants, inverters } = await toolRetrieveData(plantId);
  actions[actions.length - 1].status = "completed";
  actions[actions.length - 1].result = `Found ${plants.length} plant(s) and ${inverters.length} inverter(s)`;

  // Step 2: Run Risk Assessment
  actions.push({
    type: "risk-assessment",
    status: "running",
    description: "Running ML risk assessment on all inverters...",
  });

  const predictions = await toolRunRiskAssessment(inverters);
  actions[actions.length - 1].status = "completed";
  const highRisk = predictions.filter((p: any) => p.risk_score >= 0.5).length;
  actions[actions.length - 1].result = `Assessed ${predictions.length} inverter(s). ${highRisk} at elevated risk.`;

  // Step 3: Generate Maintenance Tickets
  actions.push({
    type: "maintenance-ticket",
    status: "running",
    description: "Drafting maintenance tickets for high-risk inverters...",
  });

  const tickets = toolDraftTickets(inverters, predictions);
  actions[actions.length - 1].status = "completed";
  actions[actions.length - 1].result = `Generated ${tickets.length} maintenance ticket(s)`;

  // Step 4: Generate Narrative
  const plantSummary = plants.map((p: any) =>
    `${p.plantId} "${p.name}": ${inverters.filter((i: any) => i.plantId === p.plantId).length} inverters`
  ).join("; ");

  const narrative = await generateAgentNarrative(tickets, plantSummary);

  // Output guardrails on the generated narrative
  const guardrailOutput = runOutputGuardrails(narrative);
  const safeNarrative = guardrailOutput.sanitizedOutput;

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const message: ChatMessage = {
    id: `agent-${Date.now()}`,
    role: "assistant",
    content: safeNarrative,
    timestamp: new Date().toISOString(),
    agentAction: {
      type: "risk-assessment",
      status: "completed",
      description: `Autonomous assessment completed in ${elapsed}s`,
      result: `${tickets.length} tickets generated`,
    },
  };

  logger.info("Agent workflow completed", {
    plants: plants.length,
    inverters: inverters.length,
    predictions: predictions.length,
    tickets: tickets.length,
    elapsed: `${elapsed}s`,
  });

  return { actions, tickets, narrative, message };
}

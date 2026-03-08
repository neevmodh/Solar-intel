"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { pageTransition } from "@/lib/motion";
import { sendChatMessage } from "@/lib/api-client";
import { TranslatedText } from "@/components/ui/translated-text";
import {
  Send, Bot, User, Trash2,
  Loader2, Sparkles, AlertTriangle, Wrench,
  Brain, RefreshCw, ShieldCheck, Database,
} from "lucide-react";

import type { AgentAction } from "@/types";

interface Message {
  role: "user" | "assistant" | "agent";
  content: string;
  timestamp: string;
  sources?: Array<{
    type: string;
    id: string;
    name: string;
    relevance: number;
  }>;
  guardrailBlocked?: boolean;
  tickets?: Array<{
    inverterId?: string;
    severity?: string;
    priority?: string;
    issue?: string;
    title?: string;
    recommendation?: string;
    description?: string;
    riskScore?: number;
    topFactors?: string[];
  }>;
  actions?: AgentAction[];
}

const AGENT_TRIGGERS = [
  "run assessment",
  "generate tickets",
  "maintenance check",
  "agent mode",
  "full analysis",
  "autonomous",
  "risk scan",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `chat-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isAgentTrigger = (text: string) =>
    AGENT_TRIGGERS.some((t) => text.toLowerCase().includes(t));

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage(trimmed, sessionId);

      const content =
        typeof res.message === "string"
          ? res.message
          : res.message?.content || "No response.";

      const assistantMsg: Message = {
        role: res.agentMode ? "agent" : "assistant",
        content,
        timestamp: new Date().toISOString(),
        tickets: res.tickets,
        actions: res.actions,
        sources: res.message?.sources || [],
        guardrailBlocked: res.guardrailBlocked || false,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClear = () => {
    setMessages([]);
    fetch(`/api/chat?sessionId=${sessionId}`, { method: "DELETE" });
  };

  const suggestedQueries = [
    "What is the health status of PLANT-001?",
    "Which inverters have the highest risk?",
    "Run assessment for all plants",
    "Show me the top maintenance priorities",
    "What are the power output trends?",
    "Generate maintenance tickets",
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="chat"
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="mx-auto flex h-[calc(100vh-120px)] max-w-[1440px] flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <motion.h2
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl font-bold tracking-tight text-foreground"
            >
              <TranslatedText text="AI Assistant" />
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-1 text-sm text-muted-foreground"
            >
              <TranslatedText text="Ask questions about your solar plants or trigger autonomous assessments." />
            </motion.p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              title="Clear conversation"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-red-500/30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <TranslatedText text="Clear" />
            </button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card/50 p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-xl bg-purple-500/10 p-4 mb-4">
                <Brain className="h-10 w-10 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                <TranslatedText text="Solar Intel AI Assistant" />
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                <TranslatedText text="Ask anything about your solar plants, inverters, and maintenance. Use keywords like 'run assessment' to trigger the autonomous agent." />
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                {suggestedQueries.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-left text-xs text-muted-foreground hover:border-purple-500/30 hover:text-foreground transition-colors"
                  >
                    <Sparkles className="inline h-3 w-3 mr-1.5 text-purple-400" />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                  <TranslatedText text="Thinking..." />
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about your solar plants..."
              title="Chat input"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-purple-500/50 focus:outline-none transition-colors"
              disabled={loading}
            />
            {isAgentTrigger(input) && (
              <div className="absolute right-12 top-1/2 -translate-y-1/2">
                <span className="flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-400 font-medium">
                  <Bot className="h-3 w-3" /> Agent
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            title="Send message"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isAgent = message.role === "agent";
  const isGuarded = message.guardrailBlocked;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-blue-500/20 text-blue-400"
            : isGuarded
              ? "bg-amber-500/20 text-amber-400"
              : isAgent
                ? "bg-purple-500/20 text-purple-400"
                : "bg-emerald-500/20 text-emerald-400"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : isGuarded ? <ShieldCheck className="h-4 w-4" /> : isAgent ? <Bot className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
        isUser
          ? "bg-blue-600/20 border border-blue-500/20"
          : isGuarded
            ? "bg-amber-500/10 border border-amber-500/20"
            : "bg-muted/50 border border-border"
      }`}>
        {isGuarded && (
          <div className="flex items-center gap-1.5 mb-2 text-[10px] text-amber-400 font-medium">
            <ShieldCheck className="h-3 w-3" /> Guardrail Protected
          </div>
        )}
        {isAgent && (
          <div className="flex items-center gap-1.5 mb-2 text-[10px] text-purple-400 font-medium">
            <Bot className="h-3 w-3" /> Autonomous Agent
          </div>
        )}

        {/* Agent Action Steps */}
        {message.actions && message.actions.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {message.actions.map((action, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {action.status === "completed" ? (
                  <RefreshCw className="h-3 w-3 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-yellow-400" />
                )}
                <span className="text-muted-foreground">{action.description}</span>
                <span className={action.status === "completed" ? "text-emerald-400" : "text-yellow-400"}>
                  {action.status}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>

        {/* Maintenance Tickets */}
        {message.tickets && message.tickets.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Wrench className="h-3 w-3" /> Maintenance Tickets ({message.tickets.length})
            </div>
            {message.tickets.map((ticket, i) => {
              const sev = ticket.severity || ticket.priority || "medium";
              const issue = ticket.issue || ticket.title || "Maintenance required";
              const rec = ticket.recommendation || ticket.description || "";
              return (
              <div
                key={i}
                className={`rounded-lg border p-2.5 text-xs ${
                  sev === "critical"
                    ? "border-red-500/30 bg-red-500/10"
                    : sev === "high"
                      ? "border-orange-500/30 bg-orange-500/10"
                      : "border-yellow-500/30 bg-yellow-500/10"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground">{ticket.inverterId || "Unknown"}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    sev === "critical" ? "bg-red-500/20 text-red-400" :
                    sev === "high" ? "bg-orange-500/20 text-orange-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {sev.toUpperCase()}
                  </span>
                </div>
                <p className="text-muted-foreground">{issue}</p>
                {rec && <p className="mt-1 text-emerald-400">{rec}</p>}
                {ticket.riskScore !== undefined && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${ticket.riskScore >= 75 ? "bg-red-500" : ticket.riskScore >= 50 ? "bg-orange-500" : "bg-yellow-500"}`} style={{ width: `${ticket.riskScore}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{ticket.riskScore}%</span>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}

        {/* Sources */}
        {message.sources && message.sources.length > 0 && !isUser && (
          <div className="mt-3 pt-2 border-t border-border/50">
            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1.5">
              <Database className="h-3 w-3" /> Sources ({message.sources.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {message.sources.slice(0, 6).map((src, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {src.type === "plant" ? "🏭" : src.type === "inverter" ? "⚡" : src.type === "ml-prediction" ? "🤖" : "📊"}
                  {src.id}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

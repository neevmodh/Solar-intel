/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Guardrails Service
 * ─────────────────────────────────────────────────────────
 * Multi-layer input/output guardrails for the LLM chatbot.
 *
 * LAYER 1 — Input Validation : Length, encoding, basic sanity
 * LAYER 2 — Jailbreak Detection : Pattern matching + semantic
 * LAYER 3 — Domain Gate         : Only solar/energy topics allowed
 * LAYER 4 — Output Validation   : Strip leaked prompts, PII, hallucination markers
 * LAYER 5 — Rate Limiting       : Per-session throttle
 * ─────────────────────────────────────────────────────────
 */

import logger from "@/backend/utils/logger";

/* ────────────────────── Types ────────────────────── */

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  sanitizedInput?: string;
  severity?: "low" | "medium" | "high" | "critical";
}

export interface OutputGuardrailResult {
  safe: boolean;
  sanitizedOutput: string;
  flagged?: string[];
}

/* ────────────────── LAYER 1: Input Validation ────────────────── */

const MAX_INPUT_LENGTH = 2000;
const MIN_INPUT_LENGTH = 1;

function validateInput(input: string): GuardrailResult {
  if (!input || typeof input !== "string") {
    return { allowed: false, reason: "Empty or invalid input.", severity: "low" };
  }

  const trimmed = input.trim();

  if (trimmed.length < MIN_INPUT_LENGTH) {
    return { allowed: false, reason: "Message is too short.", severity: "low" };
  }

  if (trimmed.length > MAX_INPUT_LENGTH) {
    return { allowed: false, reason: `Message too long (${trimmed.length} chars). Max ${MAX_INPUT_LENGTH}.`, severity: "low" };
  }

  // Strip null bytes, control characters (except newlines/tabs)
  const cleaned = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return { allowed: true, sanitizedInput: cleaned };
}

/* ────────────────── LAYER 2: Jailbreak Detection ────────────────── */

/**
 * Comprehensive jailbreak pattern detection.
 * Catches: prompt injection, role hijacking, instruction override,
 *          DAN/evil mode, encoding tricks, system prompt leaks.
 */
const JAILBREAK_PATTERNS: { pattern: RegExp; label: string; severity: "medium" | "high" | "critical" }[] = [
  // ── Direct prompt injection ──
  { pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|rules|prompts|directives|constraints)/i, label: "prompt-injection-ignore", severity: "critical" },
  { pattern: /disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions|rules|prompts|guidelines)/i, label: "prompt-injection-disregard", severity: "critical" },
  { pattern: /forget\s+(all\s+)?(previous|prior|your)\s+(instructions|rules|training|programming)/i, label: "prompt-injection-forget", severity: "critical" },
  { pattern: /override\s+(your|all|the|system)\s+(instructions|rules|constraints|programming|behavior)/i, label: "prompt-injection-override", severity: "critical" },

  // ── Role hijacking ──
  { pattern: /you\s+are\s+now\s+(a|an|the|my)\s/i, label: "role-hijack-you-are-now", severity: "critical" },
  { pattern: /act\s+as\s+(a|an|if\s+you\s+are|though)\s/i, label: "role-hijack-act-as", severity: "high" },
  { pattern: /pretend\s+(to\s+be|you\s+are|that)/i, label: "role-hijack-pretend", severity: "critical" },
  { pattern: /role[\s-]*play\s+as/i, label: "role-hijack-roleplay", severity: "critical" },
  { pattern: /switch\s+(to|into)\s+.*(mode|persona|character)/i, label: "role-hijack-switch-mode", severity: "critical" },
  { pattern: /enter\s+.*(mode|persona)/i, label: "role-hijack-enter-mode", severity: "high" },

  // ── DAN / evil mode attacks ──
  { pattern: /\bDAN\b/i, label: "dan-mode", severity: "critical" },
  { pattern: /do\s+anything\s+now/i, label: "dan-mode-full", severity: "critical" },
  { pattern: /evil\s*(mode|version|bot|ai)/i, label: "evil-mode", severity: "critical" },
  { pattern: /jailbreak/i, label: "jailbreak-explicit", severity: "critical" },
  { pattern: /uncensored\s+(mode|version|response)/i, label: "uncensored-mode", severity: "critical" },
  { pattern: /without\s+(any\s+)?(restrictions|limitations|constraints|filters|guardrails|rules)/i, label: "remove-restrictions", severity: "critical" },
  { pattern: /no\s+(rules|restrictions|limitations|constraints|boundaries|guardrails)/i, label: "no-rules", severity: "critical" },

  // ── System prompt extraction ──
  { pattern: /what\s+(is|are)\s+your\s+(system\s+)?(prompt|instructions|rules|programming|directives)/i, label: "system-prompt-leak", severity: "high" },
  { pattern: /show\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instructions|rules)/i, label: "system-prompt-show", severity: "high" },
  { pattern: /show\s+(me\s+)?(your|the)\s+(original|initial|real)\s+(instructions|prompt|rules)/i, label: "system-prompt-show-original", severity: "high" },
  { pattern: /reveal\s+(your|the)\s+(system|original|initial)\s+(prompt|instructions)/i, label: "system-prompt-reveal", severity: "high" },
  { pattern: /repeat\s+(your|the)\s+(system\s+)?(prompt|instructions|rules)\s+(back|verbatim|exactly)/i, label: "system-prompt-repeat", severity: "critical" },
  { pattern: /print\s+(your|the)\s+(system|initial)\s+prompt/i, label: "system-prompt-print", severity: "high" },

  // ── Instruction injection via encoding tricks ──
  { pattern: /\[system\]/i, label: "fake-system-tag", severity: "critical" },
  { pattern: /\[INST\]/i, label: "fake-inst-tag", severity: "critical" },
  { pattern: /<<\s*SYS\s*>>/i, label: "fake-sys-tag", severity: "critical" },
  { pattern: /<\|im_start\|>/i, label: "fake-im-start", severity: "critical" },
  { pattern: /```system/i, label: "fake-system-codeblock", severity: "high" },
  { pattern: /SYSTEM:\s*\n/i, label: "fake-system-prefix", severity: "high" },

  // ── Prompt chaining / multi-step attacks ──
  { pattern: /new\s+conversation\s*[:.]?\s*(you|your|from\s+now)/i, label: "new-conversation-trick", severity: "critical" },
  { pattern: /reset\s+(your|all|the)\s+(context|memory|instructions|conversation)/i, label: "context-reset", severity: "high" },
  { pattern: /from\s+now\s+on\s*,?\s*(you|ignore|disregard|forget)/i, label: "from-now-on", severity: "critical" },
  { pattern: /for\s+the\s+rest\s+of\s+this\s+conversation/i, label: "rest-of-conversation", severity: "high" },

  // ── Hypothetical framing to bypass restrictions ──
  { pattern: /hypothetically\s*,?\s*(if|what\s+if)\s+(you|there\s+were\s+no)\s*(had\s+no|could\s+ignore|didn'?t\s+have)/i, label: "hypothetical-bypass", severity: "high" },
  { pattern: /in\s+a\s+(fictional|imaginary|hypothetical)\s+(world|scenario|universe)\s+(where\s+you|with\s+no)/i, label: "fictional-bypass", severity: "high" },

  // ── Token smuggling / obfuscation ──
  { pattern: /base64\s*:/i, label: "base64-injection", severity: "high" },
  { pattern: /\\u00[0-9a-f]{2}/i, label: "unicode-escape-injection", severity: "medium" },
  { pattern: /&#x?[0-9a-f]+;/i, label: "html-entity-injection", severity: "medium" },
];

function detectJailbreak(input: string): GuardrailResult {
  const normalizedInput = input
    .replace(/[^\w\s.,!?'"()-]/g, " ")   // Strip special chars but keep basic punctuation
    .replace(/\s+/g, " ")                 // Collapse whitespace
    .trim();

  for (const { pattern, label, severity } of JAILBREAK_PATTERNS) {
    if (pattern.test(input) || pattern.test(normalizedInput)) {
      logger.warn("Jailbreak attempt detected", { label, severity, inputSnippet: input.slice(0, 100) });
      return {
        allowed: false,
        reason: "I can only help with solar plant operations, inverter monitoring, and energy management questions. Please ask something related to your solar fleet.",
        severity,
      };
    }
  }

  return { allowed: true };
}

/* ────────────────── LAYER 3: Domain Gate ────────────────── */

/**
 * Ensures the query is related to the solar energy domain.
 * Uses both positive (solar keywords) and negative (off-topic) matching.
 */
const SOLAR_DOMAIN_KEYWORDS = [
  // Core solar terms
  "solar", "plant", "inverter", "panel", "module", "pv", "photovoltaic",
  "irradiance", "irradiation", "insolation",
  // Energy terms
  "energy", "power", "watt", "kwh", "mwh", "generation", "yield", "output",
  "grid", "voltage", "current", "frequency", "ac", "dc", "efficiency",
  // Operations terms
  "risk", "maintenance", "alert", "fault", "alarm", "degradation",
  "performance", "ratio", "uptime", "downtime", "outage", "failure",
  "temperature", "heat", "thermal", "overheating", "cooling",
  // Specific to Solar Intel system
  "plant-", "inv-", "telemetry", "prediction", "forecast", "assessment",
  "ticket", "health", "status", "capacity", "firmware", "string",
  "anomaly", "anomalies", "carbon", "emission", "sustainability",
  "discom", "net meter", "feed-in", "curtailment",
  // Common solar questions
  "weather", "cloud", "shade", "dust", "soiling", "cleaning",
  "roi", "payback", "lcoe", "cost",
  // Greetings & meta (allowed)
  "hello", "hi", "hey", "help", "thank", "thanks", "bye", "what can you",
  "how do you", "who are you", "what are you",
  // Data questions
  "data", "show", "list", "compare", "trend", "chart", "graph",
  "summary", "overview", "report", "analysis", "dashboard",
  "how many", "which", "what is", "tell me", "explain",
];

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /write\s+(me\s+)?(a\s+)?(poem|story|essay|song|joke|code|script|email|letter)/i,
  /translate\s+.+\s+(to|into)\s+(french|spanish|german|chinese|japanese|hindi|arabic)/i,
  /\b(recipe|cook(ing)?|food|restaurant|pasta|pizza)\b/i,
  /\b(stock|crypto|bitcoin|trading|forex|investment\s+advice)\b/i,
  /\b(dating|relationship|love\s+advice)\b/i,
  /\b(medical|diagnosis|symptom|prescription|drug)\b/i,
  /\b(legal\s+advice|lawsuit|attorney|lawyer)\b/i,
  /how\s+to\s+(hack|break\s+into|exploit|crack)/i,
  /\b(weapon|bomb|explosive|poison)\b/i,
  /\b(gambling|casino|bet|lottery)\b/i,
];

function checkDomainRelevance(input: string): GuardrailResult {
  const lower = input.toLowerCase();

  // Check off-topic patterns first (higher priority)
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(input)) {
      return {
        allowed: false,
        reason: "I'm Solar Intel's AI assistant, specialized in solar plant operations, inverter monitoring, and energy management. I can't help with that topic, but feel free to ask me about your solar fleet!",
        severity: "low",
      };
    }
  }

  // Short messages are likely greetings or follow-ups — allow them
  if (lower.length < 30) return { allowed: true };

  // Check if any solar domain keyword is present
  const hasDomainKeyword = SOLAR_DOMAIN_KEYWORDS.some((kw) => lower.includes(kw));

  if (!hasDomainKeyword) {
    // Could be a follow-up question using pronouns ("what about that one?")
    // Allow if it looks like a follow-up
    const followUpPatterns = /\b(that|this|it|those|these|the same|previous|above|also|more|another|again)\b/i;
    if (followUpPatterns.test(input)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: "I'm specialized in solar plant operations and energy management. Could you rephrase your question in the context of your solar fleet? For example, ask about inverter health, power output, risk assessments, or maintenance scheduling.",
      severity: "low",
    };
  }

  return { allowed: true };
}

/* ────────────────── LAYER 4: Output Validation ────────────────── */

/**
 * Sanitizes LLM output to prevent:
 * - System prompt leakage
 * - PII exposure
 * - Off-topic content that slipped through
 * - Harmful or inappropriate content
 */
function validateOutput(output: string): OutputGuardrailResult {
  const flagged: string[] = [];
  let sanitized = output;

  // Strip any leaked system prompt fragments
  const systemPromptLeaks = [
    /CRITICAL RULES:[\s\S]*?(?=\n\n|\n[A-Z])/gi,
    /HALLUCINATION GUARDRAILS:[\s\S]*?(?=\n\n|\n[A-Z])/gi,
    /GROUNDING RULES:[\s\S]*?(?=\n\n|\n[A-Z])/gi,
    /SECURITY DIRECTIVES:[\s\S]*?(?=\n\n|\n[A-Z])/gi,
    /DOMAIN SCOPE:[\s\S]*?(?=\n\n|\n[A-Z])/gi,
    /You are Solar Intel AI.*?(?=\n\n)/gi,
    /\[system\][\s\S]*?\[\/system\]/gi,
    /<<SYS>>[\s\S]*?<<\/SYS>>/gi,
  ];

  for (const pattern of systemPromptLeaks) {
    if (pattern.test(sanitized)) {
      flagged.push("system-prompt-leak-in-output");
      sanitized = sanitized.replace(pattern, "");
    }
  }

  // Strip potential PII patterns (emails, phone numbers, IPs)
  const piiPatterns = [
    { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label: "email-in-output" },
    { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, label: "phone-in-output" },
    { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, label: "ip-in-output" },
    { pattern: /\b(?:GROQ_API_KEY|MONGODB_URI|NEXTAUTH_SECRET)\s*[=:]\s*\S+/gi, label: "secret-in-output" },
  ];

  for (const { pattern, label } of piiPatterns) {
    if (pattern.test(sanitized)) {
      flagged.push(label);
      sanitized = sanitized.replace(pattern, "[REDACTED]");
    }
  }

  // Check if output went completely off-topic
  const offTopicOutput = /\b(As a large language model|I('m| am) (just )?an? AI|I cannot|I don't have personal|I was created by|OpenAI|Anthropic|Google AI|Meta AI)\b/i;
  if (offTopicOutput.test(sanitized)) {
    flagged.push("meta-ai-disclosure");
    // Don't block, but log it
  }

  // Truncate excessively long outputs
  if (sanitized.length > 4000) {
    sanitized = sanitized.slice(0, 4000) + "\n\n_[Response truncated for brevity]_";
    flagged.push("output-truncated");
  }

  return {
    safe: flagged.filter((f) => f.includes("leak") || f.includes("secret")).length === 0,
    sanitizedOutput: sanitized.trim(),
    flagged: flagged.length > 0 ? flagged : undefined,
  };
}

/* ────────────────── LAYER 5: Rate Limiting ────────────────── */

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 messages per minute

function checkRateLimit(sessionId: string): GuardrailResult {
  const now = Date.now();
  const entry = rateLimitStore.get(sessionId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(sessionId, { count: 1, windowStart: now });
    return { allowed: true };
  }

  entry.count++;

  if (entry.count > RATE_LIMIT_MAX) {
    logger.warn("Rate limit exceeded", { sessionId, count: entry.count });
    return {
      allowed: false,
      reason: "You're sending messages too quickly. Please wait a moment before trying again.",
      severity: "medium",
    };
  }

  return { allowed: true };
}

// Cleanup stale entries every 5 minutes (skip in test environment)
if (typeof process === "undefined" || process.env.NODE_ENV !== "test") {
  setInterval(() => {
    const now = Date.now();
    const keys = Array.from(rateLimitStore.keys());
    for (const key of keys) {
      const entry = rateLimitStore.get(key);
      if (entry && now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 5) {
        rateLimitStore.delete(key);
      }
    }
  }, 300_000);
}

/* ────────────────── PUBLIC API ────────────────── */

/**
 * Run ALL input guardrails in order. Returns first failure or success.
 */
export function runInputGuardrails(sessionId: string, userInput: string): GuardrailResult {
  // Layer 1: Basic validation
  const validation = validateInput(userInput);
  if (!validation.allowed) return validation;

  const cleanInput = validation.sanitizedInput || userInput;

  // Layer 2: Jailbreak detection
  const jailbreak = detectJailbreak(cleanInput);
  if (!jailbreak.allowed) return jailbreak;

  // Layer 3: Domain relevance
  const domain = checkDomainRelevance(cleanInput);
  if (!domain.allowed) return domain;

  // Layer 5: Rate limiting
  const rateLimit = checkRateLimit(sessionId);
  if (!rateLimit.allowed) return rateLimit;

  return { allowed: true, sanitizedInput: cleanInput };
}

/**
 * Run output guardrails on LLM response.
 */
export function runOutputGuardrails(llmOutput: string): OutputGuardrailResult {
  return validateOutput(llmOutput);
}

/**
 * Check if a specific input is a jailbreak attempt (for testing/logging).
 */
export function isJailbreakAttempt(input: string): boolean {
  return !detectJailbreak(input).allowed;
}

/**
 * Check if input is domain-relevant (for testing).
 */
export function isDomainRelevant(input: string): boolean {
  return checkDomainRelevance(input).allowed;
}

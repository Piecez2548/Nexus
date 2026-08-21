// supabase/functions/ai-coach/index.ts
//
// Deno Edge Function -- the first server-side code in this repository (see
// docs/PROJECT_ARCHITECTURE.md's "Future Backend Architecture" and
// docs/DEPLOYMENT.md). This is the only thing src/ai/providers/
// ClaudeProvider.ts's chat() ever calls. It never holds or forwards a
// Supabase service-role key -- every database call below happens through a
// client authenticated as the CALLING USER'S OWN forwarded JWT, so
// Postgres RLS (auth.uid() = user_id, same shape as every table in
// supabase/schema.sql) is the only thing deciding what this function's own
// database calls can touch. ANTHROPIC_API_KEY is the one genuine secret
// here and is never sent to or read by the client -- it exists solely as
// this function's own secret (`supabase secrets set ANTHROPIC_API_KEY=...`),
// never as a VITE_ var (see src/ai/config/aiGatewayConfig.ts's own
// comment on why a VITE_ var would ship to the browser).

import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
// Anthropic's current Haiku 4.5 model id -- fast/cheap, appropriate for a
// short 2-4 sentence fallback answer.
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const MAX_ANSWER_TOKENS = 512; // generous headroom for a deliberately short 2-4 sentence answer
const DAILY_REQUEST_CAP = 30; // per user, per UTC day -- adjust freely
const MAX_QUESTION_LENGTH = 2000;
const MAX_CONTEXT_JSON_LENGTH = 20000;

const CORS_HEADERS: Record<string, string> = {
  // No single valid origin to allowlist: this function is called from the
  // web build (arbitrary static host, unknown at deploy time), Capacitor's
  // Android WebView, and Electron -- none share one origin. Access control
  // here is the JWT check below, not CORS -- CORS was never a security
  // boundary for a bearer-token API, only a browser-only convenience.
  // x-client-info is attached to every supabase-js request automatically
  // (client version telemetry) -- omitting it here fails the browser's
  // preflight check and blocks the real request with a CORS error before
  // it ever reaches this function's own code.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AiCoachRequestBody {
  questionText: string;
  context: Record<string, unknown>;
  language: "en" | "th";
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicMessageResponse {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function isValidBody(body: unknown): body is AiCoachRequestBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (typeof b.questionText !== "string" || b.questionText.trim() === "" || b.questionText.length > MAX_QUESTION_LENGTH) return false;
  if (!b.context || typeof b.context !== "object") return false;
  if (JSON.stringify(b.context).length > MAX_CONTEXT_JSON_LENGTH) return false;
  if (b.language !== "en" && b.language !== "th") return false;
  return true;
}

function buildSystemPrompt(language: "en" | "th"): string {
  const languageName = language === "th" ? "Thai" : "English";
  return [
    "You are the AI Coach inside Nexus, a personal finance app.",
    "You are given a compact JSON summary of the user's own finances and a question about it.",
    "Answer ONLY using numbers and facts present in that JSON summary -- never invent, estimate, or assume any specific number that is not present in it.",
    "If the summary doesn't contain enough information to answer, say so plainly instead of guessing.",
    `Respond in ${languageName} only, in 2-4 sentences of plain conversational prose -- no markdown, no bullet lists, no headings.`,
    "This is general educational guidance, not professional financial advice -- never claim otherwise.",
    "If the question is not about the user's own personal finances, politely decline and redirect the user back to asking about their finances.",
  ].join(" ");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed", message: "Use POST." });
  }

  // Fail loudly, not silently: an operator who forgot to run
  // `supabase secrets set ANTHROPIC_API_KEY=...` gets a clear, stable 500
  // on every single call -- never a response that looks like it worked,
  // and never a bare Deno boot crash with no explanation.
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) {
    console.error("ai-coach: ANTHROPIC_API_KEY is not set.");
    return jsonResponse(500, {
      error: "server_misconfigured",
      message: "ANTHROPIC_API_KEY is not configured for this Edge Function.",
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, { error: "unauthenticated", message: "Missing Authorization header." });
  }

  // SUPABASE_URL / SUPABASE_ANON_KEY are injected automatically into every
  // Edge Function by the platform -- unlike ANTHROPIC_API_KEY, these are
  // NOT something to set via `supabase secrets set`.
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Scoped to the calling user's own forwarded JWT -- this client can only
  // ever do what that user's own RLS policies allow, exactly as if the
  // user's own browser had made the request directly. No service-role key
  // is used anywhere in this function.
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse(401, { error: "unauthenticated", message: "Invalid or expired session." });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "invalid_body", message: "Request body must be valid JSON." });
  }

  if (!isValidBody(body)) {
    return jsonResponse(400, {
      error: "invalid_body",
      message: "Expected { questionText: string, context: object, language: en/th }.",
    });
  }

  // Atomic increment-and-return (see supabase/schema.sql's
  // increment_ai_coach_usage()) -- checked BEFORE calling Anthropic, so a
  // capped user never causes a paid Anthropic call.
  const { data: usageCount, error: usageError } = await userClient.rpc("increment_ai_coach_usage");
  if (usageError) {
    console.error("ai-coach: increment_ai_coach_usage failed", usageError);
    return jsonResponse(500, { error: "rate_limit_check_failed", message: "Could not verify the daily request limit." });
  }
  if (typeof usageCount === "number" && usageCount > DAILY_REQUEST_CAP) {
    return jsonResponse(429, {
      error: "rate_limited",
      message: `Daily AI Coach request limit (${DAILY_REQUEST_CAP}) reached. Try again tomorrow.`,
    });
  }

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: MAX_ANSWER_TOKENS,
        system: buildSystemPrompt(body.language),
        messages: [
          {
            role: "user",
            content: `Financial summary (JSON): ${JSON.stringify(body.context)}\n\nQuestion: ${body.questionText}`,
          },
        ],
      }),
    });
  } catch (err) {
    console.error("ai-coach: network error calling Anthropic", err);
    return jsonResponse(502, { error: "upstream_unreachable", message: "Could not reach the Claude API." });
  }

  if (!anthropicRes.ok) {
    const errorBody = await anthropicRes.text().catch(() => "");
    console.error(`ai-coach: Anthropic API returned ${anthropicRes.status}`, errorBody);
    return jsonResponse(502, {
      error: "upstream_error",
      message: `Claude API request failed (status ${anthropicRes.status}).`,
    });
  }

  const anthropicJson = (await anthropicRes.json()) as AnthropicMessageResponse;
  const text = anthropicJson.content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    console.error("ai-coach: Anthropic response had no text content", anthropicJson);
    return jsonResponse(502, { error: "empty_response", message: "Claude returned no answer text." });
  }

  return jsonResponse(200, {
    text,
    tokensUsed: anthropicJson.usage
      ? { input: anthropicJson.usage.input_tokens, output: anthropicJson.usage.output_tokens }
      : undefined,
  });
});

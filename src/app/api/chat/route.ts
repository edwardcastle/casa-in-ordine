import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { getKnowledge } from '@/lib/chat/knowledge';
import {
  buildSystemPrompt,
  CAPTURE_LEAD_TOOL,
  type CaptureLeadInput,
} from '@/lib/chat/prompt';
import { sendLeadEmail } from '@/lib/chat/leads';

export const runtime = 'nodejs';

const MODEL = process.env.CHAT_MODEL ?? 'claude-haiku-4-5';
const MAX_TOKENS = 1024;
const MAX_MESSAGES = 40;
const MAX_CONTENT_LENGTH = 4000;
const MAX_TOOL_ROUNDS = 3;

// --- Lightweight in-memory rate limiting (per IP, sliding window) ---
const RATE_LIMIT = 20; // requests
const RATE_WINDOW_MS = 60_000; // per minute
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

interface ClientMessage {
  role: 'user' | 'assistant';
  content: string;
}

function sanitizeMessages(raw: unknown): ClientMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const messages: ClientMessage[] = [];
  for (const item of raw.slice(-MAX_MESSAGES)) {
    if (!item || typeof item !== 'object') return null;
    const { role, content } = item as Record<string, unknown>;
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string' || !content.trim()) return null;
    messages.push({ role, content: content.slice(0, MAX_CONTENT_LENGTH) });
  }
  // A conversation must start from the user's side.
  if (messages[0]?.role !== 'user') return null;
  return messages;
}

function sseEncode(event: { type: string; value?: string }): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'Chat is not configured.' },
      { status: 500 },
    );
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  if (isRateLimited(ip)) {
    return Response.json({ error: 'Too many requests.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { messages: rawMessages, locale: rawLocale } = (body ?? {}) as Record<
    string,
    unknown
  >;
  const messages = sanitizeMessages(rawMessages);
  if (!messages) {
    return Response.json({ error: 'Invalid messages.' }, { status: 400 });
  }
  const locale = typeof rawLocale === 'string' ? rawLocale : 'it';

  const knowledge = await getKnowledge(locale);
  const system = buildSystemPrompt(locale, knowledge);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const conversation: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: { type: string; value?: string }) =>
        controller.enqueue(sseEncode(event));

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const message = await runOneTurn(client, system, conversation, send);

          if (message.stop_reason !== 'tool_use') break;

          // Execute every requested tool, collect results, then loop so the
          // model can produce its natural-language confirmation.
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of message.content) {
            if (block.type !== 'tool_use') continue;
            if (block.name === 'capture_lead') {
              const result = await sendLeadEmail(
                block.input as CaptureLeadInput,
                locale,
              );
              if (result.success) send({ type: 'lead_captured' });
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: result.success
                  ? 'Lead recorded successfully. The team has been notified.'
                  : `Could not record the lead: ${result.error}. Ask the visitor to use the contact form.`,
                is_error: !result.success,
              });
            }
          }

          conversation.push({ role: 'assistant', content: message.content });
          conversation.push({ role: 'user', content: toolResults });
        }

        send({ type: 'done' });
      } catch (error) {
        console.error('Chat stream error:', error);
        send({ type: 'error', value: 'stream_failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

/**
 * Run a single streamed model turn, forwarding text deltas to the client, and
 * return the completed message (which may contain a tool_use block).
 */
async function runOneTurn(
  client: Anthropic,
  system: string,
  conversation: Anthropic.MessageParam[],
  send: (event: { type: string; value?: string }) => void,
): Promise<Anthropic.Message> {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: 'text',
        text: system,
        // Cache the large knowledge-laden system prompt across requests.
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [CAPTURE_LEAD_TOOL],
    messages: conversation,
  });

  stream.on('text', (delta) => send({ type: 'text', value: delta }));

  return stream.finalMessage();
}

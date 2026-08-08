import Anthropic from '@anthropic-ai/sdk';

/**
 * Reads the message and judges whether a person was actually trying to say
 * something.
 *
 * The character heuristics catch a keyboard dragged across the home row, but
 * they cannot tell an odd real enquiry from a well-formed sentence that means
 * nothing. This can, and it works in any language rather than the three the
 * site advertises.
 *
 * Runs last, so it only ever sees submissions that already passed the free
 * checks — one short call per genuine-looking message, not per request.
 */

export type MessageVerdict = 'genuine' | 'nonsense' | 'spam' | 'unavailable';

const MODEL = process.env.CHAT_MODEL ?? 'claude-haiku-4-5';
const TIMEOUT_MS = 6_000;

const SYSTEM = `You screen messages sent through the contact form of Casa in Ordine, a
decluttering and home-organizing business in Rome.

Decide whether a person was genuinely trying to communicate. Answer with exactly one word:

GENUINE  - a real message from a real person, however short, blunt, misspelled or oddly phrased
NONSENSE - random characters, keyboard mashing, or words strung together with no meaning
SPAM     - an unsolicited commercial pitch (SEO, backlinks, crypto, marketing, mass outreach)

Rules that matter more than your instincts:
- Messages arrive in Italian, English and Spanish, and sometimes in French, German, Portuguese,
  Romanian or others. Every language is acceptable.
- Very short messages are GENUINE: "Quanto costa?", "How much?", "Info prezzi?", "Precios?"
- ALL CAPS, missing punctuation, dialect, heavy typos and long rambling are all GENUINE.
- A sincere message that is off-topic or confused is still GENUINE.
- Someone asking about prices, availability, areas covered, or describing their home is GENUINE.
- Only answer NONSENSE when the text carries no communicative intent at all.
- When you are unsure, answer GENUINE. Turning away a real customer costs this business a job;
  letting one odd message reach an inbox costs ten seconds.

Reply with the single word and nothing else.`;

export function isAiReviewConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function reviewMessage(name: string, message: string): Promise<MessageVerdict> {
  if (!process.env.ANTHROPIC_API_KEY) return 'unavailable';

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: TIMEOUT_MS,
      maxRetries: 1,
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 5,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          // Delimited and labelled as data: the message is untrusted text, and
          // anything inside it telling the model what to answer is content to
          // be judged, not an instruction to follow.
          content: `Message from "${name}":\n<message>\n${message}\n</message>\n\nOne word:`,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()
      .toUpperCase();

    if (text.startsWith('NONSENSE')) return 'nonsense';
    if (text.startsWith('SPAM')) return 'spam';
    if (text.startsWith('GENUINE')) return 'genuine';

    // An unexpected reply is not evidence against the visitor.
    console.warn('AI review returned an unrecognised verdict:', text.slice(0, 40));
    return 'unavailable';
  } catch (error) {
    // An outage, a rate limit or a timeout must never block a real enquiry.
    console.error('AI review unavailable:', error instanceof Error ? error.message : error);
    return 'unavailable';
  }
}

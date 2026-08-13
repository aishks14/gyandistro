import { env } from '../config/env';
import { stripHtml } from '../utils/sanitize';
import { ApiError } from '../utils/ApiError';

/**
 * One thin adapter over three providers. Everything downstream calls
 * `complete()` and never learns which model answered.
 *
 * Set AI_PROVIDER=none to ship without any AI dependency — every AI route
 * then returns a clear "AI is switched off" message instead of failing.
 */

const DEFAULT_MODELS: Record<string, string> = {
  ollama: 'llama3.1:8b',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-6'
};

export function aiEnabled(): boolean {
  return env.ai.provider !== 'none';
}

export function aiStatus() {
  return {
    enabled: aiEnabled(),
    provider: env.ai.provider,
    model: env.ai.model || DEFAULT_MODELS[env.ai.provider] || null
  };
}

async function complete(system: string, user: string, maxTokens = 900): Promise<string> {
  if (!aiEnabled()) {
    throw new ApiError(503, 'AI features are switched off. Set AI_PROVIDER in server/.env.');
  }
  const model = env.ai.model || DEFAULT_MODELS[env.ai.provider];

  if (env.ai.provider === 'ollama') {
    const res = await fetch(`${env.ai.ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });
    if (!res.ok) throw new ApiError(502, `Ollama request failed (${res.status})`);
    const data = (await res.json()) as { message?: { content?: string } };
    return data.message?.content?.trim() ?? '';
  }

  if (env.ai.provider === 'openai') {
    if (!env.ai.openaiKey) throw new ApiError(500, 'OPENAI_API_KEY is not set');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.ai.openaiKey}`
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });
    if (!res.ok) throw new ApiError(502, `OpenAI request failed (${res.status})`);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  if (env.ai.provider === 'anthropic') {
    if (!env.ai.anthropicKey) throw new ApiError(500, 'ANTHROPIC_API_KEY is not set');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ai.anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }]
      })
    });
    if (!res.ok) throw new ApiError(502, `Anthropic request failed (${res.status})`);
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    return data.content?.map((c) => c.text ?? '').join('').trim() ?? '';
  }

  throw new ApiError(500, `Unknown AI provider: ${env.ai.provider}`);
}

/** Pulls the first JSON object or array out of a model reply. */
function parseJson<T>(raw: string, fallback: T): T {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) return fallback;
  try {
    return JSON.parse(cleaned.slice(start)) as T;
  } catch {
    return fallback;
  }
}

const EDITOR = 'You are the desk editor of GyanDistro, a knowledge blog. Write clear, plain, factual prose. Never invent facts that are not in the supplied draft.';

export async function summarise(content: string): Promise<string> {
  return complete(EDITOR, `Summarise this article in 3 short sentences.\n\n${stripHtml(content).slice(0, 12000)}`, 400);
}

export async function suggestExcerpt(content: string): Promise<string> {
  const out = await complete(
    EDITOR,
    `Write a single excerpt of at most 220 characters for this article. Return the excerpt only.\n\n${stripHtml(content).slice(0, 8000)}`,
    200
  );
  return out.replace(/^["']|["']$/g, '').slice(0, 220);
}

export async function suggestTitles(content: string): Promise<string[]> {
  const out = await complete(
    EDITOR,
    `Propose 5 headlines for this article. Reply with a JSON array of strings and nothing else.\n\n${stripHtml(content).slice(0, 8000)}`,
    300
  );
  return parseJson<string[]>(out, []);
}

export async function suggestTags(content: string): Promise<string[]> {
  const out = await complete(
    EDITOR,
    `Propose up to 8 lowercase topic tags for this article. Reply with a JSON array of strings and nothing else.\n\n${stripHtml(content).slice(0, 8000)}`,
    200
  );
  return parseJson<string[]>(out, []).map((t) => String(t).toLowerCase()).slice(0, 8);
}

export async function suggestSeo(title: string, content: string) {
  const out = await complete(
    EDITOR,
    `For the article below, reply with JSON only: {"metaTitle": "<=60 chars", "metaDescription": "<=155 chars", "keywords": ["..."]}\n\nTitle: ${title}\n\n${stripHtml(content).slice(0, 8000)}`,
    400
  );
  return parseJson<{ metaTitle: string; metaDescription: string; keywords: string[] }>(out, {
    metaTitle: title.slice(0, 60),
    metaDescription: '',
    keywords: []
  });
}

export async function improveDraft(content: string): Promise<string> {
  return complete(
    EDITOR,
    `Tighten this draft: fix grammar, cut filler, keep the author's voice and every fact. Return the improved text only.\n\n${stripHtml(content).slice(0, 10000)}`,
    1500
  );
}

export interface ModerationVerdict {
  allow: boolean;
  reason: string;
}

/** Used before a comment goes live; fails open so the site never blocks on AI. */
export async function moderateComment(body: string): Promise<ModerationVerdict> {
  if (!aiEnabled()) return { allow: true, reason: 'ai-disabled' };
  try {
    const out = await complete(
      'You moderate blog comments. Block only spam, harassment, hate, or unlawful content. Ordinary disagreement is allowed.',
      `Reply with JSON only: {"allow": true|false, "reason": "short reason"}\n\nComment: ${body}`,
      150
    );
    return parseJson<ModerationVerdict>(out, { allow: true, reason: 'unparsed' });
  } catch {
    return { allow: true, reason: 'moderation-unavailable' };
  }
}

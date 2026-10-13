// Minimal OpenRouter client that only ever uses free models.
// Free model IDs churn constantly, so we pick them at runtime from /models
// instead of hard-coding one that may be gone next month.

const API = 'https://openrouter.ai/api/v1'

export interface FreeModel {
  id: string
  vision: boolean
  context: number
}

interface ModelsResponse {
  data: Array<{
    id: string
    context_length?: number
    pricing?: { prompt?: string; completion?: string }
    architecture?: { input_modalities?: string[] }
  }>
}

// Preferred families first (good instruction-following + JSON output).
// Anything else free is still used as a fallback.
const PREFERRED = ['google/gemma', 'qwen/', 'meta-llama/', 'mistralai/', 'nvidia/nemotron', 'thinkingmachines/']
// Free models that are not general chat models.
const EXCLUDED = /content-safety|lyria|guard|embed|tts|whisper/i

export async function listFreeModels(): Promise<FreeModel[]> {
  const res = await fetch(`${API}/models`)
  if (!res.ok) throw new Error(`OpenRouter /models failed: ${res.status}`)
  const { data } = (await res.json()) as ModelsResponse
  const rank = (id: string) => {
    const i = PREFERRED.findIndex(p => id.startsWith(p))
    return i === -1 ? PREFERRED.length : i
  }
  return data
    .filter(m => m.pricing?.prompt === '0' && m.pricing?.completion === '0')
    .filter(m => m.id.endsWith(':free') && !EXCLUDED.test(m.id))
    .map(m => ({
      id: m.id,
      vision: (m.architecture?.input_modalities ?? []).includes('image'),
      context: m.context_length ?? 0,
    }))
    .sort((a, b) => rank(a.id) - rank(b.id) || b.context - a.context)
}

export type Content =
  | string
  | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>

export interface ChatOptions {
  models: string[] // tried in order until one answers
  system: string
  user: Content
  maxTokens?: number
}

export interface ChatResult {
  model: string
  text: string
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Chat completion with model fallback and backoff on free-tier rate limits. */
export async function chat({ models, system, user, maxTokens = 800 }: ChatOptions): Promise<ChatResult> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY is not set')
  const errors: string[] = []

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${API}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://404s.vaultnco.store',
          'X-Title': '404s discovery engine',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.2,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      }).catch((err: Error) => err)

      if (res instanceof Error) {
        errors.push(`${model}: ${res.message}`)
        break
      }
      if (res.status === 429 || res.status >= 500) {
        errors.push(`${model}: HTTP ${res.status}`)
        await sleep(4000 * (attempt + 1))
        continue
      }
      if (res.status === 401 || res.status === 402) {
        // Bad key / no credit applies to every model — fail fast.
        throw new Error(`All models failed — HTTP ${res.status} (check OPENROUTER_API_KEY)`)
      }
      if (!res.ok) {
        errors.push(`${model}: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`)
        break // model unavailable for this request — next model
      }

      const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
      const text = body.choices?.[0]?.message?.content?.trim()
      if (text) return { model, text }
      errors.push(`${model}: empty response`)
      break
    }
  }
  throw new Error(`All models failed — ${errors.slice(-4).join(' | ')}`)
}

/** Pull the first JSON object out of a model reply (handles ```json fences and chatter). */
export function extractJSON(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('no JSON object in reply')
  return JSON.parse(body.slice(start, end + 1))
}

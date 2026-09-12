export type DegenerationKind = 'caps_salad' | 'syllable_split' | 'meta_loop'

export type DegenerationHit = {
  kind: DegenerationKind
  reason: string
}

const META_LOOP =
  /\b(?:OK|OKAY)\s+SERIOUS\s+STOP\b|\bSTOP\s+NOW\s+ACTUALLY\s+REALLY\b|\bFINAL\s+ANSWER\s+COMPOSING\b/i

function tokensOf(window: string): string[] {
  return window.split(/\s+/).filter(Boolean)
}

function longestCapsRun(tokens: string[]): number {
  let best = 0
  let cur = 0
  for (const token of tokens) {
    if (/^[A-Z]{2,}$/.test(token)) {
      cur++
      if (cur > best) best = cur
    } else {
      cur = 0
    }
  }
  return best
}

/**
 * Detect CoT / completion collapse: synonym dumps, ALL-CAPS lists, and
 * words split into 1–4 letter fragments ("INFIN IT UDE").
 */
export function detectOutputDegeneration(text: string): DegenerationHit | null {
  if (process.env.OPENCLAUDE_DEGENERATION_GUARD === '0') return null
  const window = text.length > 2500 ? text.slice(-2000) : text
  if (window.length < 80) return null

  if (META_LOOP.test(window)) {
    return {
      kind: 'meta_loop',
      reason: 'output entered a STOP/FINAL-ANSWER loop while still dumping tokens',
    }
  }

  if (window.length < 160) return null

  const tokens = tokensOf(window)
  if (tokens.length < 28) return null

  const capsRun = longestCapsRun(tokens)
  if (capsRun >= 24) {
    return {
      kind: 'caps_salad',
      reason: `output collapsed into an ALL-CAPS synonym dump (${capsRun} consecutive caps tokens)`,
    }
  }

  const alpha = tokens.filter(token => /^[A-Za-z]+$/.test(token))
  if (alpha.length >= 36) {
    const avgLen = alpha.reduce((sum, token) => sum + token.length, 0) / alpha.length
    const splinters = alpha.filter(token => token.length <= 4).length
    if (avgLen <= 4.4 && splinters / alpha.length >= 0.5) {
      return {
        kind: 'syllable_split',
        reason: 'output started splitting words into 1–4 letter fragments',
      }
    }
  }

  return null
}

export class OutputDegenerationError extends Error {
  readonly kind: DegenerationKind
  constructor(hit: DegenerationHit) {
    super(`Output degeneration (${hit.kind}): ${hit.reason}`)
    this.name = 'OutputDegenerationError'
    this.kind = hit.kind
  }
}

export function isOutputDegenerationError(
  error: unknown,
): error is OutputDegenerationError {
  return error instanceof OutputDegenerationError
}

export function createDegenerationWatch(): {
  push(chunk: string): void
} {
  let buf = ''
  let sinceCheck = 0
  return {
    push(chunk: string) {
      if (!chunk) return
      buf += chunk
      if (buf.length > 4000) buf = buf.slice(-2200)
      sinceCheck += chunk.length
      if (sinceCheck < 120) return
      sinceCheck = 0
      const hit = detectOutputDegeneration(buf)
      if (hit) throw new OutputDegenerationError(hit)
    },
  }
}

export const DEGENERATION_RETRY_PROMPT =
  'Your previous reply degenerated into word salad, synonym lists, or split tokens. ' +
  'Discard that pattern. Continue the actual task from the last coherent step. ' +
  'Call a tool now. Do not list synonyms. Do not split words.'

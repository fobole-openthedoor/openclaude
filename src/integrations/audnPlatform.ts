/**
 * platform.audn.ai roster — used when those model ids show up on any
 * OpenAI-compatible gateway (direct or a unified proxy).
 *
 * Reasoning models return `reasoning_content`. Pingu / Bartzabel do not.
 * 1M-context models are still bound by a 4.5 MB request body (~756k tokens
 * of code), so the compact-facing window is the smaller figure.
 */
export const AUDN_REASONING_MODEL_IDS = new Set([
  'necromicon',
  'necromicon-qwen38-fast',
  'k3-thinker-qwen38',
  'warlock',
  'kong',
  'godzilla',
])

const AUDN_1M_REQUEST_BODY_TOKENS = 756_000

const AUDN_MODEL_LIMITS: Record<
  string,
  { contextWindow: number; maxOutputTokens: number }
> = {
  necromicon: {
    contextWindow: AUDN_1M_REQUEST_BODY_TOKENS,
    maxOutputTokens: 8_192,
  },
  'necromicon-qwen38-fast': {
    contextWindow: AUDN_1M_REQUEST_BODY_TOKENS,
    maxOutputTokens: 8_192,
  },
  'k3-thinker-qwen38': {
    contextWindow: AUDN_1M_REQUEST_BODY_TOKENS,
    maxOutputTokens: 8_192,
  },
  warlock: {
    contextWindow: AUDN_1M_REQUEST_BODY_TOKENS,
    maxOutputTokens: 16_384,
  },
  'pingu-unchained-10': {
    contextWindow: 262_144,
    maxOutputTokens: 16_384,
  },
  kong: { contextWindow: 262_144, maxOutputTokens: 8_192 },
  godzilla: { contextWindow: 131_072, maxOutputTokens: 8_192 },
  bartzabel: { contextWindow: 262_144, maxOutputTokens: 8_192 },
}

export const AUDN_REASONING_OPENAI_SHIM = {
  preserveReasoningContent: true,
  requireReasoningContentOnAssistantMessages: true,
  reasoningContentFallback: '',
  maxTokensField: 'max_tokens' as const,
  removeBodyFields: ['store'],
}

export function audnModelIdFromApiName(
  modelApiName: string | undefined,
): string | null {
  if (!modelApiName) return null
  const normalized = modelApiName.trim().toLowerCase()
  if (!normalized) return null
  const segments = normalized.split('/')
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i]
    if (segment && AUDN_MODEL_LIMITS[segment]) return segment
  }
  return AUDN_MODEL_LIMITS[normalized] ? normalized : null
}

export function isAudnReasoningModel(modelApiName: string | undefined): boolean {
  const id = audnModelIdFromApiName(modelApiName)
  return id !== null && AUDN_REASONING_MODEL_IDS.has(id)
}

export function getAudnPlatformLimits(modelApiName: string | undefined): {
  contextWindow: number
  maxOutputTokens: number
} | undefined {
  const id = audnModelIdFromApiName(modelApiName)
  return id ? AUDN_MODEL_LIMITS[id] : undefined
}

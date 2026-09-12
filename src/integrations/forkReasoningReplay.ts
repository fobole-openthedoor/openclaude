import type { OpenAIShimTransportConfig } from './descriptors.js'

function hostnameOf(baseUrl: string | undefined): string | null {
  if (!baseUrl?.trim()) return null
  try {
    return new URL(baseUrl).hostname.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Fork default: any OpenAI-compatible proxy that is not api.openai.com must
 * echo historical thinking as `reasoning_content`. Otherwise convertMessages
 * drops thinking-only rows and the next turn thinks from scratch.
 */
export function applyForkReasoningReplayDefault(
  config: OpenAIShimTransportConfig,
  options?: { baseUrl?: string; processEnv?: NodeJS.ProcessEnv },
): OpenAIShimTransportConfig {
  if (config.preserveReasoningContent === true) return config
  const env = options?.processEnv ?? process.env
  const flag = env.CLAUDE_CODE_USE_OPENAI?.trim().toLowerCase()
  if (flag !== '1' && flag !== 'true') return config
  const host = hostnameOf(options?.baseUrl ?? env.OPENAI_BASE_URL ?? env.OPENAI_API_BASE)
  if (!host) return config
  if (host === 'api.openai.com' || host.endsWith('.openai.com')) return config
  return {
    ...config,
    preserveReasoningContent: true,
    reasoningContentFallback: config.reasoningContentFallback ?? '',
  }
}

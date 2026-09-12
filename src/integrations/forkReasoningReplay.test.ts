import { describe, expect, test } from 'bun:test'
import { applyForkReasoningReplayDefault } from './forkReasoningReplay.js'
import { resolveOpenAIShimRuntimeContext } from './runtimeMetadata.js'

describe('applyForkReasoningReplayDefault', () => {
  test('does not force replay on api.openai.com', () => {
    const result = applyForkReasoningReplayDefault(
      {},
      {
        baseUrl: 'https://api.openai.com/v1',
        processEnv: { CLAUDE_CODE_USE_OPENAI: '1' },
      },
    )
    expect(result.preserveReasoningContent).toBeUndefined()
  })

  test('forces replay on the beefsms proxy including qwen', () => {
    for (const model of ['happy/kimi-k3', 'happy/glm-5.3', 'happy/qwen-3.8-fast']) {
      const result = resolveOpenAIShimRuntimeContext({
        model,
        baseUrl: 'http://openai.beefsms.com:38888/v1',
        processEnv: {
          CLAUDE_CODE_USE_OPENAI: '1',
          OPENAI_BASE_URL: 'http://openai.beefsms.com:38888/v1',
          OPENAI_MODEL: model,
        },
      })
      expect(result.openaiShimConfig.preserveReasoningContent).toBe(true)
    }
  })
})

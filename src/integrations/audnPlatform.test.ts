import { describe, expect, test } from 'bun:test'
import {
  getAudnPlatformLimits,
  isAudnReasoningModel,
} from './audnPlatform.js'
import { resolveModelRuntimeLimits, resolveOpenAIShimRuntimeContext } from './runtimeMetadata.js'

describe('audn platform roster', () => {
  test('reasoning ids preserve reasoning_content on a generic OpenAI gateway', () => {
    for (const model of [
      'necromicon',
      'audn/necromicon',
      'warlock',
      'k3-thinker-qwen38',
      'necromicon-qwen38-fast',
      'kong',
      'godzilla',
    ]) {
      expect(isAudnReasoningModel(model)).toBe(true)
      const result = resolveOpenAIShimRuntimeContext({
        model,
        baseUrl: 'https://example-gateway.test/v1',
        processEnv: { CLAUDE_CODE_USE_OPENAI: '1' },
      })
      expect(result.openaiShimConfig.preserveReasoningContent).toBe(true)
      expect(result.openaiShimConfig.requireReasoningContentOnAssistantMessages).toBe(true)
      expect(result.openaiShimConfig.reasoningContentFallback).toBe('')
    }
  })

  test('pingu and bartzabel are not treated as reasoning models', () => {
    expect(isAudnReasoningModel('pingu-unchained-10')).toBe(false)
    expect(isAudnReasoningModel('bartzabel')).toBe(false)
    const result = resolveOpenAIShimRuntimeContext({
      model: 'pingu-unchained-10',
      baseUrl: 'https://example-gateway.test/v1',
      processEnv: { CLAUDE_CODE_USE_OPENAI: '1' },
    })
    expect(result.openaiShimConfig.preserveReasoningContent).toBeUndefined()
  })

  test('does not false-positive on similarly named aliases', () => {
    expect(isAudnReasoningModel('my-necromicon-fork')).toBe(false)
    expect(isAudnReasoningModel('warlock-lite')).toBe(false)
  })

  test('1M models use the 4.5MB request-body token budget for compact', () => {
    expect(getAudnPlatformLimits('necromicon')?.contextWindow).toBe(756_000)
    expect(getAudnPlatformLimits('warlock')?.maxOutputTokens).toBe(16_384)
    expect(
      resolveModelRuntimeLimits({
        model: 'necromicon',
        processEnv: { CLAUDE_CODE_USE_OPENAI: '1' },
        baseUrl: 'https://example-gateway.test/v1',
      }).contextWindow,
    ).toBe(756_000)
    expect(
      resolveModelRuntimeLimits({
        model: 'warlock',
        processEnv: { CLAUDE_CODE_USE_OPENAI: '1' },
        baseUrl: 'https://example-gateway.test/v1',
      }).maxOutputTokens,
    ).toBe(16_384)
  })
})

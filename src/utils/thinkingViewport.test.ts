import { describe, expect, test } from 'bun:test'
import { clipThinkingViewport } from './thinkingViewport.js'

describe('clipThinkingViewport', () => {
  test('keeps short text unchanged', () => {
    expect(clipThinkingViewport('a\nb', 3)).toBe('a\nb')
  })

  test('keeps the last N non-empty lines', () => {
    expect(clipThinkingViewport('one\n\ntwo\nthree\nfour', 3)).toBe(
      '…\ntwo\nthree\nfour',
    )
  })
})

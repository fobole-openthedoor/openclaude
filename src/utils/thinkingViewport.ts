export function thinkingViewportLines(): number {
  const raw = process.env.OPENCLAUDE_THINKING_VIEWPORT_LINES?.trim()
  const n = raw ? Number.parseInt(raw, 10) : 3
  if (!Number.isFinite(n) || n < 1) return 3
  return Math.min(20, Math.round(n))
}

/** Last N non-empty lines so live thinking scrolls instead of dumping the whole CoT. */
export function clipThinkingViewport(
  text: string,
  maxLines = thinkingViewportLines(),
): string {
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  if (lines.length <= maxLines) return text
  return `…\n${lines.slice(-maxLines).join('\n')}`
}

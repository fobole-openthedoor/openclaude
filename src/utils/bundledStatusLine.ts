import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

function candidates(): string[] {
  const here = dirname(fileURLToPath(import.meta.url))
  return [
    join(here, 'statusline.py'),
    join(here, '../scripts/hacker/statusline.py'),
    join(here, '../../scripts/hacker/statusline.py'),
  ]
}

export function getBundledStatusLineScript(): string | null {
  if (process.env.NODE_ENV === 'test' && !process.env.OPENCLAUDE_BUNDLED_STATUSLINE) {
    return null
  }
  return candidates().find(path => existsSync(path)) ?? null
}

export function getBundledStatusLineCommand(): string | null {
  const script = getBundledStatusLineScript()
  return script ? `python3 ${JSON.stringify(script)}` : null
}

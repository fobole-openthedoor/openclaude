import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { expect, test } from 'bun:test'

const ROUTE = join(
  import.meta.dir,
  '../../../scripts/hacker/skills/claude-red/route.py',
)

function writeSkill(root: string, rel: string, name: string, body: string): void {
  const dir = join(root, rel)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${body}\n---\n# ${name}\n`,
    'utf8',
  )
}

test('route.py maps sqli hint to offensive-sqli', () => {
  const root = mkdtempSync(join(tmpdir(), 'claude-red-'))
  try {
    writeSkill(
      root,
      'Skills/web/offensive-sqli',
      'offensive-sqli',
      'SQL injection testing',
    )
    writeSkill(
      root,
      'Skills/web/offensive-xss',
      'offensive-xss',
      'Cross-site scripting',
    )
    writeSkill(
      root,
      'Skills/auth/offensive-jwt',
      'offensive-jwt',
      'JWT attacks',
    )
    const out = execFileSync('python3', [ROUTE, '--root', root, '--hint', 'sqli'], {
      encoding: 'utf8',
    })
    expect(out).toContain('PRIMARY Skills/web/offensive-sqli/SKILL.md')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

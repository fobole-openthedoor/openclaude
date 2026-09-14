import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'bun:test'

const ROUTE = join(
  import.meta.dir,
  '../../../scripts/hacker/skills/domain-route.py',
)

const RED =
  process.env.CLAUDE_RED_ROOT?.trim() || join(homedir(), 'tools', 'claude-red')

function run(hint: string): string {
  return execFileSync(
    'python3',
    [ROUTE, '--hint', hint, '--claude-red-root', RED],
    { encoding: 'utf8' },
  )
}

function classify(hint: string): string {
  const line = run(hint).split('\n').find(l => l.startsWith('DOMAIN '))
  return line?.slice('DOMAIN '.length).trim() ?? ''
}

function nextSkill(hint: string): string {
  const line = run(hint).split('\n').find(l => l.startsWith('NEXT '))
  return line?.slice('NEXT '.length).trim() ?? ''
}

test('domain-route splits 逆向 / 破解 / 渗透', () => {
  expect(classify('ghidra 反编译这个 apk')).toBe('reverse')
  expect(nextSkill('ghidra 反编译这个 apk')).toBe('reverse-skill')

  expect(classify('脱壳去校验，补丁掉授权')).toBe('crack')
  expect(nextSkill('脱壳去校验，补丁掉授权')).toBe('crack')

  expect(classify('登录有没有 SQL 注入')).toBe('pentest')
  expect(classify('破解这个网站后台')).toBe('pentest')
  expect(classify('绕过 WAF 打 sqli')).toBe('pentest')
  if (existsSync(join(RED, 'Skills', 'web', 'offensive-sqli', 'SKILL.md'))) {
    expect(nextSkill('登录有没有 SQL 注入')).toBe('offensive-sqli')
  }
})

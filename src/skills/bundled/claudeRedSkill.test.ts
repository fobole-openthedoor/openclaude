import { afterEach, expect, test } from 'bun:test'

import type { CommandBase, PromptCommand } from '../../types/command.js'
import { clearBundledSkills, getBundledSkills } from '../bundledSkills.js'
import { registerClaudeRedSkill } from './claudeRedSkill.js'

afterEach(() => {
  clearBundledSkills()
  delete process.env.CLAUDE_RED_ROOT
  delete process.env.OPENCLAUDE_FORK_ROOT
})

function findClaudeRedSkill(): CommandBase & PromptCommand {
  const skill = getBundledSkills().find(command => command.name === 'claude-red')
  if (!skill || skill.type !== 'prompt') {
    throw new Error('expected /claude-red to be registered as a prompt command')
  }
  return skill
}

test('claude-red is a user catalog; surface skills auto-invoke instead', async () => {
  process.env.CLAUDE_RED_ROOT = '/tmp/claude-red-pack'
  process.env.OPENCLAUDE_FORK_ROOT = '/tmp/openclaude-fork'
  registerClaudeRedSkill()

  const skill = findClaudeRedSkill()
  expect(skill.disableModelInvocation).toBe(true)
  expect(skill.userInvocable).toBe(true)
  expect(skill.description).toContain('offensive-sqli')

  const blocks = await skill.getPromptForCommand('sqli login bypass', {} as never)
  const text = (blocks[0] as { text: string }).text
  expect(text).toContain('# claude-red (catalog)')
  expect(text).toContain('/tmp/claude-red-pack')
  expect(text).toContain('INDEX.openclaude.md')
  expect(text).toContain(
    '/tmp/openclaude-fork/scripts/hacker/skills/claude-red/route.py',
  )
  expect(text).toContain('sqli login bypass')
  expect(text).toContain('/reverse-skill')
})

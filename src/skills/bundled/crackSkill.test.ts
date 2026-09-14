import { afterEach, expect, test } from 'bun:test'

import type { CommandBase, PromptCommand } from '../../types/command.js'
import { clearBundledSkills, getBundledSkills } from '../bundledSkills.js'
import { registerCrackSkill } from './crackSkill.js'

afterEach(() => {
  clearBundledSkills()
  delete process.env.REVERSE_SKILL_ROOT
})

function findCrackSkill(): CommandBase & PromptCommand {
  const skill = getBundledSkills().find(command => command.name === 'crack')
  if (!skill || skill.type !== 'prompt') {
    throw new Error('expected /crack to be registered as a prompt command')
  }
  return skill
}

test('crack skill routes unpack/license work into reverse-skill pack', async () => {
  process.env.REVERSE_SKILL_ROOT = '/tmp/reverse-skill-pack'
  registerCrackSkill()

  const skill = findCrackSkill()
  expect(skill.disableModelInvocation).toBe(false)
  expect(skill.description).toContain('破解')
  expect(skill.description).toContain('reverse-skill')
  expect(skill.aliases).toContain('破解')

  const blocks = await skill.getPromptForCommand('脱壳去校验', {} as never)
  const text = (blocks[0] as { text: string }).text
  expect(text).toContain('# crack (破解)')
  expect(text).toContain('/tmp/reverse-skill-pack')
  expect(text).toContain('脱壳去校验')
  expect(text).toContain('reverse-engineering/SKILL.md')
  expect(text).toContain('offensive-*')
})

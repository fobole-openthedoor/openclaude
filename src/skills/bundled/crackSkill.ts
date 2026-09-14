import { homedir } from 'node:os'
import { registerBundledSkill } from '../bundledSkills.js'

function reverseSkillRoot(): string {
  return (
    process.env.REVERSE_SKILL_ROOT?.trim() ||
    `${homedir()}/tools/reverse-skill`
  )
}

export function registerCrackSkill(): void {
  registerBundledSkill({
    name: 'crack',
    description:
      '破解 domain: unpack/脱壳, deobfuscate, patch license/activation checks, packer/OLLVM, crackme/keygen, local binary patches. Use when the user asks to 破解, 脱壳, 去校验, 补丁, 激活, 加壳, unpack, or patch a program. Not live-site pentest (use offensive-* skills). Not “just explain this binary” (use reverse-skill).',
    aliases: ['破解'],
    userInvocable: true,
    disableModelInvocation: false,
    argumentHint: '[target or task]',
    async getPromptForCommand(args) {
      const root = reverseSkillRoot()
      const hint = args.trim() || '<user task>'
      const prompt = `# crack (破解)

This is the **破解** domain. Goal: locate protection → unpack/deobfuscate → document the check → propose a **local** patch. Not a live pentest.

**Reverse pack:** \`${root}\`

Authorized local-sample / lab work only. No live-target ACT without written scope.

## ACTION REQUIRED

1. \`NOW\`: Read \`${root}/RULES.md\`.
2. \`NOW\`: \`bash ${root}/skills/scripts/master-route.sh --hint "${hint} 破解 脱壳 去校验"\` → PRIMARY.
3. If PRIMARY is \`pentest-tools/\` or \`attack-chain/\`, use \`${root}/skills/reverse-engineering/SKILL.md\` instead.
4. \`NOW\`: \`bash ${root}/skills/scripts/case-init.sh --hint "${hint}"\` → \`work/<case>/scope.md\`. Local sample → \`offline-sample\` preset.
5. \`ACT\`: Open \`${root}/skills/<PRIMARY>/SKILL.md\` and follow ACTION REQUIRED.
6. Tools only from \`${root}/skills/tool-index.md\`.

Ghidra: \`$HOME/tools/ghidra\` (\`analyzeHeadless\`). Prefer the \`ghidra\` MCP server when connected.

Live web/AD/cloud exploitation → matching \`offensive-*\` skill. Understanding-only reverse → \`/reverse-skill\`.
`
      return [{ type: 'text', text: prompt }]
    },
  })
}

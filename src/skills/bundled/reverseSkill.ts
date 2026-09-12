import { homedir } from 'node:os'
import { registerBundledSkill } from '../bundledSkills.js'

function reverseSkillRoot(): string {
  return (
    process.env.REVERSE_SKILL_ROOT?.trim() ||
    `${homedir()}/tools/reverse-skill`
  )
}

export function registerReverseSkill(): void {
  registerBundledSkill({
    name: 'reverse-skill',
    description:
      'Route reverse engineering, APK/SO/ELF/PE, JS crypto, Ghidra/IDA/radare2, Frida, firmware, and authorized security analysis to the reverse-skill pack. Use when the user asks to reverse, decompile, unpack, hook, or analyze a binary/APK/JS sample.',
    userInvocable: true,
    disableModelInvocation: false,
    async getPromptForCommand(args) {
      const root = reverseSkillRoot()
      const hint = args.trim() || '<user task>'
      const prompt = `# reverse-skill

Do not dump the whole pack into context. Route, then open one PRIMARY skill.

**Repo root:** \`${root}\`

## ACTION REQUIRED

1. \`NOW\`: Read \`${root}/RULES.md\` (behavior + auth).
2. \`NOW\`: \`bash ${root}/skills/scripts/master-route.sh --hint "${hint}"\` → PRIMARY.
3. \`NOW\`: \`bash ${root}/skills/scripts/case-init.sh --hint "${hint}"\` → \`work/<case>/scope.md\`. **auth not granted → do not ACT on a live target.** Local sample → \`offline-sample\` preset.
4. \`ACT\`: Open \`${root}/skills/<PRIMARY>/SKILL.md\` and follow ACTION REQUIRED.
5. Tool paths **only** from \`${root}/skills/tool-index.md\`. Missing tool → \`bash ${root}/skills/scripts/bootstrap-reverse.sh <capability>\`.

Ghidra is at \`$HOME/tools/ghidra\` (override with \`GHIDRA_INSTALL_DIR\`). Headless: \`analyzeHeadless\`. Prefer the \`ghidra\` MCP server when it is connected.

Evidence chain: \`${root}/skills/ops/evidence-finding-path.md\`.
`
      return [{ type: 'text', text: prompt }]
    },
  })
}

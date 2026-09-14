import { homedir } from 'node:os'
import { registerBundledSkill } from '../bundledSkills.js'

function claudeRedRoot(): string {
  return (
    process.env.CLAUDE_RED_ROOT?.trim() || `${homedir()}/tools/claude-red`
  )
}

function forkRoot(): string {
  return (
    process.env.OPENCLAUDE_FORK_ROOT?.trim() || `${homedir()}/openclaude`
  )
}

function routeScript(): string {
  return `${forkRoot()}/scripts/hacker/skills/claude-red/route.py`
}

export function registerClaudeRedSkill(): void {
  registerBundledSkill({
    name: 'claude-red',
    description:
      'Catalog of installed Claude-Red offensive-security skills. Prefer the matching skill (offensive-sqli, offensive-jwt, …) via the Skill tool. Use this catalog only when the user asks which Claude-Red skills exist or no specific surface skill matches.',
    userInvocable: true,
    disableModelInvocation: true,
    argumentHint: '[surface or task]',
    async getPromptForCommand(args) {
      const root = claudeRedRoot()
      const route = routeScript()
      const hint = args.trim() || '<user task>'
      const prompt = `# claude-red (catalog)

The pack is already installed as normal OpenClaude skills. Prefer those.

**Repo root:** \`${root}\` (\`CLAUDE_RED_ROOT\`)
**Index:** \`${root}/INDEX.openclaude.md\`

Authorized assessments only. No live-target ACT without written scope.

## ACTION REQUIRED

1. If the user named a surface (SQLi, JWT, K8s, …), invoke that skill with the Skill tool instead of continuing here.
2. Otherwise: \`python3 ${route} --root "${root}" --hint "${hint}"\` → PRIMARY, then Read that \`SKILL.md\`.
3. If the pack is missing, tell the user to run \`${forkRoot()}/scripts/hacker/install-claude-red.sh\` and stop.
4. Binary / APK / SO / ELF / Ghidra / Frida / firmware unpack → \`/reverse-skill\`.
`
      return [{ type: 'text', text: prompt }]
    },
  })
}

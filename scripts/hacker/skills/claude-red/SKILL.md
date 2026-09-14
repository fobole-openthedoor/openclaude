---
name: claude-red
description: Catalog of installed Claude-Red offensive-security skills. Prefer the matching skill (offensive-sqli, offensive-jwt, …) via the Skill tool. Use this catalog only when the user asks which Claude-Red skills exist or no specific surface skill matches.
disable-model-invocation: true
---

# claude-red (catalog)

The pack is already installed as normal OpenClaude skills. Prefer those.

**Repo root:** `$CLAUDE_RED_ROOT` (default `$HOME/tools/claude-red`)
**Index:** `$CLAUDE_RED_ROOT/INDEX.openclaude.md`

Authorized assessments only. No live-target ACT without written scope.

## ACTION REQUIRED

1. If the user named a surface (SQLi, JWT, K8s, …), invoke that skill with the Skill tool instead of continuing here.
2. Otherwise: `python3 $OPENCLAUDE_FORK_ROOT/scripts/hacker/skills/claude-red/route.py --root "$CLAUDE_RED_ROOT" --hint "<user task>"` → PRIMARY, then Read that `SKILL.md`.
3. Binary / APK / SO / ELF / Ghidra / Frida / firmware unpack → `/reverse-skill`.

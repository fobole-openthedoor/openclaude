---
name: reverse-skill
description: Route reverse engineering, APK/SO/ELF/PE, JS crypto, Ghidra/IDA/radare2, Frida, firmware, and authorized security analysis to the reverse-skill pack. Use when the user asks to reverse, decompile, unpack, hook, or analyze a binary/APK/JS sample.
---

# reverse-skill (OpenClaude adapter)

Do not dump the whole pack into context. Route, then open one PRIMARY skill.

**Repo root:** `$REVERSE_SKILL_ROOT` (default `$HOME/tools/reverse-skill`)

## ACTION REQUIRED

1. `NOW`: Read `$REVERSE_SKILL_ROOT/RULES.md` (behavior + auth).
2. `NOW`: `bash $REVERSE_SKILL_ROOT/skills/scripts/master-route.sh --hint "<user task>"` → PRIMARY.
3. `NOW`: `bash $REVERSE_SKILL_ROOT/skills/scripts/case-init.sh --hint "<user task>"` → `work/<case>/scope.md`. **auth not granted → do not ACT on a live target.** Local sample → `offline-sample` preset.
4. `ACT`: Open `$REVERSE_SKILL_ROOT/skills/<PRIMARY>/SKILL.md` and follow ACTION REQUIRED.
5. Tool paths **only** from `$REVERSE_SKILL_ROOT/skills/tool-index.md`. Missing tool → `bash $REVERSE_SKILL_ROOT/skills/scripts/bootstrap-reverse.sh <capability>`.

Ghidra is at `$GHIDRA_INSTALL_DIR` (default `$HOME/tools/ghidra`). Headless: `analyzeHeadless`. Prefer the `ghidra` MCP server when it is connected.

Evidence chain: `$REVERSE_SKILL_ROOT/skills/ops/evidence-finding-path.md`.

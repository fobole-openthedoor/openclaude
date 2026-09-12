# OpenClaude replica (this fork)

This directory is the install kit for **this** OpenClaude fork: Gitlawb v0.30.0 plus historical reasoning replay, live thinking, beefsms OpenAI-compat provider, and the local launchers.

It is **not** in the safeline `hacker/hacker` repo. Clone **`hacker/openclaude`**.

Provider is the same for everyone: `http://openai.beefsms.com:38888/v1` (`happy/kimi-k3`, `happy/glm-5.3`, `happy/qwen-3.8-fast`). Keys stay on the machine that runs the CLI.

## One command

Needs `git`, `python3`, and Node.js >= 22. Bun is installed automatically if missing.

```sh
curl -fsSL https://raw.githubusercontent.com/fobole-openthedoor/openclaude/preserve-reasoning-history/scripts/hacker/bootstrap.sh | sh
```

Same thing, but you type it:

```sh
git clone -b preserve-reasoning-history \
  https://github.com/fobole-openthedoor/openclaude.git ~/openclaude
~/openclaude/scripts/hacker/install.sh
```

On a host that already has `git@forgejo:hacker/openclaude.git`:

```sh
OPENCLAUDE_GIT_URL=git@forgejo:hacker/openclaude.git \
  sh ~/openclaude/scripts/hacker/install.sh
```

**Branch must be `preserve-reasoning-history`.** GitHub `main` is upstream and does not include this kit.

## Fill keys

`install.sh` writes `~/.config/openclaude/env` from `env.example` and does **not** put secrets in git.

```sh
$EDITOR ~/.config/openclaude/env
```

Set:

- `OPENAI_API_KEY` — beefsms key (required)
- `BRAVE_API_KEY` — optional, for WebSearch

Then:

```sh
openclaude
```

If `/usr/local/bin` is not writable, the launcher lands in `~/.local/bin`. Put that on `PATH`.

## What gets installed

| Path | Role |
| --- | --- |
| `~/openclaude` | this fork, built with bun |
| `/usr/local/bin/openclaude` (and `audncode`) | `launch.sh` — sources the env file so other `OPENAI_BASE_URL` values in `~/.bashrc` do not leak in |
| `~/.config/openclaude/env` | provider, models, timeouts, keys |
| `~/.audncode-platform/settings.json` | model list, 1M context, bypass permissions, statusline, GLM Stop hook |
| `~/.audncode-platform/.openclaude.json` | beefsms profile **without** an API key (env supplies it) |
| `~/.audncode-platform/hooks/glm-auto-continue.py` | GLM 5.3 auto-continue Stop hook |

Update later:

```sh
openclaude update
# or
~/openclaude/scripts/hacker/update.sh
```

## Optional: Ghidra MCP + reverse-skill

Not cloned by `install.sh`. If you already have them:

- pack at `$HOME/tools/reverse-skill`
- Ghidra at `$HOME/tools/ghidra`
- `re-mcp-ghidra` on `PATH`

re-run `install.sh` and it will wire MCP + `CLAUDE.md` + the reverse-skill adapter. Or copy:

- `mcp.example.json` → merge into `~/.audncode-platform/.openclaude.json` `mcpServers`
- `CLAUDE.md.example` → `~/.audncode-platform/CLAUDE.md`
- `skills/reverse-skill/SKILL.md` → `~/.audncode-platform/skills/reverse-skill/SKILL.md`

## Files in this directory

- `bootstrap.sh` — curl-pipe entry (clone + install)
- `install.sh` — bun install, build, launchers, seed config
- `launch.sh` — the `openclaude` / `audncode` binary
- `update.sh` — git ff-only + rebuild (`/update` uses this)
- `env.example` — beefsms provider; keys are placeholders
- `settings.example.json` / `openclaude.json.example` — no secrets
- `hooks/glm-auto-continue.py`
- `statusline.py` — copied into `dist/` at build

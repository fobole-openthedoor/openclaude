# OpenClaude replica (this fork)

**人先看仓库根目录 [INSTALL.md](../../INSTALL.md)。给 AI 的提示词在根目录 [PROMPT.md](../../PROMPT.md)。**

This directory is the install kit behind those two files: Gitlawb v0.30.0 plus historical reasoning replay, live thinking, beefsms OpenAI-compat provider, and the local launchers.

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

## Reverse-engineering stack

Ghidra is ~570MB, so it is **not** in the default OpenClaude bootstrap. Two ways:

### Script (this machine's versions, pinned)

```sh
~/openclaude/scripts/hacker/install-reverse.sh
~/openclaude/scripts/hacker/verify-reverse.sh
```

Skip the zip with `--skip-ghidra` if you already have `$HOME/tools/ghidra`. Pins live in `reverse-versions.env`.

Or one shot after clone:

```sh
OPENCLAUDE_WITH_REVERSE=1 \
  curl -fsSL https://raw.githubusercontent.com/fobole-openthedoor/openclaude/preserve-reasoning-history/scripts/hacker/bootstrap.sh | sh
```

### Give an AI the prompt

Copy the fenced block in [`PROMPT.md`](PROMPT.md) and paste it to any coding agent. It will clone this branch, run both installers, and stop for the user to fill `OPENAI_API_KEY`.

What that installs (matching the reference host):

| Piece | Version / path |
| --- | --- |
| reverse-skill | `https://github.com/zhaoxuya520/reverse-skill` → `$HOME/tools/reverse-skill` |
| Ghidra | 12.1.3 PUBLIC → `$HOME/tools/ghidra` |
| jadx | 1.5.6 |
| Ghidra MCP | `re-mcp-ghidra==3.0.3` **stdio** (not LaurieWired HTTP) |
| pipx | frida-tools 14.10.4, objection 1.12.5, pwntools 4.15.0 |
| apt | openjdk-21, radare2, apktool, binwalk, gdb, ffuf, nmap, … |

IDA Pro / Burp are **not** auto-installed.

## Files in this directory

- `bootstrap.sh` — curl-pipe entry (clone + install)
- `install.sh` — bun install, build, launchers, seed config
- `launch.sh` — the `openclaude` / `audncode` binary
- `update.sh` — git ff-only + rebuild (`/update` uses this)
- `env.example` — beefsms provider; keys are placeholders
- `settings.example.json` / `openclaude.json.example` — no secrets
- `hooks/glm-auto-continue.py`
- `statusline.py` — copied into `dist/` at build
- `install-reverse.sh` / `verify-reverse.sh` / `reverse-versions.env` / `wire-ghidra-mcp.py`
- `PROMPT.md` — copy-paste block for another AI to do the full install

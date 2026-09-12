#!/bin/sh
# Install this OpenClaude fork from git, then wire openclaude/audncode
# launchers and seed a key-less replica of the beefsms environment.
# Does not npm-install @gitlawb/openclaude. Does not write API keys.
set -eu

GIT_URL="${OPENCLAUDE_GIT_URL:-git@forgejo:hacker/openclaude.git}"
GIT_URL_FALLBACK="${OPENCLAUDE_GIT_URL_FALLBACK:-https://github.com/fobole-openthedoor/openclaude.git}"
BRANCH="${OPENCLAUDE_GIT_BRANCH:-preserve-reasoning-history}"
PREFIX="${OPENCLAUDE_FORK_ROOT:-$HOME/openclaude}"
LAUNCHER_DIR="${OPENCLAUDE_LAUNCHER_DIR:-/usr/local/bin}"
ENV_FILE="${OPENCLAUDE_ENV:-$HOME/.config/openclaude/env}"
CONFIG_DIR="${OPENCLAUDE_CONFIG_DIR:-$HOME/.audncode-platform}"
HERE="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "openclaude-install: missing $1" >&2
    exit 1
  fi
}

ensure_bun() {
  if command -v bun >/dev/null 2>&1; then
    return 0
  fi
  echo "openclaude-install: installing bun"
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
  need bun
}

pick_launcher_dir() {
  if [ -d "$LAUNCHER_DIR" ] && [ -w "$LAUNCHER_DIR" ]; then
    return 0
  fi
  if mkdir -p "$LAUNCHER_DIR" 2>/dev/null && [ -w "$LAUNCHER_DIR" ]; then
    return 0
  fi
  LAUNCHER_DIR="${HOME}/.local/bin"
  mkdir -p "$LAUNCHER_DIR"
  echo "openclaude-install: $LAUNCHER_DIR (add this to PATH if openclaude is not found)"
}

need git
need python3
ensure_bun
need node

clone_or_update() {
  if [ -d "$PREFIX/.git" ]; then
    echo "openclaude-install: existing checkout $PREFIX"
    git -C "$PREFIX" fetch --prune --all || true
    git -C "$PREFIX" checkout "$BRANCH" 2>/dev/null || \
      git -C "$PREFIX" checkout -B "$BRANCH"
    return 0
  fi
  mkdir -p "$(dirname "$PREFIX")"
  echo "openclaude-install: clone $GIT_URL → $PREFIX"
  if git clone --branch "$BRANCH" "$GIT_URL" "$PREFIX"; then
    return 0
  fi
  echo "openclaude-install: primary clone failed, trying $GIT_URL_FALLBACK" >&2
  git clone --branch "$BRANCH" "$GIT_URL_FALLBACK" "$PREFIX"
}

clone_or_update
cd "$PREFIX"

KIT="$PREFIX/scripts/hacker"
if [ ! -d "$KIT" ] && [ -d "$HERE" ]; then
  KIT="$HERE"
fi

echo "openclaude-install: bun install"
bun install
echo "openclaude-install: bun run build"
bun run build

LAUNCHER="$KIT/launch.sh"
if [ ! -x "$LAUNCHER" ]; then
  echo "openclaude-install: missing $LAUNCHER" >&2
  exit 1
fi
pick_launcher_dir
install -m 755 "$LAUNCHER" "$LAUNCHER_DIR/openclaude"
install -m 755 "$LAUNCHER" "$LAUNCHER_DIR/audncode"
echo "openclaude-install: launchers → $LAUNCHER_DIR/openclaude $LAUNCHER_DIR/audncode"

mkdir -p "$(dirname "$ENV_FILE")"
if [ ! -f "$ENV_FILE" ]; then
  cp "$KIT/env.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "openclaude-install: wrote $ENV_FILE from env.example — set OPENAI_API_KEY"
else
  echo "openclaude-install: keeping existing $ENV_FILE"
fi

ensure_env() {
  key="$1"
  value="$2"
  if grep -q "^export ${key}=" "$ENV_FILE" 2>/dev/null; then
    return 0
  fi
  printf '\nexport %s="%s"\n' "$key" "$value" >>"$ENV_FILE"
}

ensure_env OPENCLAUDE_FORK_ROOT "$PREFIX"
ensure_env OPENCLAUDE_BIN "$PREFIX/bin/openclaude"
ensure_env DISABLE_AUTOUPDATER 1
ensure_env OPENCLAUDE_GIT_BRANCH "$BRANCH"
ensure_env OPENCLAUDE_CONFIG_DIR "$CONFIG_DIR"

mkdir -p "$CONFIG_DIR/hooks" "$CONFIG_DIR/skills/reverse-skill"
install -m 755 "$KIT/hooks/glm-auto-continue.py" \
  "$CONFIG_DIR/hooks/glm-auto-continue.py"

if [ -f "$KIT/statusline.py" ]; then
  install -m 755 "$KIT/statusline.py" "$CONFIG_DIR/statusline.py"
fi
cat >"$CONFIG_DIR/statusline.sh" <<EOF
#!/bin/sh
exec python3 "$PREFIX/dist/statusline.py"
EOF
chmod 755 "$CONFIG_DIR/statusline.sh"

STATUSLINE="python3 ${PREFIX}/dist/statusline.py"
GLM_HOOK="python3 ${CONFIG_DIR}/hooks/glm-auto-continue.py"
GHIDRA_HOME="${GHIDRA_INSTALL_DIR:-${GHIDRA_HOME:-$HOME/tools/ghidra}}"
REVERSE_SKILL_ROOT="${REVERSE_SKILL_ROOT:-$HOME/tools/reverse-skill}"
JAVA_HOME_VAL="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"

seed_file() {
  src="$1"
  dst="$2"
  if [ -f "$dst" ]; then
    echo "openclaude-install: keeping existing $dst"
    return 0
  fi
  python3 - "$src" "$dst" "$STATUSLINE" "$GLM_HOOK" \
    "$GHIDRA_HOME" "$REVERSE_SKILL_ROOT" "$JAVA_HOME_VAL" <<'PY'
import os, sys
src, dst, statusline, hook, ghidra, reverse, java = sys.argv[1:8]
text = open(src, encoding="utf-8").read()
text = (
    text.replace("__OPENCLAUDE_STATUSLINE__", statusline)
    .replace("__GLM_HOOK__", hook)
    .replace("__GHIDRA_HOME__", ghidra)
    .replace("__REVERSE_SKILL_ROOT__", reverse)
    .replace("__JAVA_HOME__", java)
)
os.makedirs(os.path.dirname(dst), exist_ok=True)
with open(dst, "w", encoding="utf-8") as f:
    f.write(text)
os.chmod(dst, 0o600)
print(f"openclaude-install: wrote {dst}")
PY
}

seed_file "$KIT/settings.example.json" "$CONFIG_DIR/settings.json"
seed_file "$KIT/openclaude.json.example" "$CONFIG_DIR/.openclaude.json"
seed_file "$KIT/CLAUDE.md.example" "$CONFIG_DIR/CLAUDE.md"
seed_file "$KIT/skills/reverse-skill/SKILL.md" \
  "$CONFIG_DIR/skills/reverse-skill/SKILL.md"

if command -v re-mcp-ghidra >/dev/null 2>&1 || [ -x "$HOME/.local/bin/re-mcp-ghidra" ]; then
  MCP_CMD="$(command -v re-mcp-ghidra 2>/dev/null || true)"
  if [ -z "$MCP_CMD" ]; then
    MCP_CMD="$HOME/.local/bin/re-mcp-ghidra"
  fi
  python3 - "$CONFIG_DIR/.openclaude.json" "$MCP_CMD" "$GHIDRA_HOME" "$JAVA_HOME_VAL" <<'PY'
import json, os, sys
path, cmd, ghidra, java = sys.argv[1:5]
data = {}
if os.path.isfile(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
servers = data.setdefault("mcpServers", {})
if "ghidra" not in servers:
    servers["ghidra"] = {
        "type": "stdio",
        "command": cmd,
        "args": ["stdio"],
        "env": {
            "GHIDRA_INSTALL_DIR": ghidra,
            "GHIDRA_HOME": ghidra,
            "JAVA_HOME": java,
        },
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    os.chmod(path, 0o600)
    print("openclaude-install: wired ghidra MCP")
else:
    print("openclaude-install: keeping existing ghidra MCP")
PY
else
  echo "openclaude-install: re-mcp-ghidra not on PATH — skip MCP (optional)"
fi

echo "openclaude-install: done"
echo "openclaude-install: $PREFIX @ $(git -C "$PREFIX" log -1 --oneline)"
echo "openclaude-install: set OPENAI_API_KEY in $ENV_FILE (beefsms), then: openclaude"
echo "openclaude-install: later: openclaude update   (or $KIT/update.sh)"

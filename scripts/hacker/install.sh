#!/bin/sh
# Install this OpenClaude fork from git, then wire /usr/local/bin/openclaude
# (and audncode) to the local build. Does not npm-install @gitlawb/openclaude.
set -eu

GIT_URL="${OPENCLAUDE_GIT_URL:-git@forgejo:hacker/openclaude.git}"
GIT_URL_FALLBACK="${OPENCLAUDE_GIT_URL_FALLBACK:-https://github.com/fobole-openthedoor/openclaude.git}"
BRANCH="${OPENCLAUDE_GIT_BRANCH:-preserve-reasoning-history}"
PREFIX="${OPENCLAUDE_FORK_ROOT:-$HOME/openclaude}"
LAUNCHER_DIR="${OPENCLAUDE_LAUNCHER_DIR:-/usr/local/bin}"
ENV_FILE="${OPENCLAUDE_ENV:-$HOME/.config/openclaude/env}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "openclaude-install: missing $1" >&2
    exit 1
  fi
}

need git
need bun
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

echo "openclaude-install: bun install"
bun install
echo "openclaude-install: bun run build"
bun run build

LAUNCHER="$PREFIX/scripts/hacker/launch.sh"
if [ ! -x "$LAUNCHER" ]; then
  echo "openclaude-install: missing $LAUNCHER" >&2
  exit 1
fi
mkdir -p "$LAUNCHER_DIR"
install -m 755 "$LAUNCHER" "$LAUNCHER_DIR/openclaude"
install -m 755 "$LAUNCHER" "$LAUNCHER_DIR/audncode"
echo "openclaude-install: launchers → $LAUNCHER_DIR/openclaude $LAUNCHER_DIR/audncode"

mkdir -p "$(dirname "$ENV_FILE")"
if [ ! -f "$ENV_FILE" ]; then
  cp "$PREFIX/scripts/hacker/env.example" "$ENV_FILE"
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

echo "openclaude-install: done"
echo "openclaude-install: $PREFIX @ $(git -C "$PREFIX" log -1 --oneline)"
echo "openclaude-install: run: openclaude"
echo "openclaude-install: later: openclaude update   (or $PREFIX/scripts/hacker/update.sh)"

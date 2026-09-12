#!/bin/sh
# One-command replica of this OpenClaude fork.
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/fobole-openthedoor/openclaude/preserve-reasoning-history/scripts/hacker/bootstrap.sh | sh
# Then edit ~/.config/openclaude/env and set OPENAI_API_KEY (same beefsms vendor).
set -eu

BRANCH="${OPENCLAUDE_GIT_BRANCH:-preserve-reasoning-history}"
PREFIX="${OPENCLAUDE_FORK_ROOT:-$HOME/openclaude}"
GIT_URL="${OPENCLAUDE_GIT_URL:-https://github.com/fobole-openthedoor/openclaude.git}"
GIT_URL_FALLBACK="${OPENCLAUDE_GIT_URL_FALLBACK:-git@forgejo:hacker/openclaude.git}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "openclaude-bootstrap: missing $1" >&2
    exit 1
  fi
}

need git
need python3

if ! command -v bun >/dev/null 2>&1; then
  echo "openclaude-bootstrap: installing bun"
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi
need bun

if ! command -v node >/dev/null 2>&1; then
  echo "openclaude-bootstrap: node >= 22 is required (https://nodejs.org)" >&2
  exit 1
fi

if [ -d "$PREFIX/.git" ]; then
  echo "openclaude-bootstrap: existing checkout $PREFIX"
else
  mkdir -p "$(dirname "$PREFIX")"
  echo "openclaude-bootstrap: clone $GIT_URL ($BRANCH) → $PREFIX"
  if ! git clone --branch "$BRANCH" "$GIT_URL" "$PREFIX"; then
    echo "openclaude-bootstrap: primary clone failed, trying $GIT_URL_FALLBACK" >&2
    git clone --branch "$BRANCH" "$GIT_URL_FALLBACK" "$PREFIX"
  fi
fi

exec sh "$PREFIX/scripts/hacker/install.sh"

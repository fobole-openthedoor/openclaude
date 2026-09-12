#!/bin/sh
# Update the local OpenClaude fork: fetch, fast-forward, bun install, rebuild.
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [ ! -d .git ]; then
  echo "openclaude-update: $ROOT is not a git checkout" >&2
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "openclaude-update: bun is required (https://bun.sh)" >&2
  exit 1
fi

pick_remote() {
  if [ -n "${OPENCLAUDE_GIT_REMOTE:-}" ]; then
    if git remote get-url "$OPENCLAUDE_GIT_REMOTE" >/dev/null 2>&1; then
      printf '%s\n' "$OPENCLAUDE_GIT_REMOTE"
      return 0
    fi
    echo "openclaude-update: unknown remote $OPENCLAUDE_GIT_REMOTE" >&2
    exit 1
  fi
  for r in forgejo github origin; do
    if git remote get-url "$r" >/dev/null 2>&1; then
      printf '%s\n' "$r"
      return 0
    fi
  done
  git remote | head -1
}

REMOTE="$(pick_remote)"
if [ -z "$REMOTE" ]; then
  echo "openclaude-update: no git remotes" >&2
  exit 1
fi

BRANCH="${OPENCLAUDE_GIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
if [ "$BRANCH" = "HEAD" ]; then
  echo "openclaude-update: detached HEAD; set OPENCLAUDE_GIT_BRANCH" >&2
  exit 1
fi

echo "openclaude-update: $ROOT"
echo "openclaude-update: was $(git log -1 --oneline)"
echo "openclaude-update: fetch $REMOTE $BRANCH"

git fetch --prune "$REMOTE" "$BRANCH"

if ! git merge-base --is-ancestor HEAD "$REMOTE/$BRANCH" && \
   ! git merge-base --is-ancestor "$REMOTE/$BRANCH" HEAD; then
  echo "openclaude-update: local and $REMOTE/$BRANCH have diverged; merge/rebase by hand" >&2
  exit 1
fi

git checkout "$BRANCH" >/dev/null 2>&1 || git checkout -B "$BRANCH" "$REMOTE/$BRANCH"
git merge --ff-only "$REMOTE/$BRANCH"

echo "openclaude-update: bun install"
bun install
echo "openclaude-update: bun run build"
bun run build
echo "openclaude-update: now $(git log -1 --oneline)"
echo "openclaude-update: restart OpenClaude to load the new bundle"

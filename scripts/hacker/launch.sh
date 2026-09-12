#!/bin/sh
# Official OpenClaude launcher. Sources a dedicated env file so ~/.bashrc
# OPENAI_BASE_URL (strix/cige) does not leak into this CLI.
ENV_FILE="${OPENCLAUDE_ENV:-$HOME/.config/openclaude/env}"
if [ ! -f "$ENV_FILE" ]; then
  echo "openclaude: missing $ENV_FILE" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

# Node crashes with uv_cwd if this shell is sitting in a deleted directory.
recover_cwd() {
  if pwd >/dev/null 2>&1; then
    return 0
  fi
  echo "openclaude: current directory is gone; recovering" >&2
  resume_id=""
  prev=""
  for arg in "$@"; do
    case "$prev" in
      --resume|-r) resume_id="$arg" ;;
    esac
    case "$arg" in
      --resume=*|-r=*) resume_id="${arg#*=}" ;;
    esac
    prev="$arg"
  done
  if [ -n "$resume_id" ]; then
    jsonl=$(find "${OPENCLAUDE_CONFIG_DIR:-$HOME/.audncode-platform}/projects" -name "${resume_id}.jsonl" 2>/dev/null | head -1)
    if [ -n "$jsonl" ]; then
      session_cwd=$(python3 - "$jsonl" <<'PY'
import json, sys
path = sys.argv[1]
cwd = None
with open(path, encoding="utf-8") as f:
    for line in f:
        try:
            o = json.loads(line)
        except Exception:
            continue
        if o.get("cwd"):
            cwd = o["cwd"]
            break
print(cwd or "")
PY
)
      if [ -n "$session_cwd" ]; then
        mkdir -p "$session_cwd" 2>/dev/null || true
        if [ -d "$session_cwd" ]; then
          echo "openclaude: restored session cwd $session_cwd" >&2
          cd "$session_cwd" || true
        fi
      fi
    fi
  fi
  if ! pwd >/dev/null 2>&1; then
    cd "${HOME:-/}" || exit 1
    echo "openclaude: fell back to $(pwd)" >&2
  fi
}
recover_cwd "$@"

FORK_ROOT="${OPENCLAUDE_FORK_ROOT:-$HOME/openclaude}"
BIN="${OPENCLAUDE_BIN:-$FORK_ROOT/bin/openclaude}"
if [ ! -x "$BIN" ]; then
  echo "openclaude: binary not found at $BIN" >&2
  echo "openclaude: expected fork at $FORK_ROOT (scripts/hacker/install.sh)" >&2
  exit 1
fi
exec "$BIN" "$@"

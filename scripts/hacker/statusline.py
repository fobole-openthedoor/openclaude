#!/usr/bin/env python3
"""OpenClaude statusline — Pi-like footer: tokens, t/s, context, docker, model, git."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

CACHE = Path("/tmp/openclaude-statusline-docker.json")
CACHE_TTL = 30.0
GIT_CACHE = Path("/tmp/openclaude-statusline-git.json")
GIT_TTL = 8.0

DIM = "\033[2m"
RST = "\033[0m"
CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
BLUE = "\033[34m"
MAGENTA = "\033[35m"


def sh(cmd: list[str], timeout: float = 0.35) -> str:
    try:
        p = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=timeout,
            check=False,
            text=True,
        )
        return (p.stdout or "").strip()
    except Exception:
        return ""


def fmt_n(n) -> str:
    try:
        n = int(n)
    except (TypeError, ValueError):
        return "0"
    if n >= 1_000_000:
        s = f"{n / 1_000_000:.1f}M"
        return s.replace(".0M", "M")
    if n >= 1000:
        s = f"{n / 1000:.1f}k"
        return s.replace(".0k", "k")
    return str(n)


def fmt_win(n) -> str:
    try:
        n = int(n)
    except (TypeError, ValueError):
        return "?"
    if n >= 1_000_000:
        s = f"{n / 1_000_000:.1f}M"
        return s.replace(".0M", "M")
    if n >= 1000:
        s = f"{n / 1000:.0f}K"
        return s
    return str(n)


def tps_color(tps: float) -> str:
    if tps >= 45:
        return CYAN
    if tps >= 30:
        return GREEN
    if tps >= 15:
        return YELLOW
    return RED


def parse_iso(ts: str | None) -> float | None:
    if not ts:
        return None
    try:
        from datetime import datetime

        return datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
    except Exception:
        return None


def last_turn_from_transcript(path: str) -> dict:
    """Tail jsonl for last user + first/last assistant timestamps and usage."""
    out: dict = {}
    p = Path(path)
    if not p.is_file():
        return out
    try:
        size = p.stat().st_size
        with p.open("rb") as f:
            if size > 131072:
                f.seek(size - 131072)
                f.readline()
            raw = f.read().decode("utf-8", "replace")
    except Exception:
        return out

    user_ts = None
    first_asst = None
    last_asst = None
    usage = None
    for line in raw.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            o = json.loads(line)
        except Exception:
            continue
        t = o.get("type")
        ts = o.get("timestamp")
        if t == "user":
            user_ts = ts
            first_asst = None
            last_asst = None
            usage = None
        elif t == "assistant":
            if first_asst is None:
                first_asst = ts
            last_asst = ts
            msg = o.get("message") or {}
            u = msg.get("usage") if isinstance(msg, dict) else None
            if isinstance(u, dict) and (
                u.get("output_tokens") or u.get("input_tokens") or u.get("cache_read_input_tokens")
            ):
                usage = u
    if user_ts:
        out["user_ts"] = user_ts
    if first_asst:
        out["first_asst_ts"] = first_asst
    if last_asst:
        out["last_asst_ts"] = last_asst
    if usage:
        out["usage"] = usage
    return out


def docker_stats() -> tuple[str, int, int] | None:
    now = time.time()
    if CACHE.is_file():
        try:
            cached = json.loads(CACHE.read_text())
            if now - float(cached.get("t", 0)) < CACHE_TTL:
                return cached["ver"], int(cached["run"]), int(cached["total"])
        except Exception:
            pass
    if not sh(["bash", "-lc", "command -v docker"], timeout=0.2):
        return None
    ver = sh(["docker", "version", "--format", "{{.Server.Version}}"], timeout=0.4)
    if not ver:
        return None
    running = sh(["docker", "ps", "-q"], timeout=0.5)
    total = sh(["docker", "ps", "-aq"], timeout=0.5)
    run_n = len([x for x in running.splitlines() if x])
    tot_n = len([x for x in total.splitlines() if x])
    try:
        CACHE.write_text(json.dumps({"t": now, "ver": ver, "run": run_n, "total": tot_n}))
    except Exception:
        pass
    return ver, run_n, tot_n


def git_info(cwd: str) -> tuple[str, str]:
    if not cwd:
        return "", ""
    now = time.time()
    if GIT_CACHE.is_file():
        try:
            cached = json.loads(GIT_CACHE.read_text())
            if (
                cached.get("cwd") == cwd
                and now - float(cached.get("t", 0)) < GIT_TTL
            ):
                return str(cached.get("short") or ""), str(cached.get("branch") or "")
        except Exception:
            pass
    branch = sh(["git", "-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"], timeout=0.3)
    top = sh(["git", "-C", cwd, "rev-parse", "--show-toplevel"], timeout=0.3)
    short = ""
    if top:
        home = os.path.expanduser("~")
        short = top.replace(home, "~") if top.startswith(home) else top
        # keep last two components when long
        parts = short.split("/")
        if len(parts) > 3:
            short = "/".join(parts[-2:])
    elif cwd:
        home = os.path.expanduser("~")
        short = cwd.replace(home, "~") if cwd.startswith(home) else cwd
    try:
        GIT_CACHE.write_text(
            json.dumps({"t": now, "cwd": cwd, "short": short, "branch": branch})
        )
    except Exception:
        pass
    return short, branch


def main() -> None:
    raw = sys.stdin.read()
    try:
        data = json.loads(raw) if raw.strip() else {}
    except Exception:
        data = {}

    model = ((data.get("model") or {}).get("display_name")
             or (data.get("model") or {}).get("id")
             or "?")
    cw = data.get("context_window") or {}
    usage = cw.get("current_usage") or {}
    used_pct = cw.get("used_percentage")
    win = cw.get("context_window_size") or 0
    transcript = data.get("transcript_path") or ""
    cwd = (data.get("workspace") or {}).get("current_dir") or data.get("cwd") or os.getcwd()

    turn = last_turn_from_transcript(transcript) if transcript else {}
    if turn.get("usage"):
        usage = turn["usage"]

    inp = int(usage.get("input_tokens") or 0)
    out = int(usage.get("output_tokens") or 0)
    cr = int(usage.get("cache_read_input_tokens") or 0)
    cc = int(usage.get("cache_creation_input_tokens") or 0)
    total_in = inp + cr + cc
    sigma = total_in + out
    ch = (cr / total_in * 100.0) if total_in else 0.0

    ttft_s = None
    gen_s = None
    turn_s = None
    u_ts = parse_iso(turn.get("user_ts"))
    f_ts = parse_iso(turn.get("first_asst_ts"))
    l_ts = parse_iso(turn.get("last_asst_ts"))
    if u_ts and f_ts:
        ttft_s = max(0.0, f_ts - u_ts)
    if f_ts and l_ts:
        gen_s = max(0.0, l_ts - f_ts)
    if u_ts and l_ts:
        turn_s = max(0.0, l_ts - u_ts)

    tps = None
    # Only show t/s when we have a real generation window. Many OpenAI-compat
    # proxies emit the whole assistant message in one jsonl record, which would
    # fake thousands of t/s if we divided by a few milliseconds.
    if out and gen_s is not None and gen_s >= 0.25:
        tps = out / gen_s
    elif out and ttft_s is not None and turn_s is not None:
        body = turn_s - ttft_s
        if body >= 0.25:
            tps = out / body

    segs: list[str] = []
    if out or inp or cr or cc:
        segs.append(
            f"{DIM}↑{fmt_n(total_in)} ↓{fmt_n(out)} Σ{fmt_n(sigma)} "
            f"R {fmt_n(cr)} W {fmt_n(cc)} CH {ch:.0f}%{RST}"
        )
    if tps is not None:
        extra = ""
        if ttft_s is not None:
            extra = f"{DIM} TTFT {ttft_s:.1f}s{RST}"
        segs.append(f"{tps_color(tps)}⚡{tps:.1f} t/s{RST}{extra}")
    elif ttft_s is not None:
        segs.append(f"{DIM}TTFT {ttft_s:.1f}s{RST}")

    if used_pct is not None and win:
        segs.append(f"🧠 {used_pct:.1f}%/{fmt_win(win)}")
    elif used_pct is not None:
        segs.append(f"🧠 {used_pct:.1f}%")

    dk = docker_stats()
    if dk:
        ver, run_n, tot_n = dk
        segs.append(f"{BLUE}🐳 {run_n}▶/{tot_n}{RST}{DIM} v{ver}{RST}")

    short, branch = git_info(cwd)
    loc = short or cwd.replace(os.path.expanduser("~"), "~")
    if branch:
        loc = f"{loc} ({branch})"
    segs.append(f"{DIM}{loc}{RST}")
    segs.append(f"{MAGENTA}{model}{RST}")

    print("  ".join(segs))


if __name__ == "__main__":
    main()

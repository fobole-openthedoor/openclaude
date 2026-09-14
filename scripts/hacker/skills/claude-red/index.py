#!/usr/bin/env python3
"""Write INDEX.openclaude.md from Claude-Red SKILL.md frontmatter."""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from route import iter_skills, parse_frontmatter


def first_sentence(text: str, limit: int = 140) -> str:
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    return text[: limit - 1] + "…"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root",
        default=os.environ.get("CLAUDE_RED_ROOT", str(Path.home() / "tools" / "claude-red")),
    )
    args = parser.parse_args()
    root = Path(args.root).expanduser()
    skills = iter_skills(root)
    lines = [
        "# claude-red index (OpenClaude)",
        "",
        "Generated at install time. Route with `route.py --hint \"<task>\"`.",
        "",
        f"Skills: {len(skills)}",
        "",
        "| Skill | Path | Summary |",
        "| --- | --- | --- |",
    ]
    for path in skills:
        rel = path.relative_to(root).as_posix()
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            text = ""
        meta = parse_frontmatter(text)
        name = meta.get("name") or path.parent.name
        summary = first_sentence(meta.get("description") or "")
        lines.append(f"| `{name}` | `{rel}` | {summary} |")
    lines.append("")
    dest = root / "INDEX.openclaude.md"
    dest.write_text("\n".join(lines), encoding="utf-8")
    print(dest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

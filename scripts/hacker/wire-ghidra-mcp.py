#!/usr/bin/env python3
"""Merge the ghidra MCP stdio server into OpenClaude config. Never writes API keys."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 5:
        print(
            "usage: wire-ghidra-mcp.py <openclaude.json> <re-mcp-ghidra> <ghidra_home> <java_home>",
            file=sys.stderr,
        )
        return 2
    path = Path(sys.argv[1])
    cmd, ghidra, java = sys.argv[2:5]
    data: dict = {}
    if path.is_file():
        data = json.loads(path.read_text(encoding="utf-8"))
    servers = data.setdefault("mcpServers", {})
    desired = {
        "type": "stdio",
        "command": cmd,
        "args": ["stdio"],
        "env": {
            "GHIDRA_INSTALL_DIR": ghidra,
            "GHIDRA_HOME": ghidra,
            "JAVA_HOME": java,
        },
    }
    if servers.get("ghidra") == desired:
        print(f"openclaude-wire: ghidra MCP already current in {path}")
        return 0
    servers["ghidra"] = desired
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    os.chmod(path, 0o600)
    print(f"openclaude-wire: wrote ghidra MCP → {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

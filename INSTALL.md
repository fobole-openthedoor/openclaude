# 安装这套 OpenClaude（本 fork）

打开这个仓库就是为了装这个。**不要** `npm i -g @gitlawb/openclaude`，**不要**用 `main` 分支。

供应商已经写死：`http://openai.beefsms.com:38888/v1`（`happy/kimi-k3` / `happy/glm-5.3` / `happy/qwen-3.8-fast`）。Key 自己填，不进 git。

需要：`git`、`python3`、Node.js ≥ 22。没有 bun 脚本会装。

## 人：三条命令

```sh
curl -fsSL https://raw.githubusercontent.com/fobole-openthedoor/openclaude/preserve-reasoning-history/scripts/hacker/bootstrap.sh | sh
~/openclaude/scripts/hacker/install-reverse.sh
```

然后编辑 `~/.config/openclaude/env`，把 `OPENAI_API_KEY` 换成自己的 beefsms key。可选 `BRAVE_API_KEY`。

```sh
~/openclaude/scripts/hacker/verify-reverse.sh
openclaude
```

`install-reverse.sh` 会下 Ghidra 12.1.3（约 570MB）。已经有 Ghidra 就加 `--skip-ghidra`。磁盘不够就先跳过，CLI 也能用。

有 Forgejo：

```sh
git clone -b preserve-reasoning-history git@forgejo:hacker/openclaude.git ~/openclaude
~/openclaude/scripts/hacker/install.sh
~/openclaude/scripts/hacker/install-reverse.sh
```

## AI：把提示词整段贴过去

打开仓库根目录的 **[PROMPT.md](PROMPT.md)**，把「从这里复制」到「复制结束」发给任意能跑终端的 AI。人只负责事后填 key。

细节、版本钉死、脚本清单：`scripts/hacker/README.md`。

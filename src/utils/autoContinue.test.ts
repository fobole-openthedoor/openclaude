import { describe, expect, test } from 'bun:test'
import { classifyStop } from './autoContinue.js'

const ENT_WRAPUP = `结论已完整写入并提交。

- **文件**: \`/root/hacker/safeline-analysis/ENT_IMAGE_HUNT.md\`（748 行）
- **commit**: \`d9a8506\`（ENT镜像狩猎收官）

文档包含全部今日发现：
- §4.5 — china/global 二进制 diff
- §4.7 — 最终结论 + ENT 分发模型 + 待验证清单
`

const LONG_DOC_DONE =
  '文档已写完并保存到 `/root/hacker/safeline-analysis/ENT_IMAGE_HUNT.md`。\n\n' +
  '**本次会话新增内容**：\n\n' +
  '| 段 | 内容 |\n| --- | --- |\n' +
  '| §4.5 | china/global diff |\n| §4.6 | 公开渠道穷尽探测 |\n' +
  '| §4.7 | 最终结论 + 待验证清单 |\n\n' +
  'handoff notes. '.repeat(80)

describe('classifyStop', () => {
  const cases: Array<[string, string, ReturnType<typeof classifyStop>]> = [
    ['empty', '', 'think'],
    ['no-response', 'No response requested.', 'allow'],
    ['compaction', 'Session automatic compaction started.', 'allow'],
    ['question', '要不要继续挖 oversea？', 'allow'],
    ['ent-wrapup', ENT_WRAPUP, 'allow'],
    [
      'written-then-verify',
      '结论已写入 `/root/hacker/safeline-analysis/ENT_IMAGE_HUNT.md` 并提交（d9a8506）。让我验证一下文档内容是否完整。',
      'announce',
    ],
    [
      'continue-push',
      '继续推进。先并行打几个低成本高价值目标：oversea 域名 version.json（从未探测过！）、upgrade_check.py（从未读过！）',
      'announce',
    ],
    [
      'continue-dig',
      '继续挖本地剩余线索：全量 URL 目录 + checkUpgrade 的 base URL 来源（region 分支点）。',
      'announce',
    ],
    [
      'continue-extract',
      '继续打剩余线索。先全量提取二进制中的环境变量名，看是否有 ENT 专属变量。',
      'announce',
    ],
    [
      'patch-doc',
      '先确认文档当前状态，再把最后两块新发现（manager.py 逆向 + 网络探测）补进去。',
      'announce',
    ],
    [
      'telegram-verify',
      '函数表 0 diff = 代码逻辑完全一致。差异只是条件编译的区域常量。验证 ldflags 确认。',
      'short',
    ],
    ['long-doc-done', LONG_DOC_DONE, 'allow'],
    ['let-me-pull', '下一步我去 docker pull 官方镜像。', 'announce'],
    [
      'unknowns-only',
      '公开渠道已穷尽。未验证项：销售渠道是否另有 registry。待确认：ENT 是否仅走私有分发。',
      'allow',
    ],
    ['let-me-grep', 'Let me grep the binary next.', 'announce'],
    [
      'remaining-questions',
      'Remaining questions: whether ENT uses a private registry.',
      'allow',
    ],
    ['next-inventory', '下一步：待验证清单', 'allow'],
  ]

  for (const [name, text, expectKind] of cases) {
    test(name, () => {
      expect(classifyStop(text)).toBe(expectKind)
    })
  }
})

import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { registerHookCallbacks } from '../bootstrap/state.js'
import type { HookInput, HookJSONOutput } from '../entrypoints/agentSdkTypes.js'
import { isEnvTruthy } from './envUtils.js'
import type { HookCallback } from '../types/hooks.js'

export type AutoContinueKind = 'allow' | 'think' | 'announce' | 'short'

const MAX_STREAK = Number.parseInt(process.env.AUTO_CONTINUE_MAX ?? process.env.GLM_AUTO_CONTINUE_MAX ?? '12', 10) || 12
const SHORT_LIMIT = Number.parseInt(process.env.AUTO_CONTINUE_SHORT ?? process.env.GLM_AUTO_CONTINUE_SHORT ?? '800', 10) || 800
const STATE_DIR = process.env.AUTO_CONTINUE_STATE_DIR ?? process.env.GLM_AUTO_CONTINUE_STATE_DIR ?? '/tmp/oc-auto-continue'

const PENDING_ACTION = new RegExp(
  [
    '让我|我(先|再|去|来|把|将)|然后我|接下来我',
    '继续(推进|挖|打|查|读|看|搜|跑|验证|探测|分析)',
    '先(并行|确认|全量|提取|打|读|跑|去|把)',
    '稍后(我|去|再)|收尾|补进|写进',
    '(下一步|接下来)[：:，, ]*(我|去|是)?[：:，, ]*(去|跑|执行|验证|检查|探测|打开|拉取|搜索|反编译|反汇编|grep|pull|curl|读|写|补)',
    '还(要|得|需)(去|跑|执行|验证|检查|探测|打开|拉取)',
    "let me|gonna|I(?:'ll| will| am going to)",
    '(现在|接着)(去|跑|执行|pull|grep|curl)',
    '打开\\s*https?://',
    '\\bdocker\\s+pull\\b|\\bgit\\s+grep\\b',
  ].join('|'),
  'i',
)

const USER_QUESTION = /[？]|请(确认|选择|告诉|问)|\b(which (one|option)|should I|do you want|can you confirm)\b|(要不要|是不是|对吗|对不对|哪一个)/i
const REPORT_MARK = /^#{1,3}\s|结论|总结|handoff|本次会话新增/im
const CLOSED_TURN =
  /结论已.{0,24}(写入|写完|写好|提交|保存)|已(完整)?写入并提交|文档已(写完|写入|保存|提交)|已提交到\s*git|已(经)?(完成|改好|写完|保存|搞定|处理好)|以上(就是|为)|任务完成|无需再(做|继续)|没有更多/i
const FILE_REF = /(?:文件|file)\s*[:：].{0,160}|`\/[^`\n]+\.(?:md|txt|rst)`|(?<!\w)\/[^\s`]+\.(?:md|txt|rst)/i
const COMMIT_REF = /commit\s*[:：]\s*`?[0-9a-f]{7,40}`?|提交.{0,16}`?[0-9a-f]{7,40}`?/i
const LIST_MARK = /(^|\n)\s*[-*•]|(^|\n)§|\b\d+\.\d+/
const HANDOFF_FLAVOR = /待验证清单|公开渠道穷尽|最终结论|handoff|收官|已(写入|写完|提交|保存)|文档包含/i
const DOCUMENTED_UNKNOWN =
  /待(验证|确认|查|测)(清单|项|点|列表)?|未(验证|确认)|公开渠道穷尽|remaining questions|open questions/i

export const THINK_ONLY_REASON =
  'You stopped after thinking and did not call a tool. ' +
  'The user did not ask you to wait. Continue the same task now: ' +
  'call the next tool in this turn. Do not summarize a plan and stop.'

export const ANNOUNCE_REASON =
  'You announced a next action and then stopped without calling a tool. ' +
  'Do that step now: call the tool. Do not announce work again.'

export const SHORT_NOTE_REASON =
  'You wrote a short finding and stopped without calling a tool. ' +
  'That is not a finished turn. Keep going on the same task: ' +
  'call the next tool now. Do not repeat the finding.'

const KIND_LABEL: Record<Exclude<AutoContinueKind, 'allow'>, string> = {
  think: '想完没调工具',
  announce: '还有下一步没调工具',
  short: '短结论没调工具',
}

function afterClose(text: string): string {
  const m = CLOSED_TURN.exec(text)
  return m ? text.slice(m.index + m[0].length) : text
}

export function isClosedHandoff(text: string): boolean {
  if (CLOSED_TURN.test(text)) return true
  return Boolean(FILE_REF.test(text) && COMMIT_REF.test(text))
}

export function isStructuredClose(text: string): boolean {
  if (PENDING_ACTION.test(text)) return false
  if (!REPORT_MARK.test(text)) return false
  if (!LIST_MARK.test(text)) return false
  return HANDOFF_FLAVOR.test(text)
}

export function classifyStop(lastText: string): AutoContinueKind {
  const text = lastText.trim()
  if (text.startsWith('No response requested') || text.includes('automatic compaction')) {
    return 'allow'
  }
  if (!text) return 'think'
  if (USER_QUESTION.test(text)) return 'allow'
  if (isClosedHandoff(text)) {
    return PENDING_ACTION.test(afterClose(text)) ? 'announce' : 'allow'
  }
  if (isStructuredClose(text)) return 'allow'
  if (REPORT_MARK.test(text) && text.length > SHORT_LIMIT) return 'allow'
  if (PENDING_ACTION.test(text)) return 'announce'
  if (DOCUMENTED_UNKNOWN.test(text)) return 'allow'
  if (text.length <= SHORT_LIMIT) return 'short'
  return 'allow'
}

export function reasonForKind(kind: AutoContinueKind): string | null {
  switch (kind) {
    case 'think':
      return THINK_ONLY_REASON
    case 'announce':
      return ANNOUNCE_REASON
    case 'short':
      return SHORT_NOTE_REASON
    default:
      return null
  }
}

function autoContinueDisabled(): boolean {
  const raw = process.env.AUTO_CONTINUE ?? process.env.GLM_AUTO_CONTINUE
  if (raw === undefined) return false
  return raw === '0' || raw.toLowerCase() === 'false' || raw.toLowerCase() === 'no' || isEnvTruthy(process.env.DISABLE_AUTO_CONTINUE_HOOK)
}

function streakPath(sessionId: string): string {
  const safe = (sessionId || 'unknown').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80)
  return join(STATE_DIR, `${safe}.streak`)
}

function bumpStreak(sessionId: string): number {
  mkdirSync(STATE_DIR, { recursive: true })
  const path = streakPath(sessionId)
  let n = 0
  try {
    n = Number.parseInt(readFileSync(path, 'utf8').trim() || '0', 10) || 0
  } catch {
    n = 0
  }
  n += 1
  writeFileSync(path, String(n))
  return n
}

function clearStreak(sessionId: string): void {
  try {
    unlinkSync(streakPath(sessionId))
  } catch {
    // ignore
  }
}

export async function autoContinueStopHook(input: HookInput): Promise<HookJSONOutput> {
  if (autoContinueDisabled()) return {}
  if (input.hook_event_name !== 'Stop') return {}
  const lastText = input.last_assistant_message ?? ''
  const sessionId = input.session_id || 'unknown'
  const kind = classifyStop(lastText)
  const reason = reasonForKind(kind)
  if (!reason) {
    clearStreak(sessionId)
    return {}
  }
  const n = bumpStreak(sessionId)
  if (n > MAX_STREAK) {
    clearStreak(sessionId)
    return {}
  }
  const round = `第 ${n}/${MAX_STREAK} 轮`
  return {
    decision: 'block',
    reason: `[${round}] ${reason}`,
    systemMessage: `${round}自动续 · ${KIND_LABEL[kind]}`,
  }
}

export function registerAutoContinueHook(): void {
  const hook: HookCallback = {
    type: 'callback',
    callback: autoContinueStopHook,
    timeout: 8,
  }
  registerHookCallbacks({
    Stop: [{ hooks: [hook] }],
  })
}

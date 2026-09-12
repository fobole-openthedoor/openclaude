import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { execa } from 'execa'

function isForkRoot(root: string): boolean {
  const abs = resolve(root)
  return (
    existsSync(join(abs, '.git')) &&
    existsSync(join(abs, 'scripts/hacker/update.sh')) &&
    existsSync(join(abs, 'package.json'))
  )
}

function rootFromBin(bin: string | undefined): string | null {
  if (!bin) return null
  const root = resolve(dirname(bin), '..')
  return isForkRoot(root) ? root : null
}

function rootFromInvoked(invoked: string | undefined): string | null {
  if (!invoked) return null
  const abs = resolve(invoked)
  if (abs.endsWith(`${join('dist', 'cli.mjs')}`) || abs.endsWith('/dist/cli.mjs')) {
    const root = resolve(dirname(abs), '..')
    return isForkRoot(root) ? root : null
  }
  if (abs.endsWith(`${join('bin', 'openclaude')}`) || abs.endsWith('/bin/openclaude')) {
    const root = resolve(dirname(abs), '..')
    return isForkRoot(root) ? root : null
  }
  return null
}

/** Directory of the source checkout this process is running from, if any. */
export function getForkRoot(
  env: NodeJS.ProcessEnv = process.env,
  invokedPath: string | undefined = process.argv[1],
): string | null {
  const fromEnv = env.OPENCLAUDE_FORK_ROOT?.trim()
  if (fromEnv && isForkRoot(fromEnv)) return resolve(fromEnv)
  const fromBin = rootFromBin(env.OPENCLAUDE_BIN?.trim())
  if (fromBin) return fromBin
  return rootFromInvoked(invokedPath)
}

export function isForkInstall(
  env: NodeJS.ProcessEnv = process.env,
  invokedPath: string | undefined = process.argv[1],
): boolean {
  return getForkRoot(env, invokedPath) !== null
}

export type ForkUpdateResult = {
  ok: boolean
  output: string
  commit: string | null
  root: string | null
}

export async function updateForkFromSource(
  root = getForkRoot(),
): Promise<ForkUpdateResult> {
  if (!root) {
    return {
      ok: false,
      output: 'Not a fork install (OPENCLAUDE_FORK_ROOT / OPENCLAUDE_BIN).',
      commit: null,
      root: null,
    }
  }
  const script = join(root, 'scripts/hacker/update.sh')
  if (!existsSync(script)) {
    return {
      ok: false,
      output: `Missing ${script}`,
      commit: null,
      root,
    }
  }
  const result = await execa('sh', [script], {
    cwd: root,
    reject: false,
    all: true,
  })
  let commit: string | null = null
  try {
    const log = await execa('git', ['-C', root, 'log', '-1', '--oneline'])
    commit = log.stdout.trim() || null
  } catch {
    commit = null
  }
  return {
    ok: result.exitCode === 0,
    output: (result.all || `${result.stdout}\n${result.stderr}`).trim(),
    commit,
    root,
  }
}

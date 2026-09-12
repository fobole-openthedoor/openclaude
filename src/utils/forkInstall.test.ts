import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'
import { getForkRoot, isForkInstall } from './forkInstall.js'

describe('getForkRoot', () => {
  test('reads OPENCLAUDE_FORK_ROOT when the tree looks like this fork', () => {
    const root = mkdtempSync(join(tmpdir(), 'oc-fork-'))
    try {
      mkdirSync(join(root, '.git'))
      mkdirSync(join(root, 'scripts/hacker'), { recursive: true })
      writeFileSync(join(root, 'package.json'), '{}')
      writeFileSync(join(root, 'scripts/hacker/update.sh'), '#!/bin/sh\n')
      expect(getForkRoot({ OPENCLAUDE_FORK_ROOT: root }, '/tmp/not-used')).toBe(
        root,
      )
      expect(isForkInstall({ OPENCLAUDE_FORK_ROOT: root }, '/tmp/not-used')).toBe(
        true,
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('returns null for a random directory', () => {
    expect(
      getForkRoot({ OPENCLAUDE_FORK_ROOT: '/tmp' }, '/usr/bin/node'),
    ).toBeNull()
    expect(isForkInstall({ OPENCLAUDE_BIN: '/usr/bin/openclaude' }, '')).toBe(
      false,
    )
  })
})

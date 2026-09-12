import { describe, expect, test } from 'bun:test'
import {
  detectOutputDegeneration,
  createDegenerationWatch,
  OutputDegenerationError,
} from './outputDegeneration.js'

const SALAD =
  'CONJECTURE SURMISE GUESS ESTIMATE APPROXIMATION CALCULATION COMPUTATION RECKONING TALLY COUNT ENUMERATION LISTING CATALOGUING INDEXING FILING SHELVING ARCHIVING KEEP RETAIN HOLD GRASP CLUTCH GRIP PINCH SQUEEZE CRUSH MASH POUND BEAT HAMMER STRIKE TAP KNOCK RAP DRUM THUMP BANG CRASH SMASH SHATTER EXPLODE DETONATE ERUPT BURST BLAZE FLARE GLOW SHIMMER SPARK GLITTER TWINKLE FLICKER FLASH STROBE BLINK'

const SPLIT =
  'INFIN IT UDE ETER NI TY IMMORTA LI TY PERMAN ENC E PERPET UI TY ENDURA NC E LAST ING NE SS CONTINU IT Y CONTINUO US NE SS UNBROK EN NE SS UNINTER MI TT ED NE SS CEASE LE SS INCESS ANT LY'

describe('detectOutputDegeneration', () => {
  test('ignores short or normal prose', () => {
    expect(detectOutputDegeneration('Let me grep the binary next.')).toBeNull()
    expect(
      detectOutputDegeneration(
        'I will read manager.py, then check the upgrade URL, then write the notes.',
      ),
    ).toBeNull()
  })

  test('catches ALL-CAPS synonym dumps', () => {
    const hit = detectOutputDegeneration(SALAD)
    expect(hit?.kind).toBe('caps_salad')
  })

  test('catches syllable-split tokens', () => {
    const hit = detectOutputDegeneration(SPLIT)
    expect(hit?.kind).toBe('syllable_split')
  })

  test('catches STOP NOW ACTUALLY loops', () => {
    const hit = detectOutputDegeneration(
      'keep going KEEP GOING (OK SERIOUS STOP NOW ACTUALLY REALLY GENUINE AUTHENTIC VERIFIED) still dumping',
    )
    expect(hit?.kind).toBe('meta_loop')
  })

  test('watch throws once the buffer is clearly degenerate', () => {
    const watch = createDegenerationWatch()
    expect(() => {
      for (let i = 0; i < 8; i++) watch.push(`${SALAD} `)
    }).toThrow(OutputDegenerationError)
  })
})

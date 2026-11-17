import { describe, it, expect } from 'vitest'
import { fromHex, toHex, toBase64, fromBase64, encodeText, decodeText, chunkBytes } from './encoding'
import { randomBytes, randomIV, randomNonce96 } from './random'
import { runAllTests } from './selftest'

describe('encoding', () => {
  it('toHex / fromHex round-trips', () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255])
    expect(fromHex(toHex(bytes))).toEqual(bytes)
  })
  it('toBase64 / fromBase64 round-trips', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111])
    expect(fromBase64(toBase64(bytes))).toEqual(bytes)
  })
  it('encodeText / decodeText round-trips unicode', () => {
    const text = 'Hello 世界 🔐'
    expect(decodeText(encodeText(text))).toBe(text)
  })
  it('chunkBytes splits correctly', () => {
    const bytes = new Uint8Array(32).fill(1)
    const chunks = chunkBytes(bytes, 16)
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toHaveLength(16)
  })
})

describe('random', () => {
  it('randomBytes returns correct length', () => {
    expect(randomBytes(32)).toHaveLength(32)
  })
  it('randomIV is 16 bytes', () => { expect(randomIV()).toHaveLength(16) })
  it('randomNonce96 is 12 bytes', () => { expect(randomNonce96()).toHaveLength(12) })
  it('two random values are not equal', () => {
    const a = randomBytes(32), b = randomBytes(32)
    expect(toHex(a)).not.toBe(toHex(b))
  })
})

describe('crypto KATs and round-trips', () => {
  it('all self-tests pass', async () => {
    const results = await runAllTests()
    const failed = results.filter(r => !r.passed)
    if (failed.length > 0) {
      console.error('Failed tests:', failed)
    }
    expect(failed).toHaveLength(0)
  }, 30000)
})

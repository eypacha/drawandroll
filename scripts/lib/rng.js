function toUint32(value) {
  return value >>> 0
}

export function hashSeed(input) {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return toUint32(Math.trunc(input))
  }

  const text = String(input ?? '')
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return toUint32(hash)
}

export function deriveSeed(baseSeed, index) {
  const x = toUint32(baseSeed)
  const y = toUint32(index + 1)
  let mixed = x ^ Math.imul(y, 0x9e3779b1)
  mixed ^= mixed >>> 16
  mixed = Math.imul(mixed, 0x85ebca6b)
  mixed ^= mixed >>> 13
  mixed = Math.imul(mixed, 0xc2b2ae35)
  mixed ^= mixed >>> 16
  return toUint32(mixed)
}

export function createRng(seedInput) {
  let state = hashSeed(seedInput)
  if (state === 0) {
    state = 0x6d2b79f5
  }

  function next() {
    state = toUint32(state + 0x6d2b79f5)
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  function int(min, max) {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new Error(`Invalid int range: ${min}..${max}`)
    }
    const span = max - min + 1
    return min + Math.floor(next() * span)
  }

  function pick(array) {
    if (!Array.isArray(array) || array.length === 0) return null
    return array[int(0, array.length - 1)]
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = int(0, i)
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  return {
    next,
    int,
    pick,
    shuffle
  }
}

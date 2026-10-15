let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(v: boolean) {
  enabled = v
}

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    return ctx
  } catch {
    return null
  }
}

/** Call from a user gesture so later playback is allowed. */
export function unlockAudio() {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume()
}

function tone(c: AudioContext, freq: number, start: number, dur: number, gain = 0.25) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.value = freq
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(gain, start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, start + dur)
  o.connect(g).connect(c.destination)
  o.start(start)
  o.stop(start + dur + 0.05)
}

export function playRestEnd() {
  if (!enabled) return
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  const t0 = c.currentTime
  tone(c, 880, t0, 0.15)
  tone(c, 1174.7, t0 + 0.18, 0.15)
  tone(c, 1760, t0 + 0.36, 0.3)
}

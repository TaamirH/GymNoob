let enabled = true

export function setHapticsEnabled(v: boolean) {
  enabled = v
}

function vibrate(pattern: number | number[]) {
  if (!enabled) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported */
  }
}

export const haptics = {
  tap: () => vibrate(8),
  confirm: () => vibrate([12, 30, 12]),
  success: () => vibrate([20, 40, 20, 40, 40]),
  alarm: () => vibrate([200, 100, 200, 100, 300]),
}

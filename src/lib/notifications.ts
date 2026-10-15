export type NotifState = NotificationPermission | 'unsupported'

export function notificationState(): NotifState {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (notificationState() === 'unsupported') return false
  try {
    const res = await Notification.requestPermission()
    return res === 'granted'
  } catch {
    return false
  }
}

export async function showNotification(title: string, body: string, tag = 'rest'): Promise<void> {
  if (notificationState() !== 'granted') return
  try {
    const reg = await navigator.serviceWorker.ready
    const opts = {
      body,
      tag,
      renotify: true,
      vibrate: [200, 100, 200, 100, 300],
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    } as NotificationOptions
    await reg.showNotification(title, opts)
  } catch {
    /* no service worker (dev) or blocked */
  }
}

export async function clearNotification(tag = 'rest'): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready
    const list = await reg.getNotifications({ tag })
    list.forEach((n) => n.close())
  } catch {
    /* ignore */
  }
}

// Merciless service worker: web push for the daily summons (#16).
self.addEventListener('install', (e) => { self.skipWaiting() })
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()) })

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { data = {} }
  const title = data.title || 'Merciless'
  const body = data.body || 'Your reading is ready. Brace yourself.'
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    tag: data.tag || 'merciless-daily',
    data: { url: data.url || '/reading' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/reading'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) { if ('focus' in w) { w.navigate(url); return w.focus() } }
      return self.clients.openWindow(url)
    })
  )
})

// Service worker mínimo, solo para cumplir los criterios de instalabilidad
// de PWA (Chrome/Android exigen uno con un listener de "fetch"). No intenta
// dar soporte offline real: esta es una app autenticada con datos siempre
// cambiantes (partido en curso, temporada, mercado...), así que cachear
// respuestas dinámicas serviría datos obsoletos sin avisar. Solo se
// precachean el manifest y los iconos -- nada que pueda quedar desfasado
// de forma peligrosa.
const CACHE_NAME = "futbolrpg-v1"
const PRECACHE_URLS = ["/manifest.json", "/pwa-icon-192", "/pwa-icon-512"]

self.addEventListener("install", (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

// Siempre red primero; solo cae a caché (manifest/iconos precacheados) si
// la red falla del todo. Todo lo demás (páginas, API) nunca se sirve desde
// caché -- sin este service worker, un fallo de red ya daba error igual.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)))
})

// Notificaciones push: el servidor envía { title, body, url } y se muestra
// aunque la app esté cerrada.
self.addEventListener("push", (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data && event.data.text() } }
  event.waitUntil(
    self.registration.showNotification(data.title || "FutbolRPG", {
      body: data.body || "",
      icon: "/pwa-icon-192",
      badge: "/pwa-icon-192",
      data: { url: data.url || "/dashboard" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || "/dashboard"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) { c.navigate(url); return c.focus() }
      return self.clients.openWindow(url)
    })
  )
})

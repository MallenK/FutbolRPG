"use client"

import { useState } from "react"

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(padded)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label}: sin respuesta tras ${ms / 1000}s`)), ms)),
  ])
}

export default function TestPushPage() {
  const [log, setLog] = useState<string[]>([])
  const add = (m: string) => setLog((l) => [...l, m])

  async function getReg() {
    if (!("serviceWorker" in navigator)) throw new Error("Sin soporte de service worker")
    let reg = await navigator.serviceWorker.getRegistration()
    if (!reg) {
      add("Registrando service worker…")
      reg = await navigator.serviceWorker.register("/sw.js")
    }
    return withTimeout(navigator.serviceWorker.ready, 8000, "Service worker")
  }

  async function ensurePermission() {
    if (!("Notification" in window)) throw new Error("Este navegador no tiene Notification API")
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission()
    add(`Permiso: ${perm}`)
    if (perm !== "granted") throw new Error("Permiso no concedido")
  }

  // 1) Notificación local: no usa servidor ni push, solo comprueba que el dispositivo puede mostrarlas.
  async function testLocal() {
    setLog([])
    try {
      await ensurePermission()
      const reg = await getReg()
      add("Service worker listo ✅")
      await reg.showNotification("FutbolRPG ⚽", { body: "Notificación local de prueba", icon: "/pwa-icon-192" })
      add("Notificación local lanzada ✅ — ¿la ves? Si no, el problema es del sistema (ajustes de notificaciones del navegador/app)")
    } catch (e) {
      add(`❌ ${(e as Error).message}`)
    }
  }

  // 2) Push real desde el servidor.
  async function testPush() {
    setLog([])
    try {
      await ensurePermission()
      const reg = await getReg()
      add("Service worker listo ✅")
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!key) throw new Error("Falta la clave pública VAPID en el build")
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        add("Suscribiendo al servicio push…")
        sub = await withTimeout(
          reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }),
          15000,
          "Suscripción push"
        )
      }
      add(`Suscrito ✅ (${new URL(sub.endpoint).host})`)
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
      add(res.ok ? "Servidor envió el push ✅ — debería llegar en unos segundos" : `❌ Servidor ${res.status}: ${await res.text()}`)
    } catch (e) {
      add(`❌ ${(e as Error).message}`)
    }
  }

  // Limpia suscripción y service worker por si quedó algo roto de un intento anterior.
  async function reset() {
    setLog([])
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const r of regs) {
        await (await r.pushManager.getSubscription())?.unsubscribe()
        await r.unregister()
      }
      add(`Reiniciado (${regs.length} service worker eliminados). Recarga la página.`)
    } catch (e) {
      add(`❌ ${(e as Error).message}`)
    }
  }

  const btn = "w-full rounded px-4 py-3 font-semibold"
  return (
    <main className="mx-auto max-w-md space-y-3 p-6 text-white">
      <h1 className="text-xl font-bold">Prueba de notificaciones</h1>
      <button onClick={testLocal} className={`${btn} bg-blue-600`}>1. Notificación local (sin servidor)</button>
      <button onClick={testPush} className={`${btn} bg-green-600`}>2. Push desde el servidor</button>
      <button onClick={reset} className={`${btn} bg-gray-700`}>Reiniciar suscripción</button>
      <ul className="space-y-1 pt-2 text-sm">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </main>
  )
}

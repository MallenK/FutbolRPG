"use client"

import { useEffect } from "react"

export default function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin service worker la app sigue funcionando exactamente igual,
        // solo sin poder instalarse como PWA -- no es un error que mostrar.
      })
    }
  }, [])

  return null
}

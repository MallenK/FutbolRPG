"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "reducirMovimiento"

// Respeta prefers-reduced-motion del sistema operativo Y el override manual
// de la app (Ajustes > Preferencias), que se guarda en localStorage para
// efecto inmediato y en state.preferencias.reducirMovimiento (vía
// /api/player/profile) para que viaje entre dispositivos.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const stored = window.localStorage.getItem(STORAGE_KEY) === "true"

    const update = () => setReduced(media.matches || window.localStorage.getItem(STORAGE_KEY) === "true")
    update()

    media.addEventListener("change", update)
    window.addEventListener("storage", update)
    return () => {
      media.removeEventListener("change", update)
      window.removeEventListener("storage", update)
    }
  }, [])

  return reduced
}

export function setReducedMotionOverride(value: boolean) {
  window.localStorage.setItem(STORAGE_KEY, value ? "true" : "false")
  window.dispatchEvent(new Event("storage"))
}

export function getStoredReducedMotionOverride(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(STORAGE_KEY) === "true"
}

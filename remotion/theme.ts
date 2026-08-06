import { loadFont } from "@remotion/google-fonts/BebasNeue"

// Fuente única de verdad para las composiciones de loaders — mismos tokens que
// el resto del juego (tier-colors.ts, bg-gray-950), no una paleta inventada aparte.
export const COLORS = {
  bg: "#030712", // gray-950, fondo real de la app
  accent: "#4ade80", // verde, acento real de la app
  yellow: "#facc15",
  blue: "#60a5fa",
  orange: "#fb923c",
  red: "#ef4444",
} as const

export const CANVAS = { width: 400, height: 400 }
export const FPS = 30
export const LOOP_FRAMES = FPS * 2 // 2s, bucle perfecto

// Único sitio de toda la app con una fuente con personalidad — un "sting" de
// marca reservado a estos 2s, no una migración tipográfica del resto del juego.
export const { fontFamily: DISPLAY_FONT } = loadFont()

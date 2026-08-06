"use client"

import { useReducedMotion } from "@/lib/use-reduced-motion"

interface VideoLoaderProps {
  label: string
  variant?: "generic" | "dice" | "trophy" | "press"
  size?: number
}

// Bucle corto renderizado con Remotion (ver remotion/), sustituye el texto plano
// "Cargando..." que había antes. Cae al frame estático (mismo motivo, sin
// animación) si el usuario prefiere menos movimiento, ya sea por el SO o por
// el override manual de Ajustes > Preferencias (ver use-reduced-motion.ts).
export default function VideoLoader({ label, variant = "generic", size = 140 }: VideoLoaderProps) {
  const base = `/videos/loaders/${variant}`
  const reduced = useReducedMotion()

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {reduced ? (
        // eslint-disable-next-line @next/next/no-img-element -- static local asset, no responsive/optimization needs
        <img style={{ width: size, height: size }} src={`${base}-poster.png`} alt="" />
      ) : (
        <video
          style={{ width: size, height: size }}
          autoPlay
          muted
          loop
          playsInline
          poster={`${base}-poster.png`}
        >
          <source src={`${base}.webm`} type="video/webm" />
          <source src={`${base}.mp4`} type="video/mp4" />
        </video>
      )}
      <div className="text-gray-400">{label}</div>
    </div>
  )
}

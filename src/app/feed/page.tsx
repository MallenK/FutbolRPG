"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import VideoLoader from "@/components/VideoLoader"

// `/feed` se fusionó con `/leaderboard` en una única pantalla "Comunidad" con
// dos pestañas (Ranking / Actividad) — ambas son pantallas sociales de solo
// lectura sin ninguna tarea de sesión propia, así que no justificaban dos
// destinos separados en el nav principal (ver auditoría UX, Ronda 8). Este
// redirect solo existe para no romper enlaces o marcadores antiguos.
export default function FeedRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/leaderboard?tab=actividad")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <VideoLoader label="Redirigiendo..." />
    </div>
  )
}

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import VideoLoader from "@/components/VideoLoader"

// `/transfer` se fusionó dentro de `/mercado` (sección "Ofertas de tu club") —
// dos pantallas casi idénticas para "tengo una oferta de fichaje" (una para
// ofertas de club NPC, otra para ofertas reales de otros usuarios) generaban
// confusión de nombres sin aportar nada (ver informe-fallos.md, hallazgo C3,
// y la auditoría UX, Ronda 8). Este redirect solo existe para no romper
// enlaces o marcadores antiguos que apunten aquí.
export default function TransferRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/mercado")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <VideoLoader label="Redirigiendo al mercado..." />
    </div>
  )
}

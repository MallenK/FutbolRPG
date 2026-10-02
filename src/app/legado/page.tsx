"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { POSITION_LABELS } from "@/lib/player-config"
import TrophyShowcase from "@/components/TrophyShowcase"

type LegadoEntry = {
  id: string
  playerName: string
  apodo: string | null
  position: string
  nationality: string
  edadRetiro: number
  temporadas: number
  clubFinal: string
  divisionFinal: number
  nivelFinal: number
  reputacionFinal: number
  estadisticas: { partidosJugados: number; goles: number; asistencias: number }
  premios: string[]
  historialTemporadas: { temporada: number; club: string; premios: string[] }[]
  retiradoEn: string
}

export default function LegadoPage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [legado, setLegado] = useState<LegadoEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [hasPlayer, setHasPlayer] = useState<boolean | null>(null)
  const [retiroConfirmed, setRetiroConfirmed] = useState(false)
  const [retiroLoading, setRetiroLoading] = useState(false)

  // "Retirarse" es una decisión de carrera, no una preferencia de cuenta —
  // vivía en Ajustes, mezclada con seguridad y borrado de cuenta; se movió
  // aquí, su destino natural, ya que Legado es literalmente el archivo de
  // carreras retiradas (ver informe-fallos.md, Ronda 8).
  async function handleRetirar() {
    setRetiroLoading(true)
    const res = await fetch("/api/legado/retirar", { method: "POST" })
    if (res.ok) {
      setHasPlayer(false)
      setRetiroConfirmed(false)
      fetch("/api/legado").then((r) => r.json()).then((d) => setLegado(d.legado ?? []))
    }
    setRetiroLoading(false)
  }

  useEffect(() => {
    if (!isPending && !session) router.push("/login")
  }, [session, isPending, router])

  useEffect(() => {
    if (!session) return
    fetch("/api/legado")
      .then((r) => r.json())
      .then((d) => { setLegado(d.legado ?? []); setLoading(false) })
    fetch("/api/player")
      .then((r) => r.json())
      .then((d) => setHasPlayer(!!d.player))
  }, [session])

  if (isPending || loading) {
    return <main className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-500">Cargando...</main>
  }
  if (!session) return null

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Perfil
          </button>
          <h1 className="text-2xl font-black">
            Futbol<span className="text-green-400">RPG</span>
            <span className="text-gray-400 font-normal text-lg ml-2">· Legado</span>
          </h1>
        </div>
        <p className="text-gray-500 text-sm">Tus leyendas retiradas — cada carrera que cerraste queda archivada aquí para siempre.</p>

        {hasPlayer === false && (
          <button
            onClick={() => router.push("/create-player")}
            className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors"
          >
            Crear un jugador nuevo →
          </button>
        )}

        {hasPlayer === true && (
          <div className="bg-gray-900 rounded-2xl border border-orange-900/40 p-6">
            <h3 className="text-orange-400 font-bold text-sm mb-2">Retirarte de tu carrera actual</h3>
            <p className="text-gray-500 text-xs mb-3">
              Cierra tu carrera actual para siempre y pásala a este archivo. Después podrás crear un jugador nuevo.
              Tus estadísticas y premios quedan guardados, pero la carrera actual no se puede recuperar.
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={retiroConfirmed}
                onChange={(e) => setRetiroConfirmed(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              Entiendo que esta carrera terminará
            </label>
            <button
              onClick={handleRetirar}
              disabled={!retiroConfirmed || retiroLoading}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-bold text-sm rounded-lg transition-colors"
            >
              {retiroLoading ? "Retirando..." : "Retirarme y empezar de nuevo"}
            </button>
          </div>
        )}

        {legado.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-10 text-center text-gray-500">
            Todavía no te has retirado de ninguna carrera. Cuando lo hagas, quedará aquí para siempre.
          </div>
        ) : (
          <div className="space-y-4">
            {legado.map((l) => (
              <div key={l.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black">
                      {l.apodo ? `"${l.apodo}"` : l.playerName}
                    </h2>
                    <p className="text-gray-500 text-sm">
                      {POSITION_LABELS[l.position as keyof typeof POSITION_LABELS] ?? l.position} · {l.nationality} · Retirado a los {l.edadRetiro} años
                    </p>
                    <p className="text-green-400 text-sm mt-0.5 font-semibold">{l.clubFinal} · {l.temporadas} temporadas</p>
                  </div>
                  <span className="text-xs text-gray-600 font-mono shrink-0">
                    {new Date(l.retiradoEn).toLocaleDateString("es-ES")}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Nivel", value: l.nivelFinal },
                    { label: "Reputación", value: l.reputacionFinal },
                    { label: "Partidos", value: l.estadisticas.partidosJugados },
                    { label: "Goles", value: l.estadisticas.goles },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
                      <p className="text-xl font-black">{value}</p>
                      <p className="text-gray-500 text-xs mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                <TrophyShowcase historial={l.historialTemporadas} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

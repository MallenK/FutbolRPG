"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { POSITION_LABELS } from "@/lib/player-config"

type Stats = {
  playerId: string
  playerName: string
  apodo?: string
  position: string
  club: string
  level: number
  reputacion: number
  temporada: number
  golesTotales: number
  asistenciasTotales: number
  partidosTotales: number
  trofeos: number
}

type CompareResponse = {
  me: Stats
  other: Stats | null
  otherHidden: boolean
  isSelf: boolean
  isRival: boolean
  error?: string
}

const FILAS: { label: string; key: keyof Stats }[] = [
  { label: "Nivel", key: "level" },
  { label: "Reputación", key: "reputacion" },
  { label: "Temporadas", key: "temporada" },
  { label: "Goles", key: "golesTotales" },
  { label: "Asistencias", key: "asistenciasTotales" },
  { label: "Partidos", key: "partidosTotales" },
  { label: "Trofeos", key: "trofeos" },
]

function nombreMostrado(s: Stats): string {
  return s.apodo ? `"${s.apodo}"` : s.playerName
}

export default function CompararPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { data: session, isPending } = useSession()
  const [data, setData] = useState<CompareResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [savingRival, setSavingRival] = useState(false)

  useEffect(() => {
    if (!isPending && !session) router.push("/login")
  }, [session, isPending, router])

  useEffect(() => {
    if (!session || !params.id) return
    fetch(`/api/comparar/${params.id}`)
      .then(async (r) => {
        if (!r.ok) { setNotFound(true); return null }
        return r.json()
      })
      .then((d) => { if (d) setData(d); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [session, params.id])

  const handleToggleRival = async () => {
    if (!data) return
    setSavingRival(true)
    const nuevoRivalId = data.isRival ? null : (params.id as string)
    const res = await fetch("/api/rival", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rivalId: nuevoRivalId }),
    })
    if (res.ok) setData({ ...data, isRival: !!nuevoRivalId })
    setSavingRival(false)
  }

  if (isPending || loading) {
    return <main className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-500">Cargando...</main>
  }
  if (!session) return null

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/leaderboard")} className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Volver al ranking
          </button>
          <h1 className="text-2xl font-black">
            Futbol<span className="text-green-400">RPG</span>
            <span className="text-gray-400 font-normal text-lg ml-2">· Comparativa</span>
          </h1>
        </div>

        {notFound && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-10 text-center text-gray-500">
            Jugador no encontrado.
          </div>
        )}

        {data?.otherHidden && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-10 text-center text-gray-500">
            Este jugador ha ocultado su perfil público — no se puede comparar.
          </div>
        )}

        {data?.other && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[data.me, data.other].map((s, i) => (
                <div key={i} className="bg-gray-900 rounded-2xl border border-gray-800 p-5 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{i === 0 ? "Tú" : "Rival"}</p>
                  <p className="font-black text-lg">{nombreMostrado(s)}</p>
                  <p className="text-gray-500 text-xs">
                    {POSITION_LABELS[s.position as keyof typeof POSITION_LABELS] ?? s.position} · {s.club}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 divide-y divide-gray-800">
              {FILAS.map(({ label, key }) => {
                const meVal = data.me[key] as number
                const otherVal = data.other![key] as number
                return (
                  <div key={key} className="flex items-center justify-between px-5 py-3">
                    <span className={`font-mono font-bold w-16 text-left ${meVal > otherVal ? "text-green-400" : meVal < otherVal ? "text-gray-600" : "text-gray-300"}`}>
                      {meVal}
                    </span>
                    <span className="text-gray-500 text-xs uppercase tracking-wider">{label}</span>
                    <span className={`font-mono font-bold w-16 text-right ${otherVal > meVal ? "text-red-400" : otherVal < meVal ? "text-gray-600" : "text-gray-300"}`}>
                      {otherVal}
                    </span>
                  </div>
                )
              })}
            </div>

            {!data.isSelf && (
              <button
                onClick={handleToggleRival}
                disabled={savingRival}
                className={`w-full py-3 rounded-xl font-bold transition-colors ${
                  data.isRival
                    ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    : "bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20"
                }`}
              >
                {data.isRival ? "Quitar como rival" : "🥊 Marcar como mi rival"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const POSITION_LABELS: Record<string, string> = {
  GK: "POR", CB: "DFC", FB: "LAT",
  CM: "MC", AM: "MP", W: "EXT", ST: "DEL",
}

type MatchData = {
  goles: number
  asistencias: number
  valoracion: number
  marcador: string
  rival: string
  leveled: boolean
  newLevel: number
}

type SeasonEndData = {
  temporada: number
  goles: number
  asistencias: number
  valoracionMedia: number
  premios: string[]
  rolAnterior: string
  rolNuevo: string
  subioRol: boolean
}

type TransferData = {
  fromClub: string
  toClub: string
  offeredBy: string
}

type FeedEntry = {
  id: string
  playerName: string
  playerPosition: string
  clubName: string
  eventType: "match" | "season_end" | "transfer"
  data: MatchData | SeasonEndData | TransferData
  createdAt: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "ahora mismo"
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

function MatchCard({ entry }: { entry: FeedEntry }) {
  const d = entry.data as MatchData
  const rating = d.valoracion ?? 6.0
  const ratingColor = rating >= 7.5 ? "text-green-400" : rating >= 6.0 ? "text-blue-400" : "text-orange-400"

  return (
    <div className="flex items-start gap-4 px-5 py-4">
      <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-xs font-bold text-gray-400">
          {POSITION_LABELS[entry.playerPosition] ?? entry.playerPosition}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">
          <span className="font-bold">{entry.playerName}</span>
          <span className="text-gray-400"> jugó contra </span>
          <span className="font-semibold text-gray-200">{d.rival}</span>
        </p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-xs bg-gray-800 px-2 py-0.5 rounded font-mono text-gray-300">
            {d.marcador}
          </span>
          {d.goles > 0 && (
            <span className="text-xs text-green-400 font-semibold">
              {d.goles} gol{d.goles !== 1 ? "es" : ""}
            </span>
          )}
          {d.asistencias > 0 && (
            <span className="text-xs text-blue-400 font-semibold">
              {d.asistencias} asist{d.asistencias !== 1 ? "encias" : "encia"}
            </span>
          )}
          <span className={`text-xs font-bold ${ratingColor}`}>
            {rating.toFixed(1)}
          </span>
          {d.leveled && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded font-bold">
              ↑ Nivel {d.newLevel}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-1">{entry.clubName} · {timeAgo(entry.createdAt)}</p>
      </div>
    </div>
  )
}

function TransferCard({ entry }: { entry: FeedEntry }) {
  const d = entry.data as TransferData
  return (
    <div className="flex items-start gap-4 px-5 py-4 bg-yellow-500/5">
      <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-lg">✈️</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">
          <span className="font-bold">{entry.playerName}</span>
          <span className="text-gray-400"> se transfiere a </span>
          <span className="font-semibold text-yellow-300">{d.toClub}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Viene de {d.fromClub} · Oferta de {d.offeredBy}
        </p>
        <p className="text-xs text-gray-600 mt-0.5">{timeAgo(entry.createdAt)}</p>
      </div>
    </div>
  )
}

function SeasonEndCard({ entry }: { entry: FeedEntry }) {
  const d = entry.data as SeasonEndData

  return (
    <div className="flex items-start gap-4 px-5 py-4 bg-green-500/5">
      <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-lg">🏆</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">
          <span className="font-bold">{entry.playerName}</span>
          <span className="text-gray-400"> terminó la </span>
          <span className="font-semibold text-gray-200">Temporada {d.temporada}</span>
          {d.subioRol && (
            <span className="text-green-400 font-bold"> · Ascendido a {d.rolNuevo}</span>
          )}
        </p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-xs text-gray-400">{d.goles}G {d.asistencias}A</span>
          <span className="text-xs text-gray-400">{d.valoracionMedia.toFixed(1)} media</span>
          {d.premios.map((p) => (
            <span key={p} className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded">
              {p}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-1">{entry.clubName} · {timeAgo(entry.createdAt)}</p>
      </div>
    </div>
  )
}

export default function FeedPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<FeedEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/feed")
      .then((r) => r.json())
      .then(({ entries }) => { setEntries(entries ?? []); setLoading(false) })
  }, [])

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-black">
            Futbol<span className="text-green-400">RPG</span>
            <span className="text-gray-400 font-normal text-lg ml-2">· Actividad</span>
          </h1>
        </div>

        {/* Feed */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-500">Cargando actividad...</div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-500">Aún no hay actividad.</p>
              <p className="text-gray-600 text-sm mt-2">Juega un partido para aparecer aquí.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {entries.map((e) =>
                e.eventType === "transfer" ? (
                  <TransferCard key={e.id} entry={e} />
                ) : e.eventType === "season_end" ? (
                  <SeasonEndCard key={e.id} entry={e} />
                ) : (
                  <MatchCard key={e.id} entry={e} />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

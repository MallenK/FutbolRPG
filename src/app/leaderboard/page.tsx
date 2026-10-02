"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "@/lib/auth-client"

const POSITION_LABELS: Record<string, string> = {
  GK: "POR", CB: "DFC", FB: "LAT",
  CM: "MC", AM: "MP", W: "EXT", ST: "DEL",
}

type Category = "gloria" | "level" | "reputation" | "seasons"

type LeaderboardEntry = {
  rank: number
  playerId: string
  playerName: string
  userName: string
  position: string
  club: string
  level: number
  reputation: number
  seasons: number
  goals: number
  gloria: number
  trophies: number
}

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "gloria", label: "Gloria" },
  { id: "level", label: "Nivel" },
  { id: "reputation", label: "Reputación" },
  { id: "seasons", label: "Temporadas" },
]

// Gloria y Goles se muestran siempre (son las dos métricas más "de mérito de
// carrera"); la tercera columna cambia según la pestaña activa.
function terceraColumna(category: Category, e: LeaderboardEntry) {
  if (category === "level") return { label: "nivel", value: `Nv.${e.level}`, color: "text-white" }
  if (category === "reputation") return { label: "rep", value: e.reputation, color: "text-white" }
  if (category === "seasons") return { label: "temp", value: e.seasons, color: "text-white" }
  return { label: "trofeos", value: e.trophies, color: "text-white" }
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-black text-lg">1°</span>
  if (rank === 2) return <span className="text-gray-300 font-black text-lg">2°</span>
  if (rank === 3) return <span className="text-amber-600 font-black text-lg">3°</span>
  return <span className="text-gray-600 font-mono text-sm w-6 text-right">{rank}</span>
}

function RankingTab() {
  const router = useRouter()
  const [category, setCategory] = useState<Category>("gloria")
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/leaderboard?category=${category}`)
      .then((r) => r.json())
      .then(({ entries }) => { setEntries(entries ?? []); setLoading(false) })
  }, [category])

  return (
    <div>
      {/* Category tabs */}
      <div className="flex gap-2 mb-2">
        {CATEGORIES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setCategory(id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              category === id ? "bg-green-500 text-black" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-gray-600 text-xs mb-4 h-4">
        {category === "gloria" && "Gloria combina títulos (más valor en divisiones humildes), ascensos, prestigio con la Selección y reputación."}
      </p>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-500">Cargando ranking...</div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-gray-500">Aún no hay jugadores registrados.</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {entries.map((e) => (
              <button
                key={e.rank}
                onClick={() => router.push(`/comparar/${e.playerId}`)}
                className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-800/70 transition-colors ${
                  e.rank <= 3 ? "bg-gray-800/50" : ""
                }`}
              >
                <div className="w-8 text-center shrink-0">
                  <RankBadge rank={e.rank} />
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-green-400">
                    {POSITION_LABELS[e.position] ?? e.position}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{e.playerName}</p>
                  <p className="text-xs text-gray-500 truncate">{e.userName} · {e.club}</p>
                </div>
                <div className="flex gap-4 shrink-0 text-right">
                  <div>
                    <p className="text-yellow-400 font-bold font-mono">{e.gloria}</p>
                    <p className="text-gray-600 text-xs">gloria</p>
                  </div>
                  <div>
                    <p className="text-blue-400 font-bold font-mono">{e.goals}</p>
                    <p className="text-gray-600 text-xs">goles</p>
                  </div>
                  <div>
                    <p className={`font-bold font-mono ${terceraColumna(category, e).color}`}>
                      {terceraColumna(category, e).value}
                    </p>
                    <p className="text-gray-600 text-xs">{terceraColumna(category, e).label}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Actividad (antes /feed, fusionado aquí como segunda pestaña de
// "Comunidad" — ambas son pantallas sociales de solo lectura, sin ninguna
// tarea de sesión propia entre las 5 frecuentes de la auditoría UX, así que
// no justifican dos destinos separados en el nav principal. Ver
// informe-fallos.md, Ronda 8.) ────────────────────────────────────────────

type MatchData = {
  goles: number; asistencias: number; valoracion: number; marcador: string
  rival: string; leveled: boolean; newLevel: number
}
type SeasonEndData = {
  temporada: number; goles: number; asistencias: number; valoracionMedia: number
  premios: string[]; rolAnterior: string; rolNuevo: string; subioRol: boolean
}
type TransferData = { fromClub: string; toClub: string; offeredBy: string }
type FeedEntry = {
  id: string; playerName: string; playerPosition: string; clubName: string
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
        <span className="text-xs font-bold text-gray-400">{POSITION_LABELS[entry.playerPosition] ?? entry.playerPosition}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">
          <span className="font-bold">{entry.playerName}</span>
          <span className="text-gray-400"> jugó contra </span>
          <span className="font-semibold text-gray-200">{d.rival}</span>
        </p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-xs bg-gray-800 px-2 py-0.5 rounded font-mono text-gray-300">{d.marcador}</span>
          {d.goles > 0 && <span className="text-xs text-green-400 font-semibold">{d.goles} gol{d.goles !== 1 ? "es" : ""}</span>}
          {d.asistencias > 0 && <span className="text-xs text-blue-400 font-semibold">{d.asistencias} asist{d.asistencias !== 1 ? "encias" : "encia"}</span>}
          <span className={`text-xs font-bold ${ratingColor}`}>{rating.toFixed(1)}</span>
          {d.leveled && <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded font-bold">↑ Nivel {d.newLevel}</span>}
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
        <p className="text-xs text-gray-500 mt-1">Viene de {d.fromClub} · Oferta de {d.offeredBy}</p>
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
          {d.subioRol && <span className="text-green-400 font-bold"> · Ascendido a {d.rolNuevo}</span>}
        </p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-xs text-gray-400">{d.goles}G {d.asistencias}A</span>
          <span className="text-xs text-gray-400">{d.valoracionMedia.toFixed(1)} media</span>
          {d.premios.map((p) => (
            <span key={p} className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded">{p}</span>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-1">{entry.clubName} · {timeAgo(entry.createdAt)}</p>
      </div>
    </div>
  )
}

function ActividadTab() {
  const [entries, setEntries] = useState<FeedEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/feed")
      .then((r) => r.json())
      .then(({ entries }) => { setEntries(entries ?? []); setLoading(false) })
  }, [])

  return (
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
            e.eventType === "transfer" ? <TransferCard key={e.id} entry={e} />
            : e.eventType === "season_end" ? <SeasonEndCard key={e.id} entry={e} />
            : <MatchCard key={e.id} entry={e} />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Página combinada ─────────────────────────────────────────────────────

function ComunidadPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, isPending } = useSession()

  const initialTab = searchParams.get("tab") === "actividad" ? "actividad" : "ranking"
  const [tab, setTab] = useState<"ranking" | "actividad">(initialTab)

  // Ranking y actividad son las únicas páginas sociales de la app -- un
  // invitado (isAnonymous, ver auth.ts) no cuenta como "cuenta creada", así
  // que se le manda a login igual que a quien no tiene sesión.
  useEffect(() => {
    if (isPending) return
    if (!session || session.user.isAnonymous) router.push("/login")
  }, [session, isPending, router])

  if (isPending || !session || session.user.isAnonymous) return null

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Perfil
          </button>
          <h1 className="text-2xl font-black">
            Futbol<span className="text-green-400">RPG</span>
            <span className="text-gray-400 font-normal text-lg ml-2">· Comunidad</span>
          </h1>
        </div>

        {/* Ranking / Actividad */}
        <div className="flex gap-2 mb-6 border-b border-gray-800 pb-4">
          {([
            { id: "ranking" as const, label: "Ranking" },
            { id: "actividad" as const, label: "Actividad" },
          ]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                tab === id ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "ranking" ? <RankingTab /> : <ActividadTab />}
      </div>
    </main>
  )
}

export default function ComunidadPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-950" />}>
      <ComunidadPageInner />
    </Suspense>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const POSITION_LABELS: Record<string, string> = {
  GK: "POR", CB: "DFC", FB: "LAT",
  CM: "MC", AM: "MP", W: "EXT", ST: "DEL",
}

type Category = "level" | "reputation" | "seasons"

type LeaderboardEntry = {
  rank: number
  playerName: string
  userName: string
  position: string
  club: string
  level: number
  reputation: number
  seasons: number
  goals: number
}

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "level", label: "Nivel" },
  { id: "reputation", label: "Reputación" },
  { id: "seasons", label: "Temporadas" },
]

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-black text-lg">1°</span>
  if (rank === 2) return <span className="text-gray-300 font-black text-lg">2°</span>
  if (rank === 3) return <span className="text-amber-600 font-black text-lg">3°</span>
  return <span className="text-gray-600 font-mono text-sm w-6 text-right">{rank}</span>
}

export default function LeaderboardPage() {
  const router = useRouter()
  const [category, setCategory] = useState<Category>("level")
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/leaderboard?category=${category}`)
      .then((r) => r.json())
      .then(({ entries }) => { setEntries(entries ?? []); setLoading(false) })
  }, [category])

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
            <span className="text-gray-400 font-normal text-lg ml-2">· Ranking</span>
          </h1>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-6">
          {CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                category === id
                  ? "bg-green-500 text-black"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-500">Cargando ranking...</div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              Aún no hay jugadores registrados.
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {entries.map((e) => (
                <div
                  key={e.rank}
                  className={`flex items-center gap-4 px-5 py-4 ${
                    e.rank <= 3 ? "bg-gray-800/50" : ""
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    <RankBadge rank={e.rank} />
                  </div>

                  {/* Position badge */}
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-green-400">
                      {POSITION_LABELS[e.position] ?? e.position}
                    </span>
                  </div>

                  {/* Name + club */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{e.playerName}</p>
                    <p className="text-xs text-gray-500 truncate">{e.userName} · {e.club}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 shrink-0 text-right">
                    <div>
                      <p className="text-white font-bold font-mono">Nv.{e.level}</p>
                      <p className="text-gray-600 text-xs">nivel</p>
                    </div>
                    <div>
                      <p className="text-green-400 font-bold font-mono">{e.reputation}</p>
                      <p className="text-gray-600 text-xs">rep</p>
                    </div>
                    <div>
                      <p className="text-blue-400 font-bold font-mono">{e.seasons}</p>
                      <p className="text-gray-600 text-xs">temp</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

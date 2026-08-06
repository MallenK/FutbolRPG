"use client"

import { useSession, signOut } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import StatBar from "@/components/StatBar"
import XPBar from "@/components/XPBar"
import VideoLoader from "@/components/VideoLoader"
import { POSITION_STAT_PROFILES, STAT_BY_KEY, PERSONALITIES, TRAITS, ORIGINS, type Position } from "@/lib/player-config"
import { getDivisionInfo } from "@/lib/world"

type SimpleMatch = { valoracion: number; goles: number; asistencias: number; marcador: string }

type PlayerData = {
  id: string
  name: string
  position: string
  nationality: string
  age: number
  attributes: {
    tecnicos: Record<string, number>
    fisicos: Record<string, number>
    tacticos: Record<string, number>
    mentales: Record<string, number>
  }
  state: {
    fatiga: number
    forma: number
    moral: number
    xp: number
    level: number
    attributePoints: number
    origen?: string
    personalidad?: string
    estiloJuego?: string
    traits?: string[]
    potencial?: number
    piernaDominante?: string
    altura?: number
    peso?: number
    apodo?: string
    dorsal?: number
    carrera: {
      club: string
      liga?: string
      divisionActual?: number
      rol: string
      temporada: number
      reputacion?: number
      estadisticasTemporada: {
        partidosJugados: number
        goles: number
        asistencias: number
        valoracionMedia: number
      }
      ultimosPartidos?: SimpleMatch[]
      contrato?: { temporadasRestantes: number; salarioRelativo: number }
      seleccion?: { convocado: boolean; capas: number; golesSeleccion: number }
      mercado?: { ofertasActivas: unknown[] }
    }
  }
}

const POSITION_LABELS: Record<string, string> = {
  GK: "Portero", CB: "Def. Central", FB: "Lateral",
  CM: "Mediocentro", AM: "Mediapunta", W: "Extremo", ST: "Delantero",
}

const ALL_STAT_GROUPS = [
  { label: "Técnico", group: "tecnicos" as const, stats: ["control", "pase", "tiro", "regate", "cabeceo", "centros", "entradas", "reflejos"] },
  { label: "Físico", group: "fisicos" as const, stats: ["resistencia", "velocidad", "aceleracion", "fuerza", "salto", "agilidad"] },
  { label: "Táctico", group: "tacticos" as const, stats: ["posicionamiento", "vision", "decisiones", "presion_alta", "colocacion"] },
  { label: "Mental", group: "mentales" as const, stats: ["disciplina", "confianza", "presion", "liderazgo", "concentracion", "ambicion"] },
]

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return (
    <p className="text-gray-600 text-xs text-center py-4">Juega partidos para ver tu progresión</p>
  )
  const W = 300; const H = 50
  const min = 1; const max = 10; const range = max - min
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / range) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#22c55e" strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * W
        const y = H - ((v - min) / range) * H
        const fill = v >= 7 ? "#22c55e" : v >= 5.5 ? "#60a5fa" : "#f97316"
        return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.5" fill={fill} />
      })}
    </svg>
  )
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [player, setPlayer] = useState<PlayerData | null>(null)
  const [loadingPlayer, setLoadingPlayer] = useState(true)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const [pendingOffers, setPendingOffers] = useState(0)
  const [pendingMarketOffers, setPendingMarketOffers] = useState(0)

  useEffect(() => {
    if (!isPending && !session) router.push("/login")
  }, [session, isPending, router])

  useEffect(() => {
    if (!session) return
    fetch("/api/player")
      .then((r) => r.json())
      .then(({ player: p }) => {
        setPlayer(p ?? null)
        setLoadingPlayer(false)
        const offers = p?.state?.carrera?.mercado?.ofertasActivas ?? []
        setPendingOffers(offers.length)
      })
    // Ofertas reales de otros usuarios (sistema separado de las de arriba,
    // ver informe-fallos.md C3) — sin esto, nunca se avisa de que existen.
    fetch("/api/market")
      .then((r) => r.json())
      .then((data) => setPendingMarketOffers(data?.myOfferCount ?? 0))
      .catch(() => {})
  }, [session])

  const handleUpgrade = async (stat: string, group: keyof PlayerData["attributes"]) => {
    if (!player || upgrading) return
    setUpgrading(stat)
    setUpgradeError(null)
    try {
      const res = await fetch("/api/player/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stat }),
      })
      if (!res.ok) {
        setUpgradeError("No se pudo mejorar el atributo. Inténtalo de nuevo.")
        return
      }
      const { newValue } = await res.json()
      setPlayer((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          attributes: {
            ...prev.attributes,
            [group]: { ...prev.attributes[group], [stat]: newValue },
          },
          state: { ...prev.state, attributePoints: prev.state.attributePoints - 1 },
        }
      })
    } catch {
      setUpgradeError("No se pudo mejorar el atributo. Comprueba tu conexión e inténtalo de nuevo.")
    } finally {
      setUpgrading(null)
    }
  }

  if (isPending || loadingPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <VideoLoader label="Cargando..." />
      </div>
    )
  }

  if (!session) return null

  const ultimosPartidos = player?.state.carrera.ultimosPartidos ?? []
  const attrPoints = player?.state.attributePoints ?? 0

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black">
            Futbol<span className="text-green-400">RPG</span>
          </h1>
          <div className="flex items-center gap-3">
            {pendingMarketOffers > 0 && (
              <button
                onClick={() => router.push("/mercado")}
                className="relative flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-xs font-bold transition-colors hover:bg-green-500/20"
              >
                {pendingMarketOffers} oferta{pendingMarketOffers > 1 ? "s" : ""} de mercado
              </button>
            )}
            {pendingOffers > 0 && (
              <button
                onClick={() => router.push("/transfer")}
                className="relative flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs font-bold transition-colors hover:bg-yellow-500/20"
              >
                {pendingOffers} oferta{pendingOffers > 1 ? "s" : ""} de club
              </button>
            )}
            <button
              onClick={() => signOut().then(() => router.push("/"))}
              className="text-gray-500 hover:text-white text-sm transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        {!player ? (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-10 text-center">
            <p className="text-gray-400 mb-2">Bienvenido, {session.user.name}</p>
            <p className="text-gray-500 mb-8">Aún no tienes un jugador creado. Empieza tu carrera ahora.</p>
            <button
              onClick={() => router.push("/create-player")}
              className="px-8 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition-colors"
            >
              Crear mi jugador
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Player card */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center shrink-0">
                    <span className="text-xl font-black text-green-400">{player.position}</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">
                      {player.state.apodo ? `"${player.state.apodo}"` : player.name}
                      {player.state.dorsal && <span className="text-gray-500 text-base font-mono ml-2">#{player.state.dorsal}</span>}
                    </h2>
                    {player.state.apodo && <p className="text-gray-500 text-xs -mt-0.5">{player.name}</p>}
                    <p className="text-gray-400 text-sm">
                      {POSITION_LABELS[player.position]} · {player.nationality} · {player.age} años
                    </p>
                    <p className="text-green-400 text-sm mt-0.5 font-semibold">
                      {player.state.carrera.club} · {player.state.carrera.rol}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/season")}
                  className="w-full sm:w-auto px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors shrink-0"
                >
                  Ver temporada →
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-800">
                <XPBar level={player.state.level ?? 1} xp={player.state.xp ?? 0} />
              </div>
            </div>

            {/* Attribute points banner */}
            {attrPoints > 0 && (
              <button
                onClick={() => setShowUpgrade((v) => !v)}
                className="w-full bg-green-500/10 border border-green-500/40 rounded-2xl px-6 py-4
                  flex items-center justify-between hover:bg-green-500/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-green-400">{attrPoints}</span>
                  <span className="text-green-300 font-semibold">
                    punto{attrPoints !== 1 ? "s" : ""} de mejora disponible{attrPoints !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-green-400 text-sm font-bold">
                  {showUpgrade ? "Cerrar ↑" : "Mejorar →"}
                </span>
              </button>
            )}

            {/* Upgrade panel */}
            {showUpgrade && attrPoints > 0 && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white">Mejora de atributos</h3>
                  <span className="text-green-400 font-mono font-bold text-sm">{attrPoints} puntos</span>
                </div>
                {upgradeError && <p className="text-red-400 text-xs">{upgradeError}</p>}
                {/* Show primary stats for position first */}
                {(() => {
                  const posProfile = POSITION_STAT_PROFILES[player.position as Position]
                  return posProfile ? (
                    <>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Principales</p>
                        <div className="space-y-2">
                          {posProfile.primary.map((statKey) => {
                            const statDef = STAT_BY_KEY[statKey]
                            const groupKey = statDef.group
                            const value = player.attributes[groupKey]?.[statKey] ?? 50
                            return (
                              <div key={statKey} className="flex items-center gap-3">
                                <span className="text-gray-200 text-sm w-28 shrink-0">{statDef.label}</span>
                                <div className="flex-1"><StatBar value={value} size="sm" showValue={false} /></div>
                                <span className="text-white font-mono font-bold text-sm w-8 text-right">{value}</span>
                                <button
                                  onClick={() => handleUpgrade(statKey, groupKey)}
                                  disabled={!!upgrading || value >= 99}
                                  className="w-8 h-8 rounded-lg bg-green-500/20 hover:bg-green-500/40 border border-green-500/40 text-green-400 font-bold text-sm flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  {upgrading === statKey ? "…" : "+1"}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Secundarios</p>
                        <div className="space-y-2">
                          {posProfile.secondary.map((statKey) => {
                            const statDef = STAT_BY_KEY[statKey]
                            const groupKey = statDef.group
                            const value = player.attributes[groupKey]?.[statKey] ?? 50
                            return (
                              <div key={statKey} className="flex items-center gap-3">
                                <span className="text-gray-400 text-sm w-28 shrink-0">{statDef.label}</span>
                                <div className="flex-1"><StatBar value={value} size="sm" showValue={false} /></div>
                                <span className="text-gray-300 font-mono text-sm w-8 text-right">{value}</span>
                                <button
                                  onClick={() => handleUpgrade(statKey, groupKey)}
                                  disabled={!!upgrading || value >= 99}
                                  className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 font-bold text-sm flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  {upgrading === statKey ? "…" : "+1"}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    ALL_STAT_GROUPS.map(({ label, group, stats }) => (
                      <div key={group}>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</p>
                        <div className="space-y-2">
                          {stats.map((stat) => {
                            const value = player.attributes[group]?.[stat] ?? 50
                            return (
                              <div key={stat} className="flex items-center gap-3">
                                <span className="text-gray-300 text-sm w-28 shrink-0">{STAT_BY_KEY[stat as keyof typeof STAT_BY_KEY]?.label ?? stat}</span>
                                <div className="flex-1"><StatBar value={value} size="sm" showValue={false} /></div>
                                <span className="text-white font-mono font-bold text-sm w-8 text-right">{value}</span>
                                <button onClick={() => handleUpgrade(stat, group)} disabled={!!upgrading || value >= 99}
                                  className="w-8 h-8 rounded-lg bg-green-500/20 hover:bg-green-500/40 border border-green-500/40 text-green-400 font-bold text-sm flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                  {upgrading === stat ? "…" : "+1"}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )
                })()}
              </div>
            )}

            {/* Contract + Selection quick info */}
            {player && (player.state.carrera.contrato || player.state.carrera.seleccion?.convocado) && (
              <div className="grid grid-cols-2 gap-3">
                {player.state.carrera.contrato && (
                  <div className={`rounded-xl border p-4 ${
                    player.state.carrera.contrato.temporadasRestantes <= 1
                      ? "bg-orange-500/10 border-orange-500/30"
                      : "bg-gray-900 border-gray-800"
                  }`}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                      player.state.carrera.contrato.temporadasRestantes <= 1 ? "text-orange-400" : "text-gray-500"
                    }`}>Contrato</p>
                    <p className="text-white font-black text-xl">
                      {player.state.carrera.contrato.temporadasRestantes}
                    </p>
                    <p className="text-gray-500 text-xs">
                      temporada{player.state.carrera.contrato.temporadasRestantes !== 1 ? "s" : ""} restante{player.state.carrera.contrato.temporadasRestantes !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
                {player.state.carrera.seleccion?.convocado && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-wider mb-1 text-red-400">Selección</p>
                    <p className="text-white font-black text-xl">{player.state.carrera.seleccion.capas}</p>
                    <p className="text-gray-500 text-xs">
                      internacionales · {player.state.carrera.seleccion.golesSeleccion}G
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Season stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Partidos", value: player.state.carrera.estadisticasTemporada.partidosJugados },
                { label: "Goles", value: player.state.carrera.estadisticasTemporada.goles },
                { label: "Asistencias", value: player.state.carrera.estadisticasTemporada.asistencias },
                { label: "Valoración", value: player.state.carrera.estadisticasTemporada.valoracionMedia.toFixed(1) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="text-gray-500 text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Recent form chart */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Forma reciente</h3>
                  {ultimosPartidos.length > 0 && (
                    <span className="text-xs text-gray-600 font-mono">
                      últimos {ultimosPartidos.length} partidos
                    </span>
                  )}
                </div>
                <Sparkline data={ultimosPartidos.map((m) => m.valoracion)} />
                {ultimosPartidos.length > 0 && (
                  <div className="flex justify-between mt-2 px-1">
                    {ultimosPartidos.slice(-5).map((m, i) => (
                      <div key={i} className="text-center">
                        <p className={`text-xs font-bold ${m.valoracion >= 7 ? "text-green-400" : m.valoracion >= 5.5 ? "text-blue-400" : "text-orange-400"}`}>
                          {m.valoracion.toFixed(1)}
                        </p>
                        <p className="text-gray-700 text-xs">{m.marcador}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Estado + top stats */}
              <div className="space-y-4">
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</h3>
                  {[
                    { label: "Forma", value: player.state.forma },
                    { label: "Moral", value: player.state.moral },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm w-14">{label}</span>
                      <div className="flex-1"><StatBar value={value} size="sm" showValue={false} /></div>
                      <span className="text-white font-mono text-sm w-8 text-right">{value}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-14">Fatiga</span>
                    <div className="flex-1">
                      <StatBar
                        value={player.state.fatiga}
                        size="sm"
                        showValue={false}
                        color={player.state.fatiga > 70 ? "red" : player.state.fatiga > 40 ? "yellow" : "green"}
                      />
                    </div>
                    <span className="text-white font-mono text-sm w-8 text-right">{player.state.fatiga}</span>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Top atributos</h3>
                  {Object.entries({ ...player.attributes.tecnicos, ...player.attributes.fisicos, ...player.attributes.tacticos })
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 4)
                    .map(([key, value]) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm w-28 truncate">{STAT_BY_KEY[key as keyof typeof STAT_BY_KEY]?.label ?? key}</span>
                        <div className="flex-1"><StatBar value={value} size="sm" showValue={false} /></div>
                        <span className="text-white font-mono text-sm w-8 text-right">{value}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

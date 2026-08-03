"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { type CareerEvent, type OpcionEvento } from "@/engine/career-events"
import { getEventNarrative, getSeasonNarrative } from "@/lib/narrative"
import {
  getDivisionInfo,
  COPA_RONDAS,
  EUROPA_COMPETICION_LABELS,
  type CopaState,
  type EuropaState,
  type SeleccionState,
  type ContratoState,
  type MercadoState,
} from "@/lib/world"

type Fixture = {
  jornada: number; rival: string; esLocal: boolean; jugado: boolean
  resultado: string | null; golesJugador: number; valoracion: number | null
}

type PlayerState = {
  name: string
  position: string
  age: number
  flatStats: Record<string, number>
  carrera: {
    club: string
    liga?: string
    divisionActual?: number
    rol: string
    temporada: number
    jornadaActual: number
    reputacion: number
    fixtures: Fixture[]
    copa?: CopaState
    europa?: EuropaState
    seleccion?: SeleccionState
    contrato?: ContratoState
    mercado?: MercadoState
    eventoActual: CareerEvent | null
    premios: string[]
    estadisticasTemporada: {
      partidosJugados: number; goles: number; asistencias: number; valoracionMedia: number
    }
  }
}

const TIPO_COLORS: Record<string, string> = {
  PRENSA: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  LESION: "bg-red-500/20 text-red-300 border-red-500/40",
  TRANSFERENCIA: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  EQUIPO: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  ENTRENAMIENTO: "bg-green-500/20 text-green-300 border-green-500/40",
  PERSONAL: "bg-orange-500/20 text-orange-300 border-orange-500/40",
}

const TIPO_LABELS: Record<string, string> = {
  PRENSA: "Prensa", LESION: "Médico", TRANSFERENCIA: "Mercado",
  EQUIPO: "Vestuario", ENTRENAMIENTO: "Entrenamiento", PERSONAL: "Personal",
}

type Tab = "liga" | "copa" | "europa" | "seleccion"
type SeasonPhase = "loading" | "no_season" | "event" | "paron" | "next_match" | "season_over" | "season_summary"

type SeasonSummary = {
  temporada: number; club: string; stats: Record<string, number>
  premios: string[]; rolAnterior: string; rolNuevo: string; subioRol: boolean
  seleccion?: { capas: number; goles: number; torneoTipo: string | null; campeon: boolean }
  contrato?: { expiraba: boolean; temporadasRestantes: number }
  edadRetiro?: boolean
}

export default function SeasonPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  const [playerState, setPlayerState] = useState<PlayerState | null>(null)
  const [phase, setPhase] = useState<SeasonPhase>("loading")
  const [tab, setTab] = useState<Tab>("liga")
  const [eventNarrativo, setEventNarrativo] = useState<string | null>(null)
  const [geminiEventNarrative, setGeminiEventNarrative] = useState<string | null>(null)
  const [geminiEventLoading, setGeminiEventLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [summary, setSummary] = useState<SeasonSummary | null>(null)
  const [endingLoading, setEndingLoading] = useState(false)
  const [seasonNarrative, setSeasonNarrative] = useState<string | null>(null)
  const [seasonNarrativeLoading, setSeasonNarrativeLoading] = useState(false)

  useEffect(() => {
    if (!isPending && !session) router.push("/login")
  }, [session, isPending, router])

  const loadPlayer = useCallback(async () => {
    const res = await fetch("/api/player")
    const { player } = await res.json()
    if (!player) { router.push("/create-player"); return }

    const carrera = player.state?.carrera ?? {}
    const jornadaActual = carrera.jornadaActual ?? 0

    const ps: PlayerState = {
      name: player.name,
      position: player.position ?? "CM",
      age: player.age,
      flatStats: (player.state?.attributes as Record<string, number>) ?? {},
      carrera: {
        club: carrera.club ?? "—",
        liga: carrera.liga,
        divisionActual: (carrera.divisionActual as number) ?? 3,
        rol: carrera.rol ?? "Rotación",
        temporada: carrera.temporada ?? 1,
        jornadaActual,
        reputacion: carrera.reputacion ?? 10,
        fixtures: carrera.fixtures ?? [],
        copa: carrera.copa ?? undefined,
        europa: carrera.europa ?? undefined,
        seleccion: carrera.seleccion ?? undefined,
        contrato: carrera.contrato ?? undefined,
        mercado: carrera.mercado ?? undefined,
        eventoActual: carrera.eventoActual ?? null,
        premios: carrera.premios ?? [],
        estadisticasTemporada: carrera.estadisticasTemporada ?? {
          partidosJugados: 0, goles: 0, asistencias: 0, valoracionMedia: 6.0,
        },
      },
    }
    setPlayerState(ps)

    const paronActivo = (carrera.seleccion as SeleccionState | undefined)?.paron?.activo

    if (jornadaActual === 0 || ps.carrera.fixtures.length === 0) {
      setPhase("no_season")
    } else if (carrera.eventoActual) {
      setPhase("event")
    } else if (paronActivo) {
      setPhase("paron")
    } else if (jornadaActual <= 16) {
      setPhase("next_match")
    } else {
      setPhase("season_over")
    }
  }, [router])

  useEffect(() => {
    if (session) loadPlayer()
  }, [session, loadPlayer])

  const handleInitSeason = async () => {
    setPhase("loading")
    await fetch("/api/season/init", { method: "POST" })
    await loadPlayer()
  }

  const handleResolveEvent = async (opcionId: string) => {
    if (resolving) return
    setResolving(true)

    const evento = playerState?.carrera.eventoActual
    const opcionElegida = evento?.opciones.find((o) => o.id === opcionId)

    const res = await fetch("/api/season/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opcionId }),
    })
    const data = await res.json()
    setEventNarrativo(data.narrativo)
    setGeminiEventNarrative(null)

    await loadPlayer()
    setResolving(false)

    if (evento && opcionElegida && playerState) {
      setGeminiEventLoading(true)
      getEventNarrative({
        playerName: playerState.name,
        playerPosition: playerState.position,
        club: playerState.carrera.club,
        rol: playerState.carrera.rol,
        eventTipo: evento.tipo,
        eventDesc: evento.descripcion,
        opcionTexto: opcionElegida.texto,
        narrativoBase: opcionElegida.narrativo,
      }).then((text) => {
        setGeminiEventNarrative(text)
        setGeminiEventLoading(false)
      })
    }
  }

  const handleContinueAfterEvent = () => {
    setEventNarrativo(null)
    setGeminiEventNarrative(null)
    setGeminiEventLoading(false)
  }

  const handleEndSeason = async () => {
    setEndingLoading(true)
    const res = await fetch("/api/season/end", { method: "POST" })
    const data = await res.json()
    const resumen = data.resumen
    setSummary(resumen)
    setPhase("season_summary")
    setEndingLoading(false)

    if (playerState) {
      setSeasonNarrativeLoading(true)
      getSeasonNarrative({
        playerName: playerState.name,
        playerPosition: playerState.position,
        club: playerState.carrera.club,
        rol: resumen.rolNuevo ?? playerState.carrera.rol,
        temporada: resumen.temporada,
        age: playerState.age,
        goles: resumen.stats?.goles ?? 0,
        asistencias: resumen.stats?.asistencias ?? 0,
        valoracionMedia: resumen.stats?.valoracionMedia ?? 6.0,
        premios: resumen.premios ?? [],
        subioRol: resumen.subioRol ?? false,
        torneoSeleccion: resumen.seleccion?.torneoTipo ?? null,
        campeonSeleccion: resumen.seleccion?.campeon ?? false,
      }).then((text) => {
        setSeasonNarrative(text)
        setSeasonNarrativeLoading(false)
      })
    }
  }

  const handleNewSeason = async () => {
    setSummary(null)
    setSeasonNarrative(null)
    await loadPlayer()
  }

  if (isPending || phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-gray-400">Cargando temporada...</div>
      </div>
    )
  }

  if (!playerState) return null

  const { carrera } = playerState
  const played = carrera.fixtures.filter((f) => f.jugado)
  const totalJornadas = 16
  const copa = carrera.copa
  const europa = carrera.europa
  const seleccion = carrera.seleccion
  const contrato = carrera.contrato
  const mercado = carrera.mercado
  const showCopa = !!copa
  const showEuropa = !!europa
  const showSeleccion = !!seleccion?.convocado
  const hasTransferOffers = (mercado?.ofertasActivas?.length ?? 0) > 0

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">
              Futbol<span className="text-green-400">RPG</span>
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {carrera.club} · {getDivisionInfo(carrera.divisionActual ?? 3).nombreCorto} · Temporada {carrera.temporada}
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            Dashboard →
          </button>
        </div>

        {/* Tab switcher */}
        {phase !== "no_season" && (showCopa || showEuropa || showSeleccion) && (
          <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
            <button
              onClick={() => setTab("liga")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === "liga" ? "bg-green-500 text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Liga
            </button>
            {showCopa && (
              <button
                onClick={() => setTab("copa")}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  tab === "copa"
                    ? "bg-yellow-500 text-black"
                    : copa?.eliminado
                      ? "text-gray-600"
                      : copa?.campeon
                        ? "text-yellow-400"
                        : "text-gray-400 hover:text-white"
                }`}
              >
                Copa {copa?.campeon ? "★" : copa?.eliminado ? "✗" : ""}
              </button>
            )}
            {showEuropa && (
              <button
                onClick={() => setTab("europa")}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  tab === "europa" ? "bg-blue-500 text-black" : "text-gray-400 hover:text-white"
                }`}
              >
                {europa ? (EUROPA_COMPETICION_LABELS[europa.competicion]?.split(" ").slice(-1)[0] ?? "Europa") : "Europa"}
              </button>
            )}
            {showSeleccion && (
              <button
                onClick={() => setTab("seleccion")}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  tab === "seleccion"
                    ? "bg-red-500 text-white"
                    : seleccion?.paron?.activo
                      ? "text-red-400 animate-pulse"
                      : "text-gray-400 hover:text-white"
                }`}
              >
                ES{seleccion?.paron?.activo ? " !" : ""}
              </button>
            )}
          </div>
        )}

        {/* ── LIGA TAB ── */}
        {(tab === "liga" || phase === "no_season") && (
          <>
            {/* Season progress */}
            {phase !== "no_season" && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    Jornada <span className="text-white font-bold">{Math.min(carrera.jornadaActual, totalJornadas)}</span> / {totalJornadas}
                  </span>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{carrera.estadisticasTemporada.goles}G</span>
                    <span>{carrera.estadisticasTemporada.asistencias}A</span>
                    <span>{carrera.estadisticasTemporada.valoracionMedia.toFixed(1)} val.</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {carrera.fixtures.map((f) => (
                    <div
                      key={f.jornada}
                      title={f.jugado ? `vs ${f.rival} · ${f.resultado}` : `vs ${f.rival}`}
                      className={`flex-1 h-2 rounded-full transition-colors ${
                        f.jugado
                          ? (f.valoracion ?? 0) >= 7
                            ? "bg-green-500"
                            : (f.valoracion ?? 0) >= 5.5
                              ? "bg-blue-500"
                              : "bg-orange-500"
                          : f.jornada === carrera.jornadaActual
                            ? "bg-gray-500 animate-pulse"
                            : "bg-gray-800"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{carrera.rol}</span>
                  <span>Reputación {carrera.reputacion}/100</span>
                </div>
              </div>
            )}

            {/* No season */}
            {phase === "no_season" && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center space-y-4">
                <div className="text-4xl">⚽</div>
                <h2 className="text-xl font-black">Temporada {carrera.temporada}</h2>
                <p className="text-gray-400 text-sm">
                  {carrera.club} te espera. 16 partidos de liga + Copa del Rey{(carrera.divisionActual ?? 1) >= 3 ? " + competición europea" : ""}.
                </p>
                <button
                  onClick={handleInitSeason}
                  className="px-8 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors"
                >
                  Iniciar temporada →
                </button>
              </div>
            )}

            {/* Event */}
            {phase === "event" && carrera.eventoActual && !eventNarrativo && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full border ${TIPO_COLORS[carrera.eventoActual.tipo]}`}>
                    {TIPO_LABELS[carrera.eventoActual.tipo]}
                  </span>
                  <p className="text-gray-500 text-xs">Evento de temporada</p>
                </div>
                <h2 className="text-xl font-bold text-white">{carrera.eventoActual.titulo}</h2>
                <p className="text-gray-300 text-sm leading-relaxed">{carrera.eventoActual.descripcion}</p>
                <div className="space-y-2 pt-1">
                  {carrera.eventoActual.opciones.map((op) => (
                    <EventOption
                      key={op.id}
                      op={op}
                      flatStats={playerState.flatStats}
                      resolving={resolving}
                      onSelect={handleResolveEvent}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Event result */}
            {phase === "event" && eventNarrativo && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center space-y-5">
                <p className="text-gray-300 leading-relaxed">{eventNarrativo}</p>
                {geminiEventLoading && (
                  <div className="space-y-2 max-w-xs mx-auto">
                    <div className="h-3 bg-gray-800 rounded-full animate-pulse w-full" />
                    <div className="h-3 bg-gray-800 rounded-full animate-pulse w-3/4 mx-auto" />
                  </div>
                )}
                {geminiEventNarrative && !geminiEventLoading && (
                  <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-5 py-4 text-left max-w-sm mx-auto">
                    <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-2">Narrador</p>
                    <p className="text-gray-200 text-sm leading-relaxed italic">&ldquo;{geminiEventNarrative}&rdquo;</p>
                  </div>
                )}
                <button
                  onClick={handleContinueAfterEvent}
                  disabled={geminiEventLoading}
                  className="px-8 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors disabled:opacity-60"
                >
                  Continuar →
                </button>
              </div>
            )}

            {/* Parón internacional */}
            {phase === "paron" && seleccion?.paron && (
              <div className="bg-gray-900 rounded-2xl border border-red-500/30 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇪🇸</span>
                  <div>
                    <p className="text-xs text-red-400 uppercase tracking-wider font-bold">Parón Internacional</p>
                    <h2 className="text-lg font-black text-white">Selección Nacional</h2>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">
                  Has sido convocado con la selección. Quedan{" "}
                  <span className="text-white font-bold">
                    {seleccion.paron.partidos.filter((p) => !p.jugado).length}
                  </span>{" "}
                  {seleccion.paron.partidos.filter((p) => !p.jugado).length === 1 ? "partido" : "partidos"}.
                </p>
                {(() => {
                  const next = seleccion.paron.partidos.find((p) => !p.jugado)
                  if (!next) return null
                  return (
                    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        {next.tipo === "clasificacion" ? "Clasificación" : "Amistoso"} · {next.esLocal ? "En casa" : "Fuera"}
                      </p>
                      <p className="text-lg font-black">
                        {next.esLocal ? `España vs ${next.rival}` : `${next.rival} vs España`}
                      </p>
                      <button
                        onClick={() => router.push("/match?tipo=seleccion")}
                        className="w-full py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-lg transition-colors text-sm"
                      >
                        Jugar con la selección →
                      </button>
                    </div>
                  )
                })()}
                {seleccion.paron.partidos.filter((p) => p.jugado).length > 0 && (
                  <div className="space-y-2">
                    {seleccion.paron.partidos.filter((p) => p.jugado).map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{p.esLocal ? "vs " : "@ "}{p.rival}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-mono">{p.resultado}</span>
                          <span className={`text-xs font-bold ${p.ganado ? "text-green-400" : p.empate ? "text-blue-400" : "text-red-400"}`}>
                            {p.ganado ? "V" : p.empate ? "E" : "D"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Transfer notification */}
            {hasTransferOffers && phase !== "season_summary" && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-yellow-400 font-bold text-sm">
                    {mercado!.ofertasActivas.length} oferta{mercado!.ofertasActivas.length > 1 ? "s" : ""} de traspaso
                  </p>
                  <p className="text-yellow-300/60 text-xs">Tienes propuestas esperando respuesta</p>
                </div>
                <button
                  onClick={() => router.push("/transfer")}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg text-xs transition-colors"
                >
                  Ver →
                </button>
              </div>
            )}

            {/* Next match */}
            {phase === "next_match" && (() => {
              const nextFixture = carrera.fixtures.find((f) => f.jornada === carrera.jornadaActual)
              if (!nextFixture) return null
              return (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Próximo partido · Jornada {nextFixture.jornada}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-black text-white">
                        {nextFixture.esLocal ? `${carrera.club} vs ${nextFixture.rival}` : `${nextFixture.rival} vs ${carrera.club}`}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        {nextFixture.esLocal ? "En casa · " : "Fuera · "}
                        {carrera.liga ?? "Liga"}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${nextFixture.esLocal ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {nextFixture.esLocal ? "LOCAL" : "VISITANTE"}
                    </span>
                  </div>
                  <button
                    onClick={() => router.push("/match")}
                    className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors"
                  >
                    Jugar partido →
                  </button>
                </div>
              )
            })()}

            {/* Season over */}
            {phase === "season_over" && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center space-y-5">
                <div className="text-4xl">🏁</div>
                <h2 className="text-xl font-black">Liga completada · Temporada {carrera.temporada}</h2>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Partidos", value: carrera.estadisticasTemporada.partidosJugados },
                    { label: "Goles", value: carrera.estadisticasTemporada.goles },
                    { label: "Valoración", value: carrera.estadisticasTemporada.valoracionMedia.toFixed(1) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
                      <p className="text-xl font-black">{value}</p>
                      <p className="text-gray-500 text-xs mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleEndSeason}
                  disabled={endingLoading}
                  className="px-8 py-3 bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-black font-bold rounded-xl transition-colors"
                >
                  {endingLoading ? "Calculando..." : "Ver resumen de temporada →"}
                </button>
              </div>
            )}

            {/* Season summary */}
            {phase === "season_summary" && summary && (
              <div className="space-y-5">
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5">
                  <h2 className="text-xl font-black">Resumen · Temporada {summary.temporada}</h2>
                  <p className="text-gray-400 text-sm">{summary.club}</p>

                  {/* Gemini season narrative */}
                  {seasonNarrativeLoading && (
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-800 rounded-full animate-pulse w-full" />
                      <div className="h-3 bg-gray-800 rounded-full animate-pulse w-4/5" />
                      <div className="h-3 bg-gray-800 rounded-full animate-pulse w-3/5" />
                    </div>
                  )}
                  {seasonNarrative && !seasonNarrativeLoading && (
                    <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-5 py-4">
                      <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-2">Crónica de temporada</p>
                      <p className="text-gray-200 text-sm leading-relaxed italic">{seasonNarrative}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Partidos", value: summary.stats.partidosJugados ?? 0 },
                      { label: "Goles", value: summary.stats.goles ?? 0 },
                      { label: "Asistencias", value: summary.stats.asistencias ?? 0 },
                      { label: "Val. media", value: (summary.stats.valoracionMedia ?? 6).toFixed(1) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-xl font-black">{value}</p>
                        <p className="text-gray-500 text-xs mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                  {summary.premios.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Premios</p>
                      {summary.premios.map((p) => (
                        <div key={p} className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2">
                          <span className="text-yellow-400 text-lg">🏆</span>
                          <span className="text-yellow-300 font-semibold text-sm">{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {summary.subioRol && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
                      <span className="text-green-400 text-xl">⬆️</span>
                      <div>
                        <p className="text-green-300 font-bold text-sm">¡Ascenso de rol!</p>
                        <p className="text-green-400/70 text-xs">{summary.rolAnterior} → {summary.rolNuevo}</p>
                      </div>
                    </div>
                  )}
                  {!summary.subioRol && summary.rolNuevo !== summary.rolAnterior && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
                      <span className="text-red-400 text-xl">↓</span>
                      <div>
                        <p className="text-red-300 font-bold text-sm">Rol reducido</p>
                        <p className="text-red-400/70 text-xs">{summary.rolAnterior} → {summary.rolNuevo}</p>
                      </div>
                    </div>
                  )}
                  {summary.seleccion && (summary.seleccion.capas > 0 || summary.seleccion.campeon) && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                      <p className="text-red-300 font-bold text-sm mb-1">Selección Nacional</p>
                      <div className="flex gap-4 text-xs text-red-400/70">
                        <span>{summary.seleccion.capas} internacionales</span>
                        <span>{summary.seleccion.goles} goles</span>
                        {summary.seleccion.campeon && (
                          <span className="text-yellow-400 font-bold">
                            CAMPEÓN {summary.seleccion.torneoTipo === "eurocopa" ? "EUROCOPA" : "MUNDIAL"}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {summary.contrato?.expiraba && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div>
                        <p className="text-orange-300 font-bold text-sm">Contrato renovado automáticamente</p>
                        <p className="text-orange-400/70 text-xs">{summary.contrato.temporadasRestantes} temporadas nuevas</p>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleNewSeason}
                  className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors"
                >
                  Comenzar Temporada {summary.temporada + 1} →
                </button>
              </div>
            )}

            {/* Fixture history */}
            {played.length > 0 && phase !== "season_summary" && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Resultados de liga</p>
                {played.slice().reverse().map((f) => (
                  <div key={f.jornada} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600 text-xs w-4">{f.jornada}</span>
                      <span className="text-gray-300">{f.esLocal ? "vs " : "@ "}{f.rival}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-mono">{f.resultado ?? "-"}</span>
                      {f.golesJugador > 0 && (
                        <span className="text-yellow-400 text-xs font-bold">{f.golesJugador}G</span>
                      )}
                      {f.valoracion != null && (
                        <span className={`font-mono text-xs font-bold ${
                          f.valoracion >= 7 ? "text-green-400" : f.valoracion >= 5.5 ? "text-blue-400" : "text-orange-400"
                        }`}>
                          {f.valoracion.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── COPA TAB ── */}
        {tab === "copa" && copa && (
          <CopaBracketPanel copa={copa} club={carrera.club} onPlay={() => router.push("/match?tipo=copa")} />
        )}

        {/* ── EUROPA TAB ── */}
        {tab === "europa" && europa && (
          <EuropaPanel europa={europa} club={carrera.club} onPlay={() => router.push("/match?tipo=europa")} />
        )}

        {/* ── SELECCIÓN TAB ── */}
        {tab === "seleccion" && seleccion && (
          <SeleccionPanel
            seleccion={seleccion}
            onPlayParon={() => router.push("/match?tipo=seleccion")}
            onPlayTorneo={() => router.push("/match?tipo=seleccion_torneo")}
          />
        )}
      </div>
    </main>
  )
}

// ─── Selección Nacional panel ─────────────────────────────────────────────────

function SeleccionPanel({
  seleccion,
  onPlayParon,
  onPlayTorneo,
}: {
  seleccion: SeleccionState
  onPlayParon: () => void
  onPlayTorneo: () => void
}) {
  const torneo = seleccion.torneo
  const paron = seleccion.paron
  const torneoLabel = torneo?.tipo === "eurocopa" ? "Eurocopa" : torneo?.tipo === "mundial" ? "Mundial" : ""

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇪🇸</span>
            <h3 className="font-black text-white">Selección Nacional</h3>
          </div>
          {torneo?.campeon && <span className="text-yellow-400 font-bold text-sm">CAMPEÓN</span>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-white">{seleccion.capas}</p>
            <p className="text-gray-500 text-xs mt-1">Internacionales</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-white">{seleccion.golesSeleccion}</p>
            <p className="text-gray-500 text-xs mt-1">Goles con la selección</p>
          </div>
        </div>

        {/* Parón activo */}
        {paron?.activo && (() => {
          const next = paron.partidos.find((p) => !p.jugado)
          if (!next) return null
          return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
              <p className="text-xs text-red-400 uppercase tracking-wider font-bold">
                {next.tipo === "clasificacion" ? "Partido de Clasificación" : "Amistoso"}
              </p>
              <p className="text-lg font-black">
                {next.esLocal ? `España vs ${next.rival}` : `${next.rival} vs España`}
              </p>
              <button
                onClick={onPlayParon}
                className="w-full py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-lg text-sm transition-colors"
              >
                Jugar con la selección →
              </button>
            </div>
          )
        })()}

        {/* Parón completado */}
        {paron && !paron.activo && paron.partidos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Parón completado</p>
            {paron.partidos.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{p.esLocal ? "vs " : "@ "}{p.rival}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-mono">{p.resultado}</span>
                  <span className={`text-xs font-bold ${p.ganado ? "text-green-400" : p.empate ? "text-blue-400" : "text-red-400"}`}>
                    {p.ganado ? "V" : p.empate ? "E" : "D"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Torneo */}
      {torneo && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-white">{torneoLabel}</h3>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              torneo.campeon ? "bg-yellow-500/20 text-yellow-400"
              : torneo.fase === "finalizado" ? "bg-gray-700 text-gray-500"
              : "bg-red-500/20 text-red-400"
            }`}>
              {torneo.campeon ? "CAMPEÓN" : torneo.fase === "finalizado" ? "ELIMINADO" : torneo.fase === "eliminatoria" ? "Eliminatorias" : "Fase de Grupos"}
            </span>
          </div>

          {/* Group stats */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {[
              { label: "G", value: torneo.grupoStats.G },
              { label: "E", value: torneo.grupoStats.E },
              { label: "P", value: torneo.grupoStats.P },
              { label: "PTS", value: torneo.grupoStats.PTS },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800 rounded-lg py-2">
                <p className="font-black text-white text-sm">{value}</p>
                <p className="text-gray-600">{label}</p>
              </div>
            ))}
          </div>

          {/* Next tournament match */}
          {torneo.fase === "grupos" && (() => {
            const next = torneo.grupoPartidos.find((p) => !p.jugado)
            if (!next) return null
            return (
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Partido {torneo.grupoPartidos.filter((p) => p.jugado).length + 1}/6 · {next.esLocal ? "Local" : "Fuera"}
                </p>
                <p className="text-lg font-black">{next.esLocal ? `España vs ${next.rival}` : `${next.rival} vs España`}</p>
                <button
                  onClick={onPlayTorneo}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-lg text-sm transition-colors"
                >
                  Jugar partido de {torneoLabel} →
                </button>
              </div>
            )
          })()}

          {torneo.fase === "eliminatoria" && torneo.eliminatoria && !torneo.eliminatoria.jugado && (() => {
            const el = torneo.eliminatoria
            const rondaNames = ["Cuartos de Final", "Semifinales", "Gran Final"]
            return (
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {rondaNames[el.rondaIdx] ?? "Eliminatoria"} · {el.esLocal ? "Local" : "Fuera"}
                </p>
                <p className="text-lg font-black">España vs {el.rival}</p>
                <button
                  onClick={onPlayTorneo}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-lg text-sm transition-colors"
                >
                  Jugar eliminatoria →
                </button>
              </div>
            )
          })()}

          {/* Grupo results */}
          {torneo.grupoPartidos.some((p) => p.jugado) && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Fase de Grupos</p>
              {torneo.grupoPartidos.filter((p) => p.jugado).map((p) => (
                <div key={p.idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{p.esLocal ? "vs " : "@ "}{p.rival}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-mono">{p.resultado}</span>
                    <span className={`text-xs font-bold ${p.ganado ? "text-green-400" : p.empate ? "text-blue-400" : "text-red-400"}`}>
                      {p.ganado ? "V" : p.empate ? "E" : "D"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {torneo.campeon && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
              <p className="text-yellow-400 font-black text-lg">¡CAMPEÓN DE {torneoLabel.toUpperCase()}!</p>
              <p className="text-yellow-300/70 text-sm mt-1">La gloria máxima del fútbol internacional</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Event option with stat-lock support ─────────────────────────────────────

const STAT_NAMES: Record<string, string> = {
  pace: "Velocidad", shooting: "Disparo", passing: "Pase", dribbling: "Regate",
  defending: "Defensa", physical: "Físico", reflexes: "Reflejos", handling: "Manos",
  positioning: "Posicionamiento", tackling: "Entrada", heading: "Remate de cabeza",
  vision: "Visión", crossing: "Centros", finishing: "Definición", stamina: "Resistencia",
  strength: "Fuerza", agility: "Agilidad", jumping: "Salto", leadership: "Liderazgo",
  composure: "Compostura",
}

function EventOption({
  op,
  flatStats,
  resolving,
  onSelect,
}: {
  op: OpcionEvento
  flatStats: Record<string, number>
  resolving: boolean
  onSelect: (id: string) => void
}) {
  const req = op.requiereStat
  const statValue = req ? (flatStats[req.stat] ?? 0) : null
  const isLocked = req ? statValue! < req.minValue : false
  const isPremium = !!req

  return (
    <button
      onClick={() => !isLocked && onSelect(op.id)}
      disabled={resolving || isLocked}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm
        ${isLocked
          ? "border-gray-800 bg-gray-900/40 text-gray-600 cursor-not-allowed"
          : isPremium
            ? "border-green-500/50 bg-green-500/10 hover:bg-green-500/20 hover:border-green-400/70 text-white"
            : "border-gray-700 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800 text-white"
        } disabled:cursor-not-allowed`}
    >
      <div className="flex items-start justify-between gap-2">
        <span>{op.texto}</span>
        {isPremium && (
          <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
            isLocked
              ? "bg-gray-800 text-gray-600"
              : "bg-green-500/20 text-green-400"
          }`}>
            {isLocked
              ? `${STAT_NAMES[req!.stat] ?? req!.stat} ${statValue}/${req!.minValue}`
              : "PREMIUM"}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Copa bracket panel ───────────────────────────────────────────────────────

function CopaBracketPanel({ copa, club, onPlay }: { copa: CopaState; club: string; onPlay: () => void }) {
  const rondaActual = COPA_RONDAS[copa.rondaIdx] ?? "R32"

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-white">Copa del Rey</h3>
          {copa.campeon && <span className="text-yellow-400 font-bold text-sm">CAMPEÓN</span>}
          {copa.eliminado && <span className="text-red-400 font-bold text-sm">ELIMINADO</span>}
        </div>

        {/* Rounds progression */}
        <div className="flex items-center gap-1">
          {COPA_RONDAS.map((ronda, i) => {
            const passed = i < copa.rondaIdx || copa.campeon
            const current = i === copa.rondaIdx && !copa.eliminado && !copa.campeon
            const failed = copa.eliminado && i === copa.historial.length - 1
            return (
              <div key={ronda} className="flex items-center gap-1 flex-1">
                <div className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold ${
                  passed ? "bg-green-500/20 text-green-400 border border-green-500/40"
                  : current ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 animate-pulse"
                  : failed ? "bg-red-500/20 text-red-400 border border-red-500/40"
                  : "bg-gray-800 text-gray-600"
                }`}>
                  {ronda}
                </div>
                {i < COPA_RONDAS.length - 1 && (
                  <span className={`text-xs ${passed ? "text-green-600" : "text-gray-700"}`}>›</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Current match */}
        {!copa.eliminado && !copa.campeon && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {rondaActual} · {copa.esLocal ? "En casa" : "Fuera"}
            </p>
            <p className="text-lg font-black text-white">
              {copa.esLocal ? `${club} vs ${copa.rival}` : `${copa.rival} vs ${club}`}
            </p>
            <button
              onClick={onPlay}
              className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors text-sm"
            >
              Jugar partido de Copa →
            </button>
          </div>
        )}

        {copa.campeon && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
            <p className="text-yellow-400 font-black text-lg">¡CAMPEÓN DE COPA!</p>
            <p className="text-yellow-300/70 text-sm mt-1">Has ganado la Copa del Rey esta temporada</p>
          </div>
        )}

        {copa.eliminado && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm">
              Eliminado en {copa.historial.at(-1)?.ronda ?? "fase anterior"} ante {copa.historial.at(-1)?.rival ?? "rival"}
            </p>
          </div>
        )}
      </div>

      {/* Copa history */}
      {copa.historial.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Historial Copa</p>
          {copa.historial.map((h, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-600 text-xs w-8">{h.ronda}</span>
                <span className="text-gray-300">{h.rival}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 font-mono">{h.resultado}</span>
                <span className={`text-xs font-bold ${h.ganado ? "text-green-400" : "text-red-400"}`}>
                  {h.ganado ? "VICTORIA" : "DERROTA"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Europa panel ─────────────────────────────────────────────────────────────

function EuropaPanel({ europa, club, onPlay }: { europa: EuropaState; club: string; onPlay: () => void }) {
  const competicionLabel = EUROPA_COMPETICION_LABELS[europa.competicion] ?? "Europa"
  const s = europa.grupoStats
  const allGroupPlayed = europa.grupoPartidos.every((p) => p.jugado)
  const nextGroupMatch = europa.grupoPartidos.find((p) => !p.jugado)
  const el = europa.eliminatoria

  const hasKnockout = !!el
  const knockoutDone = el?.eliminado || el?.campeon
  const knockoutPending = el && !el.jugado
  const eliminatoriaRondas = ["R16", "QF", "SF", "F"]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-white text-sm">{competicionLabel}</h3>
          {el?.campeon && <span className="text-yellow-400 font-bold text-sm">CAMPEÓN</span>}
          {el?.eliminado && <span className="text-red-400 font-bold text-sm">ELIMINADO</span>}
          {!allGroupPlayed && <span className="text-blue-400 font-bold text-sm">Fase de Grupos</span>}
          {allGroupPlayed && !europa.clasificado && <span className="text-gray-500 font-bold text-sm">No clasificado</span>}
          {allGroupPlayed && europa.clasificado && !el && <span className="text-green-400 font-bold text-sm">Clasificado</span>}
        </div>

        {/* Group stats */}
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {[
            { label: "PJ", value: s.G + s.E + s.P },
            { label: "G", value: s.G },
            { label: "E", value: s.E },
            { label: "P", value: s.P },
            { label: "PTS", value: s.PTS },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-800 rounded-lg py-2">
              <p className="font-black text-white text-sm">{value}</p>
              <p className="text-gray-600">{label}</p>
            </div>
          ))}
        </div>

        {/* Next action */}
        {nextGroupMatch && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Fase de Grupos · Partido {europa.grupoPartidos.filter((p) => p.jugado).length + 1}/6
              {" · "}{nextGroupMatch.esLocal ? "En casa" : "Fuera"}
            </p>
            <p className="text-lg font-black text-white">
              {nextGroupMatch.esLocal
                ? `${club} vs ${nextGroupMatch.rival}`
                : `${nextGroupMatch.rival} vs ${club}`}
            </p>
            <button
              onClick={onPlay}
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-400 text-black font-bold rounded-lg transition-colors text-sm"
            >
              Jugar partido europeo →
            </button>
          </div>
        )}

        {/* Knockout match pending */}
        {!nextGroupMatch && knockoutPending && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {eliminatoriaRondas[el!.rondaIdx] ?? "Eliminatoria"} · {el!.esLocal ? "En casa" : "Fuera"}
            </p>
            <p className="text-lg font-black text-white">
              {el!.esLocal ? `${club} vs ${el!.rival}` : `${el!.rival} vs ${club}`}
            </p>
            <button
              onClick={onPlay}
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-400 text-black font-bold rounded-lg transition-colors text-sm"
            >
              Jugar eliminatoria →
            </button>
          </div>
        )}

        {/* Group stage done, not qualified */}
        {allGroupPlayed && !europa.clasificado && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm">Eliminado en fase de grupos ({s.PTS} puntos)</p>
          </div>
        )}

        {/* Champion */}
        {el?.campeon && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
            <p className="text-yellow-400 font-black text-lg">¡CAMPEÓN DE EUROPA!</p>
            <p className="text-yellow-300/70 text-sm mt-1">{competicionLabel}</p>
          </div>
        )}
      </div>

      {/* Group match results */}
      {europa.grupoPartidos.some((p) => p.jugado) && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Fase de Grupos</p>
          {europa.grupoPartidos
            .filter((p) => p.jugado)
            .map((p) => (
              <div key={p.idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-gray-300">{p.esLocal ? "vs " : "@ "}{p.rival}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 font-mono">{p.resultado ?? "-"}</span>
                  <span className={`text-xs font-bold ${p.ganado ? "text-green-400" : p.empate ? "text-blue-400" : "text-red-400"}`}>
                    {p.ganado ? "V" : p.empate ? "E" : "D"}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Knockout history */}
      {hasKnockout && el!.historial.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Eliminatorias</p>
          {el!.historial.map((h, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-600 text-xs w-8">{h.ronda}</span>
                <span className="text-gray-300">{h.rival}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 font-mono">{h.resultado}</span>
                <span className={`text-xs font-bold ${h.ganado ? "text-green-400" : "text-red-400"}`}>
                  {h.ganado ? "V" : "D"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { type CareerEvent, type OpcionEvento } from "@/engine/career-events"
import { getEventNarrative, getSeasonNarrative } from "@/lib/narrative"
import VideoLoader from "@/components/VideoLoader"
import { POSITION_LABELS, NATIONALITY_FLAGS } from "@/lib/player-config"
import { playSound } from "@/lib/sound"

const TrophyScene = dynamic(() => import("@/components/TrophyScene"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-950 animate-pulse" />,
})
import {
  getDivisionInfo,
  COPA_RONDAS,
  EUROPA_COMPETICION_LABELS,
  formatRonda,
  formatRondaCorta,
  type CopaState,
  type EuropaState,
  type SeleccionState,
  type ContratoState,
  type MercadoState,
} from "@/lib/world"
import {
  getProximoPartido,
  buildCalendarioTemporada,
  agruparPorMes,
  COMPETICION_COLORS,
  type CompeticionTipo,
} from "@/lib/calendar"

type Fixture = {
  jornada: number; rival: string; esLocal: boolean; jugado: boolean
  resultado: string | null; golesJugador: number; valoracion: number | null
}

type PlayerState = {
  id: string
  name: string
  position: string
  nationality: string
  posicionesSecundarias?: string[]
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
    modoJuego?: "completo" | "decisivos" | "simulado"
    fixtures: Fixture[]
    copa?: CopaState
    europa?: EuropaState
    seleccion?: SeleccionState
    contrato?: ContratoState
    mercado?: MercadoState
    eventoActual: CareerEvent | null
    eventosPendientes?: CareerEvent[]
    premios: string[]
    estadisticasTemporada: {
      partidosJugados: number; goles: number; asistencias: number; valoracionMedia: number
      tarjetasAmarillas?: number; tarjetasRojas?: number
    }
    sancion?: { partidosRestantes: number }
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

const MODO_JUEGO_LABELS: Record<"completo" | "decisivos" | "simulado", string> = {
  completo: "Completo", decisivos: "Decisivos", simulado: "Simulado",
}
const MODOS_JUEGO = [
  { id: "completo" as const, label: "Completo", description: "Juegas todos los partidos tú mismo." },
  { id: "decisivos" as const, label: "Decisivos", description: "Eliminatorias, selección y tramo final; el resto se simula." },
  { id: "simulado" as const, label: "Simulado", description: "Toda la temporada se resuelve automáticamente." },
]

type SeasonPhase = "loading" | "no_season" | "event" | "paron" | "next_match" | "season_over" | "season_summary"

type SeasonSummary = {
  temporada: number; club: string; stats: Record<string, number>
  premios: string[]; rolAnterior: string; rolNuevo: string; subioRol: boolean
  liga?: {
    posicionFinal: number; totalEquipos: number; cambioDivision: "ascenso" | "descenso" | "ninguno"
    clubAnterior: string; clubNuevo: string; divisionAnterior: number; divisionNueva: number; ligaNueva: string
  }
  seleccion?: { capas: number; goles: number; torneoTipo: string | null; campeon: boolean }
  contrato?: { expiraba: boolean; temporadasRestantes: number }
  edadRetiro?: boolean
}

export default function SeasonPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  const [playerState, setPlayerState] = useState<PlayerState | null>(null)
  const [phase, setPhase] = useState<SeasonPhase>("loading")
  const [eventNarrativo, setEventNarrativo] = useState<string | null>(null)
  const [geminiEventNarrative, setGeminiEventNarrative] = useState<string | null>(null)
  const [geminiEventLoading, setGeminiEventLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [summary, setSummary] = useState<SeasonSummary | null>(null)
  const [endingLoading, setEndingLoading] = useState(false)
  const [resolvingSancion, setResolvingSancion] = useState(false)
  const [endError, setEndError] = useState<string | null>(null)
  const [premiumRequiredMsg, setPremiumRequiredMsg] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const handleUpgrade = async () => {
    setCheckoutLoading(true)
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setCheckoutLoading(false)
    }
  }
  const [showEndWarning, setShowEndWarning] = useState(false)
  const [seasonNarrative, setSeasonNarrative] = useState<string | null>(null)
  const [seasonNarrativeLoading, setSeasonNarrativeLoading] = useState(false)
  const [pendingMarketOffers, setPendingMarketOffers] = useState(0)
  const [jugarComoSecundaria, setJugarComoSecundaria] = useState(false)
  const [summaryLinkCopied, setSummaryLinkCopied] = useState(false)
  const [simulatingMatch, setSimulatingMatch] = useState(false)
  const [autoSeasonRunning, setAutoSeasonRunning] = useState(false)
  const [autoSeasonStep, setAutoSeasonStep] = useState(0)
  const [retirado, setRetirado] = useState(false)
  const [requestingTransfer, setRequestingTransfer] = useState(false)
  const [showModeSwitch, setShowModeSwitch] = useState(false)
  const [changingModo, setChangingModo] = useState(false)

  useEffect(() => {
    if (!session) return
    // Ofertas reales de otros usuarios (sistema separado de carrera.mercado,
    // ver informe-fallos.md C3) — sin esto, nunca se avisa de que existen.
    fetch("/api/market")
      .then((r) => r.json())
      .then((data) => setPendingMarketOffers(data?.myOfferCount ?? 0))
      .catch(() => {})
  }, [session])

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
      id: player.id,
      name: player.name,
      position: player.position ?? "CM",
      nationality: player.nationality ?? "España",
      posicionesSecundarias: (player.state?.posicionesSecundarias as string[] | undefined) ?? [],
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
        modoJuego: (carrera.modoJuego as "completo" | "decisivos" | "simulado" | undefined) ?? "completo",
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
        sancion: carrera.sancion ?? undefined,
      },
    }
    setPlayerState(ps)

    const paronActivo = (carrera.seleccion as SeleccionState | undefined)?.paron?.activo

    // Calendario unificado (ver lib/calendar.ts): un único "próximo partido"
    // para toda la temporada, sin importar de qué competición sea — Liga,
    // Copa y Europa se intercalan por orden cronológico real (ya no hace
    // falta terminar entera la Copa o la fase de grupos europea antes de
    // tocar la Liga), el parón de selección pausa todo lo demás mientras
    // está activo, y el torneo de verano solo aparece cuando el resto de la
    // temporada de club ya ha terminado.
    const hayPartidoPendiente = getProximoPartido(ps.carrera) !== null

    if (jornadaActual === 0 || ps.carrera.fixtures.length === 0) {
      setPhase("no_season")
    } else if (carrera.eventoActual) {
      setPhase("event")
    } else if (paronActivo) {
      setPhase("paron")
    } else if (hayPartidoPendiente) {
      setPhase("next_match")
    } else {
      // La temporada ha terminado: no queda ningún partido pendiente de
      // ninguna competición (Liga, Copa, Europa ni el torneo de selección).
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

  const handleResolveSancion = async () => {
    if (resolvingSancion) return
    setResolvingSancion(true)
    await fetch("/api/season/resolve-sancion", { method: "POST" })
    await loadPlayer()
    setResolvingSancion(false)
  }

  const handleRequestTransfer = async () => {
    if (requestingTransfer) return
    setRequestingTransfer(true)
    try {
      await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "requestTransfer" }),
      })
      await loadPlayer()
    } finally {
      setRequestingTransfer(false)
    }
  }

  const handleChangeModoJuego = async (nuevo: "completo" | "decisivos" | "simulado") => {
    if (changingModo || playerState?.carrera.modoJuego === nuevo) { setShowModeSwitch(false); return }
    setChangingModo(true)
    try {
      await fetch("/api/player/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modoJuego: nuevo }),
      })
      await loadPlayer()
    } finally {
      setChangingModo(false)
      setShowModeSwitch(false)
    }
  }

  const handleSimularPartido = async () => {
    if (simulatingMatch) return
    setSimulatingMatch(true)
    await fetch("/api/match/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "liga" }),
    })
    await loadPlayer()
    setSimulatingMatch(false)
  }

  // Modo de juego "simulado": resuelve toda la temporada de golpe llamando
  // en bucle a /api/season/auto-advance (un paso -- evento, partido de
  // selección/copa/europa/liga -- por llamada) hasta que no quede nada
  // pendiente, y entonces cierra la temporada igual que si un humano hubiera
  // pulsado "Terminar temporada".
  const handleSimularTemporadaCompleta = async () => {
    if (autoSeasonRunning) return
    setAutoSeasonRunning(true)
    setAutoSeasonStep(0)
    try {
      // Límite de seguridad, no un valor esperado: 16 jornadas de liga + hasta 5
      // de copa + hasta 10 de europa + hasta 9 de selección + hasta 6 eventos
      // por jornada en ~55% de ellas (ver eventosPendientes en match-save.ts)
      // puede superar fácilmente el centenar de pasos en una temporada cargada
      // (probado en la práctica: ~62 pasos en un caso típico).
      for (let i = 0; i < 250; i++) {
        const res = await fetch("/api/season/auto-advance", { method: "POST" })
        const data = await res.json()
        setAutoSeasonStep((n) => n + 1)
        if (data.done) break
      }
      await handleEndSeason()
    } finally {
      setAutoSeasonRunning(false)
    }
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
    setResolving(false)

    // Retiro definitivo: el jugador ya no existe (ver api/season/event),
    // así que no recargamos playerState -- solo dejamos ver el mensaje de
    // despedida; "Continuar" (handleContinueAfterEvent) lleva a /legado.
    if (data.retirado) {
      setRetirado(true)
      return
    }

    await loadPlayer()

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
    if (retirado) {
      router.push("/legado")
      return
    }
    setEventNarrativo(null)
    setGeminiEventNarrative(null)
    setGeminiEventLoading(false)
  }

  // Copa/Europa no están sincronizadas con las 16 jornadas de liga — es normal
  // acabar la liga sin haberlas terminado. Terminar la temporada las descarta
  // (api/season/end genera Copa/Europa nuevas para la temporada siguiente), así
  // que avisamos antes en vez de hacerlo en silencio.
  const copaSinTerminar = (copa?: CopaState) => !!copa && !copa.eliminado && !copa.campeon
  const europaSinTerminar = (europa?: EuropaState) => {
    if (!europa) return false
    const grupoTerminado = europa.grupoPartidos.every((p) => p.jugado)
    if (!grupoTerminado) return true
    if (!europa.clasificado) return false // eliminado en fase de grupos, ya resuelto
    const el = europa.eliminatoria
    if (!el) return true // clasificado pero la eliminatoria todavía no se ha jugado
    return !el.eliminado && !el.campeon
  }

  const handleRequestEndSeason = () => {
    setEndError(null)
    const { copa, europa } = playerState?.carrera ?? {}
    if (copaSinTerminar(copa) || europaSinTerminar(europa)) {
      setShowEndWarning(true)
      return
    }
    handleEndSeason()
  }

  const handleEndSeason = async () => {
    setShowEndWarning(false)
    setEndingLoading(true)
    setEndError(null)
    setPremiumRequiredMsg(null)
    try {
      const res = await fetch("/api/season/end", { method: "POST" })
      if (res.status === 402) {
        const data = await res.json()
        setPremiumRequiredMsg(data.message ?? "Has llegado al límite del plan gratuito.")
        return
      }
      if (!res.ok) throw new Error("request failed")
      const data = await res.json()
      const resumen = data.resumen
      setSummary(resumen)
      setPhase("season_summary")
      playSound(resumen.premios?.length > 0 ? "trofeo" : "exito")

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
    } catch {
      setEndError("No se pudo cerrar la temporada. Comprueba tu conexión e inténtalo de nuevo.")
    } finally {
      setEndingLoading(false)
    }
  }

  const handleNewSeason = async () => {
    setSummary(null)
    setSeasonNarrative(null)
    await loadPlayer()
  }

  const handleShareSummary = async () => {
    if (!playerState || !summary) return
    const url = `${window.location.origin}/jugador/${playerState.id}/temporada/${summary.temporada}`
    try {
      await navigator.clipboard.writeText(url)
      setSummaryLinkCopied(true)
      setTimeout(() => setSummaryLinkCopied(false), 2000)
    } catch {
      // Portapapeles no disponible: no crítico, se ignora igual que en dashboard.
    }
  }

  if (isPending || phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <VideoLoader label="Cargando temporada..." />
      </div>
    )
  }

  if (!playerState) return null

  const { carrera } = playerState
  const totalJornadas = 16
  const copa = carrera.copa
  const europa = carrera.europa
  const seleccion = carrera.seleccion
  const contrato = carrera.contrato
  const mercado = carrera.mercado
  const hasTransferOffers = (mercado?.ofertasActivas?.length ?? 0) > 0
  // Único cálculo de "qué toca ahora" para toda la página (hero card +
  // paneles de detalle) — ver lib/calendar.ts.
  const proximoPartido = getProximoPartido(carrera)

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

        {/* Cambio rápido de modo de juego, sin salir de la temporada — antes
            solo se podía cambiar desde Ajustes, obligando a abandonar el
            flujo de juego para acelerar o frenar el ritmo de una sesión
            concreta (ver auditoría UX, heurística 7, Ronda 8). */}
        {phase !== "no_season" && (
          <div>
            <button
              onClick={() => setShowModeSwitch((v) => !v)}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Modo: <span className="text-gray-300 font-semibold">{MODO_JUEGO_LABELS[carrera.modoJuego ?? "completo"]}</span> {showModeSwitch ? "▴" : "▾"}
            </button>
            {showModeSwitch && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {MODOS_JUEGO.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleChangeModoJuego(m.id)}
                    disabled={changingModo}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-colors disabled:opacity-60 ${
                      carrera.modoJuego === m.id
                        ? "bg-green-500/10 border-green-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <p className="font-bold">{m.label}</p>
                    <p className="text-gray-500 text-[10px] mt-0.5">{m.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modo de juego "simulado": sustituye toda la UI de partido a
            partido/pestañas mientras la temporada esté en curso por un único
            botón que resuelve todo (eventos + partidos de cualquier
            competición) automáticamente y cierra la temporada al terminar. */}
        {carrera.modoJuego === "simulado" && phase !== "no_season" && phase !== "season_over" && phase !== "season_summary" && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Modo simulado</p>
            <p className="text-gray-400 text-sm">
              Se resolverán automáticamente todos los partidos y eventos que queden de esta temporada.
            </p>
            <button
              onClick={handleSimularTemporadaCompleta}
              disabled={autoSeasonRunning}
              className="w-full py-3 bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-bold rounded-xl transition-colors"
            >
              {autoSeasonRunning ? `Simulando... (${autoSeasonStep})` : "⚡ Simular temporada completa →"}
            </button>
          </div>
        )}

        {/* Una sola vista para toda la temporada: Liga, Copa, competición
            europea y Selección viven aquí juntas (calendario unificado más
            abajo), sin pestañas que obliguen a cambiar de pantalla para ver
            qué competición tiene partido pendiente. */}
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
            {carrera.modoJuego !== "simulado" && phase === "event" && carrera.eventoActual && !eventNarrativo && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full border ${TIPO_COLORS[carrera.eventoActual.tipo]}`}>
                    {TIPO_LABELS[carrera.eventoActual.tipo]}
                  </span>
                  <p className="text-gray-500 text-xs">Evento de temporada</p>
                  {!!carrera.eventosPendientes?.length && (
                    <p className="text-gray-500 text-xs ml-auto">
                      +{carrera.eventosPendientes.length} más después de este
                    </p>
                  )}
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
            {carrera.modoJuego !== "simulado" && phase === "event" && eventNarrativo && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center space-y-5">
                <p className="text-gray-300 leading-relaxed">{eventNarrativo}</p>
                {geminiEventLoading && <VideoLoader variant="press" label="Última hora..." size={88} />}
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
            {carrera.modoJuego !== "simulado" && phase === "paron" && seleccion?.paron && (
              <div className="bg-gray-900 rounded-2xl border border-red-500/30 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{NATIONALITY_FLAGS[playerState.nationality] ?? "🏳️"}</span>
                  <div>
                    <p className="text-xs text-red-400 uppercase tracking-wider font-bold">Parón Internacional</p>
                    <h2 className="text-lg font-black text-white">Selección de {playerState.nationality}</h2>
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
                        {next.esLocal ? `${playerState.nationality} vs ${next.rival}` : `${next.rival} vs ${playerState.nationality}`}
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

            {/* Contract / transfer request — vive dentro de la carrera, no en el navbar.
                Las temporadas de contrato restantes se muestran aquí mismo, con el
                mismo aviso de urgencia que ya tenía el dashboard — antes había que
                salir de la temporada para verlas (ver informe-fallos.md, Ronda 8). */}
            {phase !== "no_season" && phase !== "season_summary" && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">Situación contractual</p>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">
                      {mercado?.enLista
                        ? "En lista de transferibles — a la espera de ofertas de clubes"
                        : `${carrera.club} · Rep. ${carrera.reputacion}/100`}
                    </p>
                  </div>
                  {mercado?.enLista ? (
                    <span className="shrink-0 text-xs font-bold px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full">
                      EN LISTA
                    </span>
                  ) : (
                    <button
                      onClick={handleRequestTransfer}
                      disabled={requestingTransfer}
                      className="shrink-0 px-4 py-2 bg-orange-500 hover:bg-orange-400 disabled:bg-orange-800 text-black font-bold rounded-lg text-xs transition-colors"
                    >
                      {requestingTransfer ? "Tramitando..." : "Solicitar traspaso"}
                    </button>
                  )}
                </div>
                {contrato && (
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-800">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      contrato.temporadasRestantes <= 1
                        ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                        : "bg-gray-800 text-gray-400 border-gray-700"
                    }`}>
                      {contrato.temporadasRestantes} temporada{contrato.temporadasRestantes !== 1 ? "s" : ""} de contrato
                    </span>
                    {contrato.temporadasRestantes <= 1 && (
                      <span className="text-orange-400/80 text-xs">Expira pronto — decidirás tu futuro al cerrar la temporada</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Real market offers (from other users, /mercado) */}
            {pendingMarketOffers > 0 && phase !== "season_summary" && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-green-400 font-bold text-sm">
                    {pendingMarketOffers} oferta{pendingMarketOffers > 1 ? "s" : ""} de mercado
                  </p>
                  <p className="text-green-300/60 text-xs">Otro jugador quiere ficharte</p>
                </div>
                <button
                  onClick={() => router.push("/mercado")}
                  className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg text-xs transition-colors"
                >
                  Ver →
                </button>
              </div>
            )}

            {/* Transfer notification (NPC club offers) */}
            {hasTransferOffers && phase !== "season_summary" && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-yellow-400 font-bold text-sm">
                    {mercado!.ofertasActivas.length} oferta{mercado!.ofertasActivas.length > 1 ? "s" : ""} de club
                  </p>
                  <p className="text-yellow-300/60 text-xs">Tienes propuestas esperando respuesta</p>
                </div>
                <button
                  onClick={() => router.push("/mercado")}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg text-xs transition-colors"
                >
                  Ver →
                </button>
              </div>
            )}

            {/* Próximo partido — único punto de entrada para jugar, sea de
                Liga, Copa, competición europea o Selección (ver
                lib/calendar.ts: getProximoPartido intercala las competiciones
                por orden cronológico real). Ya no existe un "próximo partido
                de Liga" aparte del de Copa o Europa — solo hay un próximo
                partido, punto, y este es el único botón para jugarlo. */}
            {carrera.modoJuego !== "simulado" && phase === "next_match" && (() => {
              const proximo = proximoPartido
              if (!proximo) return null
              const esLiga = proximo.tipo === "liga"
              const nombreEquipo = esLiga || proximo.tipo === "copa" || proximo.tipo === "europa"
                ? carrera.club
                : playerState.nationality
              const rutaJuego = proximo.tipo === "liga" ? "/match" : `/match?tipo=${proximo.tipo}`
              const partidosSancion = esLiga ? (carrera.sancion?.partidosRestantes ?? 0) : 0
              // Modo "decisivos": últimas 6 jornadas de liga (ascenso/descenso en juego)
              // se juegan siempre a mano; el resto se puede simular de un click.
              // Solo aplica a partidos de Liga — Copa/Europa/Selección siempre se juegan.
              const esJornadaDecisiva = (carrera.jornadaActual ?? 0) > 10
              const puedeSimular = esLiga && carrera.modoJuego === "decisivos" && !esJornadaDecisiva
              return (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Próximo partido</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${COMPETICION_COLORS[proximo.tipo]}`}>
                      {proximo.competicion}
                    </span>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      {formatRonda(proximo.ronda)} · {proximo.mes}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-black text-white">
                        {proximo.esLocal ? `${nombreEquipo} vs ${proximo.rival}` : `${proximo.rival} vs ${nombreEquipo}`}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        {proximo.esLocal ? "En casa" : "Fuera"}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${proximo.esLocal ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {proximo.esLocal ? "LOCAL" : "VISITANTE"}
                    </span>
                  </div>
                  {partidosSancion > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                        <span className="text-red-400 text-lg">🟥</span>
                        <p className="text-red-300 text-sm">
                          Estás sancionado. El equipo juega este partido sin ti.
                        </p>
                      </div>
                      <button
                        onClick={handleResolveSancion}
                        disabled={resolvingSancion}
                        className="w-full py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors"
                      >
                        {resolvingSancion ? "Resolviendo..." : "Ver resultado sin mí →"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {esLiga && (playerState?.posicionesSecundarias?.length ?? 0) > 0 && (
                        <label className="flex items-center gap-3 bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={jugarComoSecundaria}
                            onChange={(e) => setJugarComoSecundaria(e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className="text-gray-300 text-sm">
                            Jugar como {POSITION_LABELS[playerState!.posicionesSecundarias![0] as keyof typeof POSITION_LABELS]} (posición secundaria)
                          </span>
                        </label>
                      )}
                      <button
                        onClick={() => router.push(esLiga && jugarComoSecundaria ? "/match?posicion=secundaria" : rutaJuego)}
                        className={`w-full py-3 font-bold rounded-xl transition-colors ${
                          puedeSimular ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-green-500 hover:bg-green-400 text-black"
                        }`}
                      >
                        Jugar partido →
                      </button>
                      {puedeSimular && (
                        <button
                          onClick={handleSimularPartido}
                          disabled={simulatingMatch}
                          className="w-full py-3 bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-bold rounded-xl transition-colors"
                        >
                          {simulatingMatch ? "Simulando..." : "⚡ Simular resultado →"}
                        </button>
                      )}
                    </div>
                  )}
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
                {showEndWarning && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-left space-y-3">
                    <p className="text-orange-300 text-sm font-semibold">
                      Todavía tienes {copaSinTerminar(carrera.copa) && europaSinTerminar(carrera.europa)
                        ? "Copa del Rey y competición europea"
                        : copaSinTerminar(carrera.copa) ? "Copa del Rey" : "competición europea"} sin terminar esta temporada.
                    </p>
                    <p className="text-orange-300/70 text-xs">
                      Si terminas la temporada ahora, se dará por perdida la oportunidad de ganar ese título este año — la próxima temporada empieza una eliminatoria nueva.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowEndWarning(false)}
                        className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        Seguir jugando esta temporada
                      </button>
                      <button
                        onClick={handleEndSeason}
                        disabled={endingLoading}
                        className="flex-1 py-2 bg-orange-500 hover:bg-orange-400 disabled:bg-orange-800 text-black text-sm font-bold rounded-lg transition-colors"
                      >
                        {endingLoading ? "Calculando..." : "Terminar de todos modos"}
                      </button>
                    </div>
                  </div>
                )}
                {!showEndWarning && (
                  <button
                    onClick={handleRequestEndSeason}
                    disabled={endingLoading}
                    className="px-8 py-3 bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-black font-bold rounded-xl transition-colors"
                  >
                    {endingLoading ? "Calculando..." : "Ver resumen de temporada →"}
                  </button>
                )}
                {endError && <p className="text-red-400 text-sm">{endError}</p>}
                {premiumRequiredMsg && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 space-y-3">
                    <p className="text-yellow-400 font-bold text-sm">🔒 {premiumRequiredMsg}</p>
                    <button
                      onClick={handleUpgrade}
                      disabled={checkoutLoading}
                      className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-800 text-black font-bold rounded-lg transition-colors text-sm"
                    >
                      {checkoutLoading ? "Redirigiendo..." : "Hazte Premium — 9,99 € de por vida"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Season summary */}
            {phase === "season_summary" && summary && (
              <div className="space-y-5">
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5">
                  <h2 className="text-xl font-black">Resumen · Temporada {summary.temporada}</h2>
                  <p className="text-gray-400 text-sm">{summary.club}</p>

                  {/* Gemini season narrative */}
                  {seasonNarrativeLoading && <VideoLoader variant="trophy" label="Cerrando la temporada..." size={88} />}
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
                      <div className="w-full h-40">
                        <TrophyScene />
                      </div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider text-center">Premios</p>
                      {summary.premios.map((p) => (
                        <div key={p} className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2">
                          <span className="text-yellow-400 text-lg">🏆</span>
                          <span className="text-yellow-300 font-semibold text-sm">{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {summary.liga && (
                    <div className={`rounded-xl px-4 py-3 flex items-center gap-3 border ${
                      summary.liga.cambioDivision === "ascenso"
                        ? "bg-green-500/10 border-green-500/30"
                        : summary.liga.cambioDivision === "descenso"
                          ? "bg-red-500/10 border-red-500/30"
                          : "bg-gray-800/60 border-gray-700"
                    }`}>
                      <span className="text-xl">
                        {summary.liga.cambioDivision === "ascenso" ? "🏆" : summary.liga.cambioDivision === "descenso" ? "📉" : "📊"}
                      </span>
                      <div>
                        <p className={`font-bold text-sm ${
                          summary.liga.cambioDivision === "ascenso" ? "text-green-300"
                          : summary.liga.cambioDivision === "descenso" ? "text-red-300" : "text-gray-300"
                        }`}>
                          {summary.liga.posicionFinal}º de {summary.liga.totalEquipos}
                          {summary.liga.cambioDivision === "ascenso" && " · ¡Ascenso!"}
                          {summary.liga.cambioDivision === "descenso" && " · Descenso"}
                        </p>
                        {summary.liga.cambioDivision !== "ninguno" && (
                          <p className={`text-xs ${summary.liga.cambioDivision === "ascenso" ? "text-green-400/70" : "text-red-400/70"}`}>
                            {summary.liga.clubAnterior} → {summary.liga.clubNuevo} ({summary.liga.ligaNueva})
                          </p>
                        )}
                      </div>
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
                        <p className="text-orange-300 font-bold text-sm">Tu contrato ha expirado</p>
                        <p className="text-orange-400/70 text-xs">Al empezar la nueva temporada, tendrás que decidir tu futuro</p>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleShareSummary}
                  className="w-full text-xs text-gray-500 hover:text-white transition-colors"
                >
                  {summaryLinkCopied ? "✓ Enlace copiado" : "🔗 Compartir este resumen"}
                </button>
                <button
                  onClick={handleNewSeason}
                  className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors"
                >
                  Comenzar Temporada {summary.temporada + 1} →
                </button>
              </div>
            )}

            {/* Calendario unificado de la temporada — Liga, Copa, competición
                europea y Selección repartidos por meses en una sola lista, en
                vez de resultados de liga sueltos (ver lib/calendar.ts). Así
                se ve de un vistazo cómo se entrelazan todas las
                competiciones en una temporada real. */}
            {phase !== "no_season" && phase !== "season_summary" && carrera.fixtures.length > 0 && (
              <CalendarioTemporadaPanel carrera={carrera} />
            )}

            {/* Detalle de cada competición — bracket de Copa, tabla de grupo
                europea, caps de Selección. Ya no viven detrás de una pestaña
                propia: son solo lectura (historial y estado), el único botón
                para jugar es el de "Próximo partido" de más arriba, sea cual
                sea la competición a la que pertenezca. */}
            {phase !== "no_season" && phase !== "season_summary" && copa && (
              <CopaBracketPanel copa={copa} club={carrera.club} esProximo={proximoPartido?.tipo === "copa"} />
            )}
            {phase !== "no_season" && phase !== "season_summary" && europa && (
              <EuropaPanel europa={europa} club={carrera.club} esProximo={proximoPartido?.tipo === "europa"} />
            )}
            {phase !== "no_season" && phase !== "season_summary" && seleccion?.convocado && (
              <SeleccionPanel
                seleccion={seleccion}
                nacionalidad={playerState.nationality}
                torneoEsProximo={proximoPartido?.tipo === "seleccion_torneo"}
              />
            )}
        </>
      </div>
    </main>
  )
}

// ─── Calendario unificado de temporada ────────────────────────────────────────
//
// Sustituye a la antigua lista de "Resultados de liga": une Liga, Copa,
// competición europea y Selección en una sola línea de tiempo agrupada por
// mes (ver lib/calendar.ts), para que jugar un partido de Champions o de
// Copa no dependa de acordarse de cambiar de pestaña.

function CalendarioTemporadaPanel({ carrera }: { carrera: PlayerState["carrera"] }) {
  const meses = agruparPorMes(buildCalendarioTemporada(carrera))
  const hayAlgo = meses.some((m) => m.entries.length > 0)
  if (!hayAlgo) return null

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">Calendario de la temporada</p>
      <div className="space-y-4">
        {meses.map(({ mes, entries }) => (
          <div key={mes} className="space-y-2">
            <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">{mes}</p>
            <div className="space-y-1.5">
              {entries.map((e) => (
                <div
                  key={e.key}
                  className={`flex items-center justify-between text-sm rounded-lg px-2 py-1.5 ${
                    e.esProximo ? "bg-gray-800/80 border border-gray-700" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${COMPETICION_COLORS[e.tipo as CompeticionTipo]}`}>
                      {e.competicionAbbr}
                    </span>
                    <span className="text-gray-600 text-xs shrink-0">{formatRondaCorta(e.ronda)}</span>
                    <span className={`truncate ${e.esProximo ? "text-white font-semibold" : "text-gray-300"}`}>
                      {e.esLocal ? "vs " : "@ "}{e.rival}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    {e.jugado ? (
                      <>
                        <span className="text-gray-400 font-mono">{e.resultado ?? "-"}</span>
                        {!!e.golesJugador && e.golesJugador > 0 && (
                          <span className="text-yellow-400 text-xs font-bold">{e.golesJugador}G</span>
                        )}
                        {e.valoracion != null && (
                          <span className={`font-mono text-xs font-bold ${
                            e.valoracion >= 7 ? "text-green-400" : e.valoracion >= 5.5 ? "text-blue-400" : "text-orange-400"
                          }`}>
                            {e.valoracion.toFixed(1)}
                          </span>
                        )}
                        {e.ganado != null && e.valoracion == null && (
                          <span className={`text-xs font-bold ${e.ganado ? "text-green-400" : e.empate ? "text-blue-400" : "text-red-400"}`}>
                            {e.ganado ? "V" : e.empate ? "E" : "D"}
                          </span>
                        )}
                      </>
                    ) : e.esProximo ? (
                      <span className="text-xs font-bold text-green-400">PRÓXIMO</span>
                    ) : (
                      <span className="text-gray-700 text-xs">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Selección Nacional panel ─────────────────────────────────────────────────

// Panel de solo lectura: estado y historial de la Selección Nacional (parón
// y torneo de verano). Ya no lleva botones de "jugar" propios — el único
// punto para jugar cualquier partido, sea de la competición que sea, es la
// tarjeta de "Próximo partido" de arriba (ver lib/calendar.ts). Tenerlos aquí
// también permitía saltarse el orden cronológico real (p. ej. jugar ya el
// torneo de verano aunque la Liga siguiera pendiente).
function SeleccionPanel({
  seleccion,
  nacionalidad,
  torneoEsProximo,
}: {
  seleccion: SeleccionState
  nacionalidad: string
  torneoEsProximo: boolean
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
            <span className="text-2xl">{NATIONALITY_FLAGS[nacionalidad] ?? "🏳️"}</span>
            <h3 className="font-black text-white">Selección de {nacionalidad}</h3>
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
                {next.esLocal ? `${nacionalidad} vs ${next.rival}` : `${next.rival} vs ${nacionalidad}`}
              </p>
              <p className="text-xs text-red-300/70">Es tu próximo partido — juégalo arriba ↑</p>
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
                <p className="text-lg font-black">{next.esLocal ? `${nacionalidad} vs ${next.rival}` : `${next.rival} vs ${nacionalidad}`}</p>
                <p className="text-xs text-red-300/70">
                  {torneoEsProximo ? "Es tu próximo partido — juégalo arriba ↑" : "Pendiente — se juega al terminar la temporada de club"}
                </p>
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
                <p className="text-lg font-black">{nacionalidad} vs {el.rival}</p>
                <p className="text-xs text-red-300/70">
                  {torneoEsProximo ? "Es tu próximo partido — juégalo arriba ↑" : "Pendiente — se juega al terminar la temporada de club"}
                </p>
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

// Solo lectura, igual que SeleccionPanel — el bracket de Copa se muestra
// siempre que exista, pero jugar la siguiente ronda pasa por la tarjeta de
// "Próximo partido" de arriba (que ya decide si de verdad toca Copa ahora
// mismo o si hay un partido de Liga/Europa cronológicamente antes).
function CopaBracketPanel({ copa, club, esProximo }: { copa: CopaState; club: string; esProximo: boolean }) {
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
                  {formatRondaCorta(ronda)}
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
              {formatRonda(rondaActual)} · {copa.esLocal ? "En casa" : "Fuera"}
            </p>
            <p className="text-lg font-black text-white">
              {copa.esLocal ? `${club} vs ${copa.rival}` : `${copa.rival} vs ${club}`}
            </p>
            <p className="text-xs text-yellow-300/70">
              {esProximo ? "Es tu próximo partido — juégalo arriba ↑" : "Pendiente — todavía no le toca en el calendario"}
            </p>
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
              Eliminado en {formatRonda(copa.historial.at(-1)?.ronda ?? "fase anterior")} ante {copa.historial.at(-1)?.rival ?? "rival"}
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
                <span className="text-gray-600 text-xs w-10">{formatRondaCorta(h.ronda)}</span>
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

// Solo lectura, mismo motivo que CopaBracketPanel: jugar pasa siempre por la
// tarjeta de "Próximo partido" de arriba.
function EuropaPanel({ europa, club, esProximo }: { europa: EuropaState; club: string; esProximo: boolean }) {
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
            <p className="text-xs text-blue-300/70">
              {esProximo ? "Es tu próximo partido — juégalo arriba ↑" : "Pendiente — todavía no le toca en el calendario"}
            </p>
          </div>
        )}

        {/* Knockout match pending */}
        {!nextGroupMatch && knockoutPending && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {formatRonda(eliminatoriaRondas[el!.rondaIdx] ?? "Eliminatoria")} · {el!.esLocal ? "En casa" : "Fuera"}
            </p>
            <p className="text-lg font-black text-white">
              {el!.esLocal ? `${club} vs ${el!.rival}` : `${el!.rival} vs ${club}`}
            </p>
            <p className="text-xs text-blue-300/70">
              {esProximo ? "Es tu próximo partido — juégalo arriba ↑" : "Pendiente — todavía no le toca en el calendario"}
            </p>
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
                <span className="text-gray-600 text-xs w-10">{formatRondaCorta(h.ronda)}</span>
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

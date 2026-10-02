"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import DiceRoll from "@/components/DiceRoll"
import DecisionCard from "@/components/DecisionCard"
import ResultReveal from "@/components/ResultReveal"
import VideoLoader from "@/components/VideoLoader"

const FieldScene = dynamic(() => import("@/components/FieldScene"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-950 animate-pulse" />,
})
import {
  initMatchState,
  type InteractiveMatchState,
  type Situacion,
  type TurnResult,
} from "@/engine/match-interactive"
import { type Player, type DecisionOption, Posicion } from "@/engine/types"
import type { MatchContext, RespuestaTurno } from "@/lib/match-server"
import { resolveStatValue } from "@/engine/decision"
import { getMatchNarrative } from "@/lib/narrative"
import { getResultLabel } from "@/lib/result-display"
import { playSound, type SoundName } from "@/lib/sound"
import { NATIONALITY_FLAGS } from "@/lib/player-config"

const RESULT_SOUND: Record<string, SoundName> = {
  PERFECTO: "perfecto", EXITO: "exito", PARCIAL: "parcial", FALLO: "fallo", CRITICO_FALLO: "critico_fallo",
}
type Phase = "loading" | "error" | "situation" | "rolling" | "result" | "finished"

const POSICION_LABELS: Partial<Record<Posicion, string>> = {
  [Posicion.PORTERO]: "Portero",
  [Posicion.DEFENSA_CENTRAL]: "Def. Central",
  [Posicion.LATERAL]: "Lateral",
  [Posicion.MEDIOCENTRO]: "Mediocentro",
  [Posicion.MEDIAPUNTA]: "Mediapunta",
  [Posicion.EXTREMO]: "Extremo",
  [Posicion.DELANTERO]: "Delantero",
}

function MatchPageInner() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [phase, setPhase] = useState<Phase>("loading")
  const [loadError, setLoadError] = useState("")
  const [matchId, setMatchId] = useState<string | null>(null)
  const [enginePlayer, setEnginePlayer] = useState<Player | null>(null)
  const [matchContext, setMatchContext] = useState<MatchContext | null>(null)
  const [matchState, setMatchState] = useState<InteractiveMatchState>(initMatchState())
  const [situacion, setSituacion] = useState<Situacion | null>(null)
  const [selectedOpcion, setSelectedOpcion] = useState<DecisionOption | null>(null)
  const [diceRoll, setDiceRoll] = useState(1)
  const [diceRolling, setDiceRolling] = useState(false)
  // Respuesta del servidor para el turno en curso: se aplica cuando termina
  // la animación del dado, para no destapar el resultado antes de tiempo.
  const [turnoPendiente, setTurnoPendiente] = useState<RespuestaTurno | null>(null)
  const [ultimoTurno, setUltimoTurno] = useState<RespuestaTurno | null>(null)
  const [lastResult, setLastResult] = useState<TurnResult | null>(null)
  const [lastEncajado, setLastEncajado] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false)
  const [geminiNarrative, setGeminiNarrative] = useState<string | null>(null)
  const [geminiLoading, setGeminiLoading] = useState(false)
  // Rasgo "Polivalente": el servidor decide la posición efectiva a partir de
  // ?posicion=secundaria (ver lib/match-server.ts, iniciarPartido).
  const [posicionEfectiva, setPosicionEfectiva] = useState<Posicion | undefined>(undefined)

  useEffect(() => {
    if (!isPending && !session) router.push("/login")
  }, [session, isPending, router])

  // El partido lo crea (o lo retoma, si estaba a medias) el servidor: el
  // dado y los resultados ya no se calculan en el navegador.
  useEffect(() => {
    if (!session) return
    const tipo = searchParams.get("tipo") ?? "liga"
    const posicion = searchParams.get("posicion") ?? undefined
    fetch("/api/match/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, posicion }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (res.status === 404) { router.push("/create-player"); return }
        if (res.status === 409 && data.error === "match_in_progress" && data.tipo && data.tipo !== tipo) {
          router.replace(`/match?tipo=${data.tipo}`)
          return
        }
        if (!res.ok) {
          setLoadError(data.message ?? "")
          setPhase("error")
          return
        }
        setMatchId(data.matchId)
        setEnginePlayer(data.jugador)
        setMatchContext(data.contexto)
        setMatchState(data.matchState)
        setSituacion(data.situacion)
        setPosicionEfectiva(data.posicionEfectiva ?? undefined)
        setPhase("situation")
      })
      .catch(() => setPhase("error"))
  }, [session, router, searchParams])

  const handleSelectOpcion = async (opcion: DecisionOption) => {
    if (phase !== "situation" || !matchId) return
    setSelectedOpcion(opcion)
    setSaveError("")
    setPhase("rolling")
    playSound("dado")

    try {
      const res = await fetch("/api/match/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, turno: matchState.turno, opcionId: opcion.id }),
      })
      const data = await res.json()
      if (res.status === 409) {
        // El partido cambió en otro sitio (otra pestaña, simulado…): se
        // recarga desde el servidor en vez de seguir con un estado viejo.
        window.location.reload()
        return
      }
      if (!res.ok) throw new Error(data.error ?? "turn failed")
      setTurnoPendiente(data as RespuestaTurno)
      setDiceRoll(data.roll)
      setDiceRolling(true)
    } catch {
      setSaveError("No se pudo resolver la jugada — revisa tu conexión y vuelve a elegir.")
      setSelectedOpcion(null)
      setPhase("situation")
    }
  }

  const handleDiceComplete = useCallback(() => {
    if (!enginePlayer || !situacion || !selectedOpcion || !turnoPendiente) return
    setDiceRolling(false)
    const resp = turnoPendiente
    const result = resp.result

    // Un único sonido por turno: gol, si no tarjeta, si no el resultado general.
    if (result.gol) playSound("gol")
    else if (result.tarjeta) playSound("tarjeta")
    else playSound(RESULT_SOUND[result.resultado] ?? "exito")

    setLastResult(result)
    setLastEncajado(result.marcador.visitante > matchState.marcador.visitante)
    setMatchState(resp.matchState)
    setUltimoTurno(resp)
    setTurnoPendiente(null)
    setGeminiNarrative(null)
    setGeminiLoading(true)
    setPhase("result")

    getMatchNarrative({
      playerName: enginePlayer.personal.nombre,
      playerPosition: enginePlayer.posicionPrincipal,
      minuto: situacion.minuto,
      situacion: situacion.descripcion,
      accion: selectedOpcion.texto,
      dado: resp.roll,
      resultado: getResultLabel(result.resultado),
      narrativoBase: result.narrativo,
      gol: result.gol,
    }).then((text) => {
      setGeminiNarrative(text)
      setGeminiLoading(false)
    })
  }, [enginePlayer, situacion, selectedOpcion, turnoPendiente, matchState.marcador])

  const handleContinue = () => {
    if (!ultimoTurno) return
    // El último turno ya guardó el partido en el servidor (api/match/turn).
    if (ultimoTurno.finished) {
      setPhase("finished")
      return
    }
    setSituacion(ultimoTurno.situacion)
    setSelectedOpcion(null)
    setLastResult(null)
    setGeminiNarrative(null)
    setGeminiLoading(false)
    setPhase("situation")
  }

  if (isPending || phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <VideoLoader label="Cargando partido..." />
      </div>
    )
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center space-y-4">
          <p className="text-red-400">{loadError || "Error cargando el partido."}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2 bg-gray-800 text-white rounded-lg"
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    )
  }

  if (phase === "finished") {
    const esLocal = matchContext?.esLocal ?? true
    // Igual que en handleContinue: marcador.local/visitante ya son "yo"/"rival"
    // sin importar esLocal — esLocal solo reordena qué número se muestra primero.
    const ganado = matchState.marcador.local > matchState.marcador.visitante
    const empate = matchState.marcador.local === matchState.marcador.visitante

    const valoracionColor =
      matchState.valoracion >= 7.5 ? "text-yellow-400" :
      matchState.valoracion >= 6.5 ? "text-green-400" :
      matchState.valoracion >= 5.5 ? "text-blue-400" : "text-orange-400"

    const resultBadge = ganado
      ? "bg-green-500/20 text-green-400 border-green-500/40"
      : empate
        ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
        : "bg-red-500/20 text-red-400 border-red-500/40"
    const resultText = ganado ? "VICTORIA" : empate ? "EMPATE" : "DERROTA"

    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <p className="text-gray-500 text-sm uppercase tracking-widest mb-1">
              {matchContext?.competicion ?? "Liga"} · {matchContext?.ronda}
            </p>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${resultBadge}`}>
              {resultText}
            </span>
            <div className="text-5xl font-black my-3">
              {esLocal
                ? `${matchState.marcador.local} — ${matchState.marcador.visitante}`
                : `${matchState.marcador.visitante} — ${matchState.marcador.local}`}
            </div>
            <p className="text-gray-500 text-sm">
              {esLocal
                ? `${matchContext?.club ?? "—"} vs ${matchContext?.rival ?? "Rival"}`
                : `${matchContext?.rival ?? "Rival"} vs ${matchContext?.club ?? "—"}`}
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-black text-white">{matchState.goles}</p>
              <p className="text-gray-500 text-xs mt-1">Goles</p>
            </div>
            <div>
              <p className={`text-3xl font-black ${valoracionColor}`}>{matchState.valoracion.toFixed(1)}</p>
              <p className="text-gray-500 text-xs mt-1">Valoración</p>
            </div>
            <div>
              <p className="text-3xl font-black text-white">{matchState.asistencias}</p>
              <p className="text-gray-500 text-xs mt-1">Asistencias</p>
            </div>
          </div>

          <div className="space-y-2">
            {matchState.log.map((r, i) => (
              <div key={i} className="bg-gray-900 rounded-lg px-4 py-2 flex items-center justify-between text-sm">
                <span className="text-gray-400">Turno {i + 1} · {r.opcion.texto}</span>
                <span className={r.gol ? "text-yellow-400 font-bold" : r.asistencia ? "text-blue-400 font-bold" : "text-gray-600"}>
                  {r.gol ? "GOL" : r.asistencia ? "AST" : `${r.score}`}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push("/season")}
            className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors"
          >
            Volver a la temporada
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="sticky top-0 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          {/* Botón de salida — antes no había ninguna forma de abandonar el
              partido salvo el gesto "atrás" del navegador, sin aviso ni
              confirmación (ver auditoría UX, heurística 3). Nada del partido
              se guarda hasta el último turno, así que salir aquí no deja
              ningún dato a medias. */}
          <button
            onClick={() => setShowAbandonConfirm(true)}
            aria-label="Abandonar partido"
            className="shrink-0 w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 truncate">
              {enginePlayer?.personal.apodo ? `"${enginePlayer.personal.apodo}"` : enginePlayer?.personal.nombre} ·{" "}
              {POSICION_LABELS[posicionEfectiva ?? enginePlayer?.posicionPrincipal ?? Posicion.DELANTERO]}
              {posicionEfectiva && <span className="text-orange-400"> (fuera de posición)</span>}
            </p>
            <p className="text-xs text-gray-600 truncate">
              {matchContext?.club ?? "—"} · {matchContext?.competicion}
            </p>
          </div>
          <div className="text-center shrink-0">
            <p className="text-xl font-black">
              {matchState.marcador.local} — {matchState.marcador.visitante}
            </p>
            <p className="text-xs text-gray-500">
              {situacion ? `min. ${situacion.minuto}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-500">Turno</p>
            <p className="text-sm font-bold">{phase === "result" && ultimoTurno ? ultimoTurno.turno : matchState.turno}/{matchState.totalTurnos}</p>
          </div>
        </div>
        {showAbandonConfirm && (
          <div className="max-w-lg mx-auto mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-2">
            <p className="text-red-300 text-xs">
              ¿Salir del partido? Queda guardado tal cual: al volver lo retomas en el mismo turno.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/season")}
                className="flex-1 py-2 bg-red-500 hover:bg-red-400 text-black font-bold rounded-lg text-xs transition-colors"
              >
                Salir
              </button>
              <button
                onClick={() => setShowAbandonConfirm(false)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg text-xs transition-colors"
              >
                Seguir jugando
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Match context banner */}
        {matchContext && matchContext.tipo !== "liga" && (
          <div className={`border rounded-xl px-4 py-2 flex items-center gap-3 ${
            matchContext.tipo === "seleccion" || matchContext.tipo === "seleccion_torneo"
              ? "bg-red-500/10 border-red-500/30"
              : "bg-yellow-500/10 border-yellow-500/30"
          }`}>
            <span className={`text-sm font-bold ${matchContext.tipo === "seleccion" || matchContext.tipo === "seleccion_torneo" ? "text-red-400" : "text-yellow-400"}`}>
              {matchContext.tipo === "seleccion" || matchContext.tipo === "seleccion_torneo"
                ? `${NATIONALITY_FLAGS[matchContext.club] ?? "🏳️"} `
                : ""}
              {matchContext.competicion}
            </span>
            <span className={`text-xs ${matchContext.tipo === "seleccion" || matchContext.tipo === "seleccion_torneo" ? "text-red-300/60" : "text-yellow-300/60"}`}>{matchContext.ronda}</span>
            <span className={`text-xs ml-auto ${matchContext.tipo === "seleccion" || matchContext.tipo === "seleccion_torneo" ? "text-red-300/40" : "text-yellow-300/40"}`}>
              vs {matchContext.rival} · {matchContext.esLocal ? "Local" : "Visitante"}
            </span>
          </div>
        )}

        {(phase === "situation" || phase === "rolling" || phase === "result") && (
          <div className="w-full h-44 sm:h-56 rounded-2xl border border-gray-800 overflow-hidden">
            <FieldScene
              phase={phase === "rolling" ? "acting" : phase === "result" ? "result" : "idle"}
              resultado={lastResult?.resultado}
              gol={lastResult?.gol}
              peligroPropio={situacion?.peligroPropio}
              encajado={lastEncajado}
              tarjeta={lastResult?.tarjeta}
            />
          </div>
        )}

        {(phase === "situation" || phase === "rolling") && situacion && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                situacion.peligroPropio
                  ? "text-red-400 bg-red-400/10"
                  : situacion.esOportunidadGol
                    ? "text-green-400 bg-green-400/10"
                    : "text-gray-400 bg-gray-400/10"
              }`}>
                {situacion.peligroPropio ? "PELIGRO EN TU ÁREA" : situacion.esOportunidadGol ? "OPORTUNIDAD DE GOL" : "JUGADA"}
              </span>
              <span className="text-xs text-gray-500">min. {situacion.minuto}</span>
            </div>
            <p className="text-white font-semibold leading-relaxed">{situacion.descripcion}</p>
          </div>
        )}

        {phase === "situation" && situacion && enginePlayer && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Elige una acción</p>
            {situacion.opciones.map((opcion) => (
              <DecisionCard
                key={opcion.id}
                opcion={opcion}
                statValue={resolveStatValue(opcion.statPrincipal, enginePlayer)}
                onSelect={() => handleSelectOpcion(opcion)}
                selected={selectedOpcion?.id === opcion.id}
              />
            ))}
          </div>
        )}

        {(phase === "rolling" || phase === "result") && selectedOpcion && enginePlayer && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Acción elegida</p>
            <DecisionCard
              opcion={selectedOpcion}
              statValue={resolveStatValue(selectedOpcion.statPrincipal, enginePlayer)}
              onSelect={() => {}}
              selected
              disabled
            />
          </div>
        )}

        {(phase === "rolling" || phase === "result") && (
          <div className="flex justify-center py-4">
            <DiceRoll
              rolling={diceRolling}
              finalValue={diceRoll}
              onComplete={handleDiceComplete}
            />
          </div>
        )}

        {phase === "result" && lastResult && (
          <div className="space-y-3">
            {saveError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-red-300 text-sm">{saveError}</p>
              </div>
            )}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
              <ResultReveal
                result={lastResult}
                onContinue={handleContinue}
                isLastTurn={!!ultimoTurno?.finished}
                geminiNarrative={geminiNarrative}
                geminiLoading={geminiLoading}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-800 text-xs text-gray-600">
          <span>Val. {matchState.valoracion.toFixed(1)}</span>
          <span>{matchState.goles}G · {matchState.asistencias}A · {matchState.tiros} tiros</span>
        </div>
      </div>
    </main>
  )
}

export default function MatchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <VideoLoader label="Cargando partido..." />
      </div>
    }>
      <MatchPageInner />
    </Suspense>
  )
}

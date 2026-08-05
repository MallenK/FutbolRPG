"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import DiceRoll from "@/components/DiceRoll"
import DecisionCard from "@/components/DecisionCard"
import ResultReveal from "@/components/ResultReveal"

const FieldScene = dynamic(() => import("@/components/FieldScene"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-950 animate-pulse" />,
})
import {
  initMatchState,
  getSituacionForTurn,
  resolveDecisionWithDice,
  type InteractiveMatchState,
  type Situacion,
  type TurnResult,
} from "@/engine/match-interactive"
import {
  type Player,
  type DecisionOption,
  type StatsTecnicos,
  type StatsFisicos,
  type StatsTacticos,
  type StatsMentales,
  type Confianza,
  type Carrera,
  Posicion,
} from "@/engine/types"
import { resolveStatValue } from "@/engine/decision"
import { getMatchNarrative } from "@/lib/narrative"
import { getResultLabel } from "@/lib/result-display"
import {
  COPA_RONDAS,
  EUROPA_COMPETICION_LABELS,
  type CopaState,
  type EuropaState,
  type SeleccionState,
} from "@/lib/world"

type Phase = "loading" | "error" | "situation" | "rolling" | "result" | "saving" | "finished"

type DbPlayer = {
  id: string
  name: string
  position: string
  nationality: string
  age: number
  attributes: unknown
  state: unknown
}

type MatchContext = {
  tipo: "liga" | "copa" | "europa" | "seleccion" | "seleccion_torneo"
  rival: string
  esLocal: boolean
  club: string
  competicion: string
  ronda: string
}

function mapDbPlayer(dbPlayer: DbPlayer): Player {
  const attrs = dbPlayer.attributes as {
    tecnicos: StatsTecnicos
    fisicos: StatsFisicos
    tacticos: StatsTacticos
    mentales: StatsMentales
  }
  const state = dbPlayer.state as {
    fatiga: number; forma: number; moral: number; riesgoLesion: number
    confianza: Confianza; carrera: Carrera
    origen?: string; personalidad?: string; estiloJuego?: string
    traits?: string[]; potencial?: number
    piernaDominante?: string; altura?: number; peso?: number
    apodo?: string; dorsal?: number
  }

  const fillStats = (group: Record<string, number>, defaults: Record<string, number>): Record<string, number> => {
    return { ...defaults, ...group }
  }
  const defaultTec = { control:50,pase:50,tiro:50,regate:50,cabeceo:50,centros:50,entradas:50,reflejos:50 }
  const defaultFis = { resistencia:50,velocidad:50,aceleracion:50,fuerza:50,salto:50,agilidad:50 }
  const defaultTac = { posicionamiento:50,vision:50,decisiones:50,presion_alta:50,colocacion:50 }
  const defaultMen = { disciplina:50,confianza:50,presion:50,liderazgo:50,concentracion:50,ambicion:50 }

  return {
    id: dbPlayer.id,
    personal: {
      nombre: dbPlayer.name,
      apodo: state.apodo,
      edad: dbPlayer.age,
      nacionalidad: dbPlayer.nationality,
      genero: "M",
      piernaDominante: (state.piernaDominante as "derecho"|"izquierdo"|"ambidiestro") ?? "derecho",
      altura: state.altura ?? 180,
      peso: state.peso ?? 75,
      dorsal: state.dorsal ?? 10,
      fechaNacimiento: "",
      cantera: "Academia",
      representante: "",
    },
    posicionPrincipal: dbPlayer.position as Posicion,
    posicionesSecundarias: [],
    origen: state.origen ?? "academia",
    personalidad: state.personalidad ?? "profesional",
    estiloJuego: state.estiloJuego ?? "",
    traits: state.traits ?? [],
    potencial: state.potencial ?? 3,
    tecnicos: fillStats(attrs.tecnicos as unknown as Record<string, number>, defaultTec) as unknown as StatsTecnicos,
    fisicos:  fillStats(attrs.fisicos  as unknown as Record<string, number>, defaultFis) as unknown as StatsFisicos,
    tacticos: fillStats(attrs.tacticos as unknown as Record<string, number>, defaultTac) as unknown as StatsTacticos,
    mentales: fillStats(attrs.mentales as unknown as Record<string, number>, defaultMen) as unknown as StatsMentales,
    estado: {
      fatiga: state.fatiga ?? 0,
      forma: state.forma ?? 80,
      moral: state.moral ?? 85,
      riesgoLesion: state.riesgoLesion ?? 5,
    },
    confianza: state.confianza ?? { entrenador: 60, vestuario: 50, reputacion: 40 },
    carrera: state.carrera,
  }
}

const POSICION_LABELS: Partial<Record<Posicion, string>> = {
  [Posicion.PORTERO]: "Portero",
  [Posicion.DEFENSA_CENTRAL]: "Def. Central",
  [Posicion.LATERAL]: "Lateral",
  [Posicion.MEDIOCENTRO]: "Mediocentro",
  [Posicion.MEDIAPUNTA]: "Mediapunta",
  [Posicion.EXTREMO]: "Extremo",
  [Posicion.DELANTERO]: "Delantero",
}

function buildMatchContext(
  tipo: string,
  dbState: Record<string, unknown>,
): MatchContext {
  const carrera = dbState.carrera as Record<string, unknown>
  const club = (carrera?.club as string) ?? "—"
  const liga = (carrera?.liga as string) ?? "Liga"

  if (tipo === "copa") {
    const copa = carrera?.copa as CopaState | undefined
    const rondaName = copa ? (COPA_RONDAS[copa.rondaIdx] ?? "R32") : "R32"
    return {
      tipo: "copa",
      rival: copa?.rival ?? "Rival",
      esLocal: copa?.esLocal ?? true,
      club,
      competicion: "Copa del Rey",
      ronda: rondaName,
    }
  }

  if (tipo === "europa") {
    const europa = carrera?.europa as EuropaState | undefined
    const nextMatch = europa?.grupoPartidos.find((p) => !p.jugado)
    const elimMatch = !nextMatch && europa?.eliminatoria && !europa.eliminatoria.jugado
      ? europa.eliminatoria : undefined
    const rival = nextMatch?.rival ?? elimMatch?.rival ?? "Rival"
    const esLocal = nextMatch?.esLocal ?? elimMatch?.esLocal ?? true
    const competicion = europa ? (EUROPA_COMPETICION_LABELS[europa.competicion] ?? "Europa") : "Europa"
    const ronda = nextMatch
      ? "Fase de Grupos"
      : elimMatch
        ? (["R16","QF","SF","F"][elimMatch.rondaIdx] ?? "Eliminatoria")
        : "Europa"
    return { tipo: "europa", rival, esLocal, club, competicion, ronda }
  }

  if (tipo === "seleccion") {
    const seleccion = carrera?.seleccion as SeleccionState | undefined
    const nextParonMatch = seleccion?.paron?.partidos.find((p) => !p.jugado)
    const tipoPartido = nextParonMatch?.tipo ?? "amistoso"
    const rondaLabel = tipoPartido === "clasificacion" ? "Clasificación" : "Amistoso"
    return {
      tipo: "seleccion",
      rival: nextParonMatch?.rival ?? "Rival",
      esLocal: nextParonMatch?.esLocal ?? true,
      club: "España",
      competicion: "Selección Nacional",
      ronda: rondaLabel,
    }
  }

  if (tipo === "seleccion_torneo") {
    const seleccion = carrera?.seleccion as SeleccionState | undefined
    const torneo = seleccion?.torneo
    if (torneo?.fase === "grupos") {
      const nextMatch = torneo.grupoPartidos.find((p) => !p.jugado)
      const torneoLabel = torneo.tipo === "eurocopa" ? "Eurocopa" : "Mundial"
      return {
        tipo: "seleccion_torneo",
        rival: nextMatch?.rival ?? "Rival",
        esLocal: nextMatch?.esLocal ?? true,
        club: "España",
        competicion: torneoLabel,
        ronda: "Fase de Grupos",
      }
    }
    if (torneo?.fase === "eliminatoria" && torneo.eliminatoria && !torneo.eliminatoria.jugado) {
      const rondaNames = ["Cuartos de Final", "Semifinales", "Gran Final"]
      const torneoLabel = torneo.tipo === "eurocopa" ? "Eurocopa" : "Mundial"
      return {
        tipo: "seleccion_torneo",
        rival: torneo.eliminatoria.rival,
        esLocal: torneo.eliminatoria.esLocal,
        club: "España",
        competicion: torneoLabel,
        ronda: rondaNames[torneo.eliminatoria.rondaIdx] ?? "Eliminatoria",
      }
    }
  }

  // liga (default)
  const fixtures = (carrera?.fixtures as Array<{ jornada: number; rival: string; esLocal: boolean }>) ?? []
  const jornadaActual = (carrera?.jornadaActual as number) ?? 1
  const fixture = fixtures.find((f) => f.jornada === jornadaActual)
  return {
    tipo: "liga",
    rival: fixture?.rival ?? "Rival",
    esLocal: fixture?.esLocal ?? true,
    club,
    competicion: liga,
    ronda: `Jornada ${jornadaActual}`,
  }
}

function MatchPageInner() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [phase, setPhase] = useState<Phase>("loading")
  const [enginePlayer, setEnginePlayer] = useState<Player | null>(null)
  const [matchContext, setMatchContext] = useState<MatchContext | null>(null)
  const [matchState, setMatchState] = useState<InteractiveMatchState>(initMatchState())
  const [situacion, setSituacion] = useState<Situacion | null>(null)
  const [selectedOpcion, setSelectedOpcion] = useState<DecisionOption | null>(null)
  const [diceRoll, setDiceRoll] = useState(1)
  const [diceRolling, setDiceRolling] = useState(false)
  const [lastResult, setLastResult] = useState<TurnResult | null>(null)
  const [lastEncajado, setLastEncajado] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [geminiNarrative, setGeminiNarrative] = useState<string | null>(null)
  const [geminiLoading, setGeminiLoading] = useState(false)

  useEffect(() => {
    if (!isPending && !session) router.push("/login")
  }, [session, isPending, router])

  useEffect(() => {
    if (!session) return
    const tipo = searchParams.get("tipo") ?? "liga"
    fetch("/api/player")
      .then((r) => r.json())
      .then(({ player: dbPlayer }) => {
        if (!dbPlayer) { router.push("/create-player"); return }
        const mapped = mapDbPlayer(dbPlayer as DbPlayer)
        setEnginePlayer(mapped)
        const ctx = buildMatchContext(tipo, dbPlayer.state as Record<string, unknown>)
        setMatchContext(ctx)
        const state = initMatchState()
        setMatchState(state)
        setSituacion(getSituacionForTurn(1, mapped))
        setPhase("situation")
      })
      .catch(() => setPhase("error"))
  }, [session, router, searchParams])

  const handleSelectOpcion = (opcion: DecisionOption) => {
    if (phase !== "situation") return
    const roll = Math.floor(Math.random() * 20) + 1
    setSelectedOpcion(opcion)
    setDiceRoll(roll)
    setDiceRolling(true)
    setPhase("rolling")
  }

  const handleDiceComplete = useCallback(() => {
    if (!enginePlayer || !situacion || !selectedOpcion) return
    setDiceRolling(false)
    const result = resolveDecisionWithDice(
      selectedOpcion,
      enginePlayer,
      situacion,
      diceRoll,
      matchState.marcador,
    )
    setLastResult(result)
    setLastEncajado(result.marcador.visitante > matchState.marcador.visitante)
    setMatchState((prev) => ({
      ...prev,
      marcador: result.marcador,
      valoracion: parseFloat(
        Math.max(1, Math.min(10, prev.valoracion + result.valoracionDelta)).toFixed(1)
      ),
      goles: prev.goles + (result.gol ? 1 : 0),
      asistencias: prev.asistencias + (result.asistencia ? 1 : 0),
      tiros: prev.tiros + (situacion.esOportunidadGol ? 1 : 0),
      log: [...prev.log, result],
    }))
    setGeminiNarrative(null)
    setGeminiLoading(true)
    setPhase("result")

    getMatchNarrative({
      playerName: enginePlayer.personal.nombre,
      playerPosition: enginePlayer.posicionPrincipal,
      minuto: situacion.minuto,
      situacion: situacion.descripcion,
      accion: selectedOpcion.texto,
      dado: diceRoll,
      resultado: getResultLabel(result.resultado),
      narrativoBase: result.narrativo,
      gol: result.gol,
    }).then((text) => {
      setGeminiNarrative(text)
      setGeminiLoading(false)
    })
  }, [enginePlayer, situacion, selectedOpcion, diceRoll, matchState.marcador])

  const handleContinue = async () => {
    if (!enginePlayer) return
    const isLastTurn = matchState.turno >= matchState.totalTurnos

    if (isLastTurn) {
      setPhase("saving")
      const newFatiga = Math.min(100, enginePlayer.estado.fatiga + 20)
      const tipo = matchContext?.tipo ?? "liga"
      const esLocal = matchContext?.esLocal ?? true
      const playerTeamGoals = esLocal ? matchState.marcador.local : matchState.marcador.visitante
      const rivalGoals = esLocal ? matchState.marcador.visitante : matchState.marcador.local
      const ganado = playerTeamGoals > rivalGoals

      try {
        await fetch("/api/match/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchStats: {
              goles: matchState.goles,
              asistencias: matchState.asistencias,
              valoracion: matchState.valoracion,
              marcador: `${matchState.marcador.local}-${matchState.marcador.visitante}`,
            },
            updatedState: { fatiga: newFatiga },
            tipo,
            ganado,
            golesRival: rivalGoals,
            esLocal,
          }),
        })
      } catch {
        setSaveError("Error guardando el partido")
      }
      setPhase("finished")
      return
    }

    const nextTurn = matchState.turno + 1
    setMatchState((prev) => ({ ...prev, turno: nextTurn }))
    setSituacion(getSituacionForTurn(nextTurn, enginePlayer))
    setSelectedOpcion(null)
    setLastResult(null)
    setGeminiNarrative(null)
    setGeminiLoading(false)
    setPhase("situation")
  }

  if (isPending || phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-gray-400">Cargando partido...</div>
      </div>
    )
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center space-y-4">
          <p className="text-red-400">Error cargando el partido.</p>
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
    const playerTeamGoals = esLocal ? matchState.marcador.local : matchState.marcador.visitante
    const rivalGoals = esLocal ? matchState.marcador.visitante : matchState.marcador.local
    const ganado = playerTeamGoals > rivalGoals
    const empate = playerTeamGoals === rivalGoals

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

          {saveError && (
            <p className="text-red-400 text-sm text-center">{saveError}</p>
          )}

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
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">
              {enginePlayer?.personal.apodo ? `"${enginePlayer.personal.apodo}"` : enginePlayer?.personal.nombre} ·{" "}
              {POSICION_LABELS[enginePlayer?.posicionPrincipal ?? Posicion.DELANTERO]}
            </p>
            <p className="text-xs text-gray-600">
              {matchContext?.club ?? "—"} · {matchContext?.competicion}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black">
              {matchState.marcador.local} — {matchState.marcador.visitante}
            </p>
            <p className="text-xs text-gray-500">
              {situacion ? `min. ${situacion.minuto}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Turno</p>
            <p className="text-sm font-bold">{matchState.turno}/{matchState.totalTurnos}</p>
          </div>
        </div>
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
              {matchContext.tipo === "seleccion" || matchContext.tipo === "seleccion_torneo" ? "🇪🇸 " : ""}
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
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <ResultReveal
              result={lastResult}
              onContinue={handleContinue}
              isLastTurn={matchState.turno >= matchState.totalTurnos}
              geminiNarrative={geminiNarrative}
              geminiLoading={geminiLoading}
            />
          </div>
        )}

        {phase === "saving" && (
          <div className="text-center text-gray-400 py-8">
            Guardando partido...
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
        <div className="text-gray-400">Cargando partido...</div>
      </div>
    }>
      <MatchPageInner />
    </Suspense>
  )
}

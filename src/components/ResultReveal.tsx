import { TurnResult } from "@/engine/match-interactive"
import { getResultColor, getResultLabel } from "@/lib/result-display"
import VideoLoader from "./VideoLoader"

interface Props {
  result: TurnResult
  onContinue: () => void
  isLastTurn: boolean
  geminiNarrative?: string | null
  geminiLoading?: boolean
}

export default function ResultReveal({
  result,
  onContinue,
  isLastTurn,
  geminiNarrative,
  geminiLoading,
}: Props) {
  const colorClass = getResultColor(result.resultado)
  const label = getResultLabel(result.resultado)

  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <div className={`text-4xl font-black uppercase tracking-widest ${colorClass}`}>
        {label}
      </div>

      {result.gol && (
        <div className="animate-goal-pop text-5xl font-black uppercase tracking-wider text-yellow-400 drop-shadow-[0_0_18px_rgba(250,204,21,0.5)]">
          ¡Gol!
        </div>
      )}

      {result.tarjeta && (
        <div className={`animate-goal-pop flex items-center gap-2 font-bold text-lg ${
          result.tarjeta === "roja" ? "text-red-400" : "text-yellow-400"
        }`}>
          <span>{result.tarjeta === "roja" ? "🟥" : "🟨"}</span>
          <span>Tarjeta {result.tarjeta}</span>
        </div>
      )}

      <p className="text-gray-300 text-sm max-w-xs leading-relaxed">{result.narrativo}</p>

      {/* Gemini narrative */}
      {geminiLoading && <VideoLoader variant="dice" label="Narrando..." size={88} />}
      {geminiNarrative && !geminiLoading && (
        <div className="w-full max-w-xs bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-left">
          <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1.5">
            Comentarista
          </p>
          <p className="text-gray-200 text-sm leading-relaxed italic">
            &ldquo;{geminiNarrative}&rdquo;
          </p>
        </div>
      )}

      <div className="flex flex-wrap justify-center items-center gap-3 text-sm">
        {result.asistencia && (
          <span className="text-blue-400 font-bold bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/30">
            ASISTENCIA
          </span>
        )}
        <span className={`font-bold ${result.valoracionDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
          {result.valoracionDelta >= 0 ? "+" : ""}{result.valoracionDelta.toFixed(1)} val.
        </span>
      </div>

      <div className="text-gray-600 text-xs font-mono">
        Score: {result.score}/100 · D20: {result.diceRoll}
      </div>

      <button
        onClick={onContinue}
        disabled={geminiLoading}
        className="mt-2 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors disabled:opacity-60"
      >
        {isLastTurn ? "Ver resultado final →" : "Siguiente turno →"}
      </button>
    </div>
  )
}

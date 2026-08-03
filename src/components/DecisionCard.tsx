"use client"

import { DecisionOption } from "@/engine/types"
import { getStatLabel } from "@/engine/match-interactive"

const TIPO_COLORS: Record<string, string> = {
  AGRESIVO: "border-red-500/60 text-red-400",
  SEGURO: "border-green-500/60 text-green-400",
  TECNICO: "border-blue-500/60 text-blue-400",
  EQUILIBRADO: "border-purple-500/60 text-purple-400",
  TACTICO: "border-yellow-500/60 text-yellow-400",
  FISICO: "border-orange-500/60 text-orange-400",
}

interface Props {
  opcion: DecisionOption
  statValue: number
  onSelect: () => void
  disabled?: boolean
  selected?: boolean
}

export default function DecisionCard({ opcion, statValue, onSelect, disabled, selected }: Props) {
  const tipoColor = TIPO_COLORS[opcion.tipo] ?? "border-gray-500 text-gray-400"
  const riskPercent = Math.round(opcion.riesgo * 100)
  const riskColor = riskPercent >= 40 ? "text-red-400" : riskPercent >= 20 ? "text-yellow-400" : "text-green-400"

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200
        ${selected
          ? "border-white bg-white/10 scale-[1.02] shadow-lg"
          : "border-gray-700 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800"
        }
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-white font-semibold text-sm leading-tight">{opcion.texto}</p>
        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded border bg-transparent ${tipoColor}`}>
          {opcion.tipo}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 text-xs">STAT</span>
          <span className="text-white font-mono font-bold text-sm">
            {getStatLabel(opcion.statPrincipal)} {statValue}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 text-xs">RIESGO</span>
          <span className={`font-mono font-bold text-sm ${riskColor}`}>{riskPercent}%</span>
        </div>
      </div>
    </button>
  )
}

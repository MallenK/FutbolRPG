import { ResultadoDecision } from "@/engine/types"

// Single source of truth for the tier palette shared by the 3D components
// (Dice3D, FieldScene) — mirrors the text-color tiers in result-display.ts.
export const TIER_HEX = {
  yellow: "#facc15",
  green: "#4ade80",
  blue: "#60a5fa",
  orange: "#fb923c",
  red: "#ef4444",
  neutral: "#9ca3af",
} as const

export function resultadoToHex(resultado: ResultadoDecision): string {
  switch (resultado) {
    case ResultadoDecision.PERFECTO: return TIER_HEX.yellow
    case ResultadoDecision.EXITO: return TIER_HEX.green
    case ResultadoDecision.PARCIAL: return TIER_HEX.blue
    case ResultadoDecision.FALLO: return TIER_HEX.orange
    case ResultadoDecision.CRITICO_FALLO: return TIER_HEX.red
  }
}

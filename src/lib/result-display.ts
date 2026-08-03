import { ResultadoDecision } from "@/engine/types"

export const getResultColor = (resultado: ResultadoDecision): string => {
  switch (resultado) {
    case ResultadoDecision.PERFECTO: return "text-yellow-400"
    case ResultadoDecision.EXITO: return "text-green-400"
    case ResultadoDecision.PARCIAL: return "text-blue-400"
    case ResultadoDecision.FALLO: return "text-orange-400"
    case ResultadoDecision.CRITICO_FALLO: return "text-red-500"
  }
}

export const getResultLabel = (resultado: ResultadoDecision): string => {
  switch (resultado) {
    case ResultadoDecision.PERFECTO: return "¡PERFECTO!"
    case ResultadoDecision.EXITO: return "ÉXITO"
    case ResultadoDecision.PARCIAL: return "PARCIAL"
    case ResultadoDecision.FALLO: return "FALLO"
    case ResultadoDecision.CRITICO_FALLO: return "¡CRÍTICO!"
  }
}
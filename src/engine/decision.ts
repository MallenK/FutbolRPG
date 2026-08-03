import {
  Player, DecisionOption, DecisionContext, ResultadoDecision,
  StatsTecnicos, StatsFisicos, StatsTacticos, StatsMentales,
} from './types'

export const resolveStatValue = (statPrincipal: string, player: Player): number => {
  if (statPrincipal in player.tecnicos) return player.tecnicos[statPrincipal as keyof StatsTecnicos]
  if (statPrincipal in player.fisicos)  return player.fisicos[statPrincipal as keyof StatsFisicos]
  if (statPrincipal in player.tacticos) return player.tacticos[statPrincipal as keyof StatsTacticos]
  if (statPrincipal in player.mentales) return player.mentales[statPrincipal as keyof StatsMentales]
  return 50
}

// ─── Trait bonuses ────────────────────────────────────────────────────────────

function getTraitBonus(player: Player, situacion: { esOportunidadGol?: boolean; tipo?: string }, marcador: { local: number; visitante: number }, turno: number, totalTurnos: number): number {
  const traits = player.traits ?? []
  let bonus = 0

  if (traits.includes("goleador_nato") && situacion.esOportunidadGol) bonus += 4
  if (traits.includes("killer_pass") && !situacion.esOportunidadGol) bonus += 4
  if (traits.includes("improvisador")) bonus += 3   // from origin, always active in 1v1

  const teamLosing = marcador.local < marcador.visitante
  if (traits.includes("jugador_de_presion") && teamLosing) bonus += 3
  if (traits.includes("velocista")) bonus += 2  // abstracted as general bonus

  const isLastTurns = turno >= totalTurnos - 1
  if (traits.includes("lector_del_juego") && isLastTurns) bonus += 3

  return bonus
}

// ─── Personality modifier ─────────────────────────────────────────────────────

function getPersonalityBonus(player: Player, marcador: { local: number; visitante: number }, turno: number, totalTurnos: number): number {
  const personality = player.personalidad ?? "profesional"
  const teamLosing = marcador.local < marcador.visitante
  const isLastTurn = turno >= totalTurnos

  switch (personality) {
    case "lider":
      return teamLosing ? 2 : 0
    case "profesional":
      return 0  // consistent bonus applied as floor in calculateScore
    case "rebelde":
      return Math.random() < 0.5 ? 5 : -5
    case "silencioso":
      return (teamLosing || isLastTurn) ? 3 : 0
    default:
      return 0
  }
}

// ─── Core score calculation ───────────────────────────────────────────────────

const calculateScore = (
  option: DecisionOption,
  player: Player,
  context: DecisionContext,
  situacion: { esOportunidadGol?: boolean; tipo?: string },
  marcador: { local: number; visitante: number },
  turno: number,
  totalTurnos: number,
) => {
  const BASE_SCORE = 50
  const statValue = resolveStatValue(option.statPrincipal, player)
  const statContribution = statValue * option.pesoStat
  const difficultyPenalty = context.dificultadBase
  const skillDifference = statContribution - difficultyPenalty
  const formMod = (player.estado.forma - 50) * 0.2
  const fatigueMod = player.estado.fatiga * 0.20
  const confidenceMod = (player.mentales.confianza - 50) * 0.15
  const pressureResistance = player.mentales.presion / 100
  const effectivePressure = context.presionSituacional * (1 - pressureResistance * 0.6)
  const randomFactor = Math.floor(Math.random() * 13) - 6

  const traitBonus = getTraitBonus(player, situacion, marcador, turno, totalTurnos)
  const personalityBonus = getPersonalityBonus(player, marcador, turno, totalTurnos)

  let rawScore =
    BASE_SCORE +
    skillDifference +
    formMod -
    fatigueMod +
    confidenceMod -
    effectivePressure +
    context.bonusContexto +
    traitBonus +
    personalityBonus +
    randomFactor

  // "Profesional" personality: raises the floor
  if ((player.personalidad ?? "profesional") === "profesional") {
    rawScore = Math.max(rawScore, 18)
  }

  const score = Math.max(0, Math.min(100, Math.round(rawScore)))
  const breakdown = `Base(${BASE_SCORE})+Stat(${Math.round(statContribution)})-Dif(${difficultyPenalty})+Forma(${Math.round(formMod)})-Fatiga(${Math.round(fatigueMod)})+Conf(${Math.round(confidenceMod)})-Pres(${Math.round(effectivePressure)})+Trait(${traitBonus})+Pers(${personalityBonus})+Azar(${randomFactor})`

  return { score, breakdown, rawScore }
}

export const isCriticoFalloCondition = (
  score: number,
  option: DecisionOption,
  player: Player,
  context: DecisionContext,
): boolean =>
  score <= 15 &&
  (option.riesgo >= 0.3 || player.estado.fatiga >= 85 || context.presionSituacional >= 40)

export const calcChance = (option: DecisionOption, player: Player, context: DecisionContext): number =>
  calculateScore(option, player, context, {}, { local: 0, visitante: 0 }, 1, 6).score

export const resolveDecision = (
  option: DecisionOption,
  player: Player,
  context: DecisionContext,
): { resultado: ResultadoDecision; score: number; narrativo: string; efectos: unknown; debugInfo: string } => {
  const { score, breakdown } = calculateScore(option, player, context, {}, { local: 0, visitante: 0 }, 1, 6)

  let resultado: ResultadoDecision
  let narrativo = ""

  if (score >= 85) { resultado = ResultadoDecision.PERFECTO; narrativo = "¡Ejecución magistral!" }
  else if (score >= 65) { resultado = ResultadoDecision.EXITO; narrativo = "Buena ejecución." }
  else if (score >= 41) { resultado = ResultadoDecision.PARCIAL; narrativo = "Ejecución forzada, ventaja perdida." }
  else if (score >= 16) { resultado = ResultadoDecision.FALLO; narrativo = "Error en la ejecución." }
  else if (isCriticoFalloCondition(score, option, player, context)) {
    resultado = ResultadoDecision.CRITICO_FALLO; narrativo = "¡Desastre absoluto!"
  } else { resultado = ResultadoDecision.FALLO; narrativo = "Fallo grave salvado in extremis." }

  return { resultado, score, narrativo, efectos: {}, debugInfo: breakdown }
}

// ─── Extended resolve (used by match-interactive) ─────────────────────────────

export const resolveDecisionFull = (
  option: DecisionOption,
  player: Player,
  context: DecisionContext,
  situacion: { esOportunidadGol?: boolean; tipo?: string },
  marcador: { local: number; visitante: number },
  turno: number,
  totalTurnos: number,
): { resultado: ResultadoDecision; score: number; narrativo: string; efectos: unknown; debugInfo: string } => {
  const { score, breakdown } = calculateScore(option, player, context, situacion, marcador, turno, totalTurnos)

  let resultado: ResultadoDecision
  let narrativo = ""

  if (score >= 85) { resultado = ResultadoDecision.PERFECTO; narrativo = "¡Ejecución magistral!" }
  else if (score >= 65) { resultado = ResultadoDecision.EXITO; narrativo = "Buena ejecución." }
  else if (score >= 41) { resultado = ResultadoDecision.PARCIAL; narrativo = "Ejecución parcial." }
  else if (score >= 16) { resultado = ResultadoDecision.FALLO; narrativo = "Error en la ejecución." }
  else if (isCriticoFalloCondition(score, option, player, context)) {
    resultado = ResultadoDecision.CRITICO_FALLO; narrativo = "¡Desastre absoluto!"
  } else { resultado = ResultadoDecision.FALLO; narrativo = "Fallo grave salvado in extremis." }

  return { resultado, score, narrativo, efectos: {}, debugInfo: breakdown }
}

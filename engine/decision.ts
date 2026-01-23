// engine/decision.ts
import { Player, DecisionOption, DecisionContext, ResultadoDecision, StatsTecnicos, StatsFisicos, StatsTacticos } from './types';

/**
 * Calcula el valor numérico y genera el desglose de factores.
 */
const calculateScore = (option: DecisionOption, player: Player, context: DecisionContext) => {
  const BASE_SCORE = 50; 
  
  // 1. Obtener valor del stat principal (0-99)
  let statValue = 0;
  
  if (option.statPrincipal in player.tecnicos) {
    statValue = player.tecnicos[option.statPrincipal as keyof StatsTecnicos];
  } else if (option.statPrincipal in player.fisicos) {
    statValue = player.fisicos[option.statPrincipal as keyof StatsFisicos];
  } else if (option.statPrincipal in player.tacticos) {
    statValue = player.tacticos[option.statPrincipal as keyof StatsTacticos];
  }

  // 2. Comparativa Stat vs Dificultad
  // statContribution ≈ statValue * 1.0
  const statContribution = statValue * option.pesoStat;
  const difficultyPenalty = context.dificultadBase;
  const skillDifference = statContribution - difficultyPenalty;
  
  // 3. Modificadores de Estado
  const formMod = (player.estado.forma - 50) * 0.2; 
  
  // RECALIBRACIÓN: Fatiga penaliza menos (0.20 en vez de 0.30)
  const fatigueMod = player.estado.fatiga * 0.20;
  
  const confidenceMod = (player.mentales.confianza - 50) * 0.15;

  // 4. Presión Situacional
  const pressureResistance = player.mentales.presion / 100;
  const effectivePressure = context.presionSituacional * (1 - pressureResistance * 0.6); 

  // 5. RECALIBRACIÓN: Azar reducido (-6 a +6)
  const randomFactor = Math.floor(Math.random() * 13) - 6;

  let rawScore = 
    BASE_SCORE + 
    skillDifference + 
    formMod - 
    fatigueMod + 
    confidenceMod - 
    effectivePressure + 
    context.bonusContexto + 
    randomFactor;

  // Clamp 0-100
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Generar string de desglose
  const breakdown = `FACTORES: Base(${BASE_SCORE}) + Stat(${Math.round(statContribution)}) - Dif(${difficultyPenalty}) + Forma(${Math.round(formMod)}) - Fatiga(${Math.round(fatigueMod)}) + Conf(${Math.round(confidenceMod)}) - Presión(${Math.round(effectivePressure)}) + Azar(${randomFactor})`;

  return { score, breakdown, rawScore };
};

/**
 * Mantiene compatibilidad con llamadas directas (aunque se recomienda usar resolveDecision)
 */
export const calcChance = (option: DecisionOption, player: Player, context: DecisionContext): number => {
  return calculateScore(option, player, context).score;
};

export const resolveDecision = (
  option: DecisionOption, 
  player: Player, 
  context: DecisionContext
): { resultado: ResultadoDecision, score: number, narrativo: string, efectos: any, debugInfo: string } => {
  
  const { score, breakdown } = calculateScore(option, player, context);
  
  let resultado: ResultadoDecision;
  let narrativo = "";
  
  // RECALIBRACIÓN: Nuevos Rangos de Resultado
  if (score >= 85) {
    resultado = ResultadoDecision.PERFECTO;
    narrativo = "¡Ejecución magistral!";
  } else if (score >= 65) {
    resultado = ResultadoDecision.EXITO;
    narrativo = "Buena ejecución.";
  } else if (score >= 41) {
    resultado = ResultadoDecision.PARCIAL;
    narrativo = "Ejecución forzada, ventaja perdida.";
  } else if (score >= 16) {
    resultado = ResultadoDecision.FALLO;
    narrativo = "Error en la ejecución.";
  } else {
    // RECALIBRACIÓN: CRÍTICO_FALLO condicional
    // Solo si score <= 15 Y (Alto Riesgo O Fatiga extrema O Presión alta)
    const highRisk = option.riesgo >= 0.3;
    const extremeFatigue = player.estado.fatiga >= 85;
    const highPressure = context.presionSituacional >= 40;

    if (score <= 15 && (highRisk || extremeFatigue || highPressure)) {
      resultado = ResultadoDecision.CRITICO_FALLO;
      narrativo = "¡Desastre absoluto!";
    } else {
      // Si falla por poco o mala suerte pero sin riesgo, se queda en FALLO
      resultado = ResultadoDecision.FALLO;
      narrativo = "Fallo grave salvado in extremis.";
    }
  }

  return { resultado, score, narrativo, efectos: {}, debugInfo: breakdown };
};
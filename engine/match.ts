// engine/match.ts
import { Player, DecisionOption, DecisionContext, ResultadoDecision, Logger, MatchStats, LogType } from './types';
import { resolveDecision } from './decision';
import { updatePlayerStats } from './player';

interface Situacion {
  id: string;
  descripcion: string;
  contexto: DecisionContext;
  opciones: DecisionOption[];
  esOportunidadGol: boolean; 
}

const getSituacionesDelantero = (): Situacion[] => [
  {
    id: 'mano_a_mano',
    descripcion: "Recibes un pase filtrado y quedas solo frente al portero.",
    contexto: { dificultadBase: 50, presionSituacional: 30, bonusContexto: 0 },
    esOportunidadGol: true,
    opciones: [
      { id: 'tiro_seguro', texto: "Asegurar al centro", tipo: 'SEGURO', statPrincipal: 'tiro', pesoStat: 1.1, riesgo: 0.1 },
      { id: 'tiro_colocado', texto: "Colocar al palo", tipo: 'TECNICO', statPrincipal: 'tiro', pesoStat: 1.0, riesgo: 0.2 },
      { id: 'regatear_gk', texto: "Regatear al portero", tipo: 'EQUILIBRADO', statPrincipal: 'regate', pesoStat: 0.85, riesgo: 0.4 }
    ]
  },
  {
    id: 'centro_area',
    descripcion: "Centro bombeado al punto de penalti.",
    contexto: { dificultadBase: 50, presionSituacional: 20, bonusContexto: 10 },
    esOportunidadGol: true,
    opciones: [
      { id: 'control_tiro', texto: "Controlar y asegurar", tipo: 'SEGURO', statPrincipal: 'control', pesoStat: 1.1, riesgo: 0.15 },
      { id: 'cabeza', texto: "Remate de cabeza", tipo: 'TECNICO', statPrincipal: 'cabeceo', pesoStat: 1.0, riesgo: 0.2 },
      { id: 'volea', texto: "Volea espectacular", tipo: 'AGRESIVO', statPrincipal: 'tiro', pesoStat: 0.85, riesgo: 0.5 }
    ]
  },
  {
    id: 'presion_salida',
    descripcion: "El defensa rival duda con el balón.",
    contexto: { dificultadBase: 40, presionSituacional: 0, bonusContexto: 5 },
    esOportunidadGol: false,
    opciones: [
      { id: 'sprint_presion', texto: "Presionar espacio", tipo: 'FISICO', statPrincipal: 'aceleracion', pesoStat: 1.1, riesgo: 0.1 },
      { id: 'interceptar', texto: "Cortar pase", tipo: 'TACTICO', statPrincipal: 'posicionamiento', pesoStat: 1.0, riesgo: 0.2 },
      { id: 'entrada_fuerte', texto: "Entrada directa", tipo: 'AGRESIVO', statPrincipal: 'fuerza', pesoStat: 0.85, riesgo: 0.4 }
    ]
  },
  {
    id: 'espaldas_arco',
    descripcion: "Recibes de espaldas con marca pegajosa.",
    contexto: { dificultadBase: 45, presionSituacional: 15, bonusContexto: 0 },
    esOportunidadGol: false,
    opciones: [
      { id: 'pivotear', texto: "Descargar de cara", tipo: 'SEGURO', statPrincipal: 'fuerza', pesoStat: 1.1, riesgo: 0.05 },
      { id: 'pared', texto: "Buscar pared", tipo: 'EQUILIBRADO', statPrincipal: 'pase', pesoStat: 1.0, riesgo: 0.2 },
      { id: 'giro_rapido', texto: "Giro y auto-pase", tipo: 'TECNICO', statPrincipal: 'regate', pesoStat: 0.85, riesgo: 0.35 }
    ]
  },
  {
    id: 'contragolpe',
    descripcion: "Contraataque con espacio por delante.",
    contexto: { dificultadBase: 45, presionSituacional: 10, bonusContexto: 15 },
    esOportunidadGol: false,
    opciones: [
      { id: 'pase_profundidad', texto: "Abrir a banda", tipo: 'SEGURO', statPrincipal: 'vision', pesoStat: 1.1, riesgo: 0.1 },
      { id: 'conducir_velocidad', texto: "Ganar por velocidad", tipo: 'FISICO', statPrincipal: 'velocidad', pesoStat: 1.0, riesgo: 0.2 },
      { id: 'frenar_recorte', texto: "Frenar y romper cintura", tipo: 'TECNICO', statPrincipal: 'regate', pesoStat: 0.85, riesgo: 0.3 }
    ]
  },
  {
    id: 'balon_parado',
    descripcion: "Tiro libre en la frontal del área.",
    contexto: { dificultadBase: 50, presionSituacional: 40, bonusContexto: 0 },
    esOportunidadGol: true,
    opciones: [
      { id: 'centro_fk', texto: "Centrar al punto penal", tipo: 'SEGURO', statPrincipal: 'pase', pesoStat: 1.1, riesgo: 0.1 },
      { id: 'tiro_colocado_fk', texto: "Rosca sobre barrera", tipo: 'TECNICO', statPrincipal: 'tiro', pesoStat: 1.0, riesgo: 0.25 },
      { id: 'potencia_fk', texto: "Potencia al palo del portero", tipo: 'AGRESIVO', statPrincipal: 'fuerza', pesoStat: 0.85, riesgo: 0.4 }
    ]
  }
];

const getTargetBaseDifficulty = (turno: number): number => {
  const rand = Math.random();
  if (turno <= 2) {
    if (rand < 0.7) return 35 + Math.random() * 10;
    return 46 + Math.random() * 9;
  }
  if (turno <= 4) {
    if (rand < 0.4) return 35 + Math.random() * 10;
    if (rand < 0.8) return 46 + Math.random() * 14;
    return 61 + Math.random() * 9;
  }
  if (turno <= 6) {
    if (rand < 0.2) return 40 + Math.random() * 5;
    if (rand < 0.7) return 50 + Math.random() * 10;
    return 65 + Math.random() * 10;
  }
  if (rand < 0.2) return 50 + Math.random() * 9;
  if (rand < 0.8) return 65 + Math.random() * 10;
  return 76 + Math.random() * 14;
};

/**
 * Simula solo el resultado del equipo para cuando el jugador está lesionado o no convocado.
 * No genera logs detallados, solo devuelve el string del resultado.
 */
export const simulateMatchResultOnly = (rivalDificultad: 'Baja'|'Media'|'Alta'): string => {
  let gLocal = 0;
  let gVisitante = 0;
  
  // Lógica simple de simulación
  const baseLocal = Math.random(); // Factor suerte local
  const baseVisit = Math.random();

  if (rivalDificultad === 'Baja') {
    // Equipo propio favorito
    gLocal = Math.floor(baseLocal * 4);
    gVisitante = Math.floor(baseVisit * 2);
  } else if (rivalDificultad === 'Media') {
    // Equilibrado
    gLocal = Math.floor(baseLocal * 3);
    gVisitante = Math.floor(baseVisit * 3);
  } else {
    // Rival favorito
    gLocal = Math.floor(baseLocal * 2);
    gVisitante = Math.floor(baseVisit * 4);
  }
  
  return `${gLocal}-${gVisitante}`;
};

export const simulateMatch = async (player: Player, logger: Logger): Promise<Player> => {
  const initialPlayerState = JSON.parse(JSON.stringify(player));
  let currentPlayer = { ...player };
  let marcador = { local: 2, visitante: 1 };
  let statsPartido: MatchStats = {
    minutos: 90, goles: 0, asistencias: 0, tiros: 0, pasesCompletados: 0, robos: 0, valoracion: 6.0
  };

  const situacionesTemplate = getSituacionesDelantero();
  const TURNOS = 5; // Reducido a 5 para agilizar la simulación de carrera
  const MINUTOS_POR_TURNO = 90 / TURNOS;
  
  let hardMomentOccurred = false;

  await logger(`\n=== INICIO DEL PARTIDO: ${currentPlayer.carrera.club} vs RIVAL FC ===`, LogType.MATCH);

  for (let turno = 1; turno <= TURNOS; turno++) {
    const minuto = Math.round(turno * MINUTOS_POR_TURNO);

    let baseDC = getTargetBaseDifficulty(turno);
    
    if (turno >= TURNOS - 1 && !hardMomentOccurred && baseDC < 65) {
      baseDC = 70 + Math.random() * 10;
    }
    if (baseDC >= 65) hardMomentOccurred = true;

    if (currentPlayer.estado.fatiga > 50) baseDC += 5;
    if (minuto > 70) baseDC += 5;
    
    baseDC = Math.round(baseDC);

    let pool = situacionesTemplate;
    if (baseDC > 70) {
      pool = situacionesTemplate.filter(s => s.esOportunidadGol);
      if (pool.length === 0) pool = situacionesTemplate;
    }
    
    const template = pool[Math.floor(Math.random() * pool.length)];
    const situacion: Situacion = {
      ...template,
      contexto: { ...template.contexto, dificultadBase: baseDC }
    };

    // await logger(`Min ${minuto}: ${situacion.descripcion}`, LogType.MATCH);

    const opcionElegida = situacion.opciones[Math.floor(Math.random() * situacion.opciones.length)];
    const res = resolveDecision(opcionElegida, currentPlayer, situacion.contexto);
    
    await logger(`Min ${minuto} [${opcionElegida.texto}]: ${res.narrativo} (${res.resultado})`, LogType.MATCH);

    let valoracionDelta = 0;
    let turnoMoral = 0;
    let turnoFatiga = 4 + Math.floor(Math.random() * 5);
    let turnoForma = 0;

    if (situacion.esOportunidadGol) {
      statsPartido.tiros++;
      if (res.resultado === ResultadoDecision.PERFECTO) {
        if (Math.random() < 0.80) {
          statsPartido.goles++; marcador.local++;
          await logger(`⚽ ¡GOLAZO! Definición imparable.`, LogType.MATCH);
          valoracionDelta += 1.5; turnoMoral += 10;
        } else {
          valoracionDelta += 0.5;
        }
      } else if (res.resultado === ResultadoDecision.EXITO) {
        if (Math.random() < 0.35) {
          statsPartido.goles++; marcador.local++;
          await logger(`⚽ ¡GOOOL! Al fondo de la red.`, LogType.MATCH);
          valoracionDelta += 1.2; turnoMoral += 8;
        } else {
          valoracionDelta += 0.2;
        }
      } else if (res.resultado === ResultadoDecision.PARCIAL) {
        if (Math.random() < 0.08) {
           statsPartido.goles++; marcador.local++;
           await logger(`⚽ ¡GOL! Entró con suspense.`, LogType.MATCH);
           valoracionDelta += 1.0; turnoMoral += 5;
        } else {
           valoracionDelta -= 0.1;
        }
      } else {
        valoracionDelta -= 0.5; turnoMoral -= 5;
      }
    } else {
      if (res.resultado === ResultadoDecision.PERFECTO) {
        statsPartido.asistencias++; statsPartido.pasesCompletados++; marcador.local++;
        await logger(`🎯 ¡ASISTENCIA DE ORO!`, LogType.MATCH); valoracionDelta += 1.0; turnoMoral += 5;
      } else if (res.resultado === ResultadoDecision.EXITO) {
        statsPartido.pasesCompletados++;
        valoracionDelta += 0.4; turnoMoral += 2;
      } else if (res.resultado === ResultadoDecision.PARCIAL) {
        valoracionDelta += 0.1;
      } else {
        statsPartido.robos--;
        if (Math.random() < 0.15) {
          marcador.visitante++; await logger(`😡 GOL RIVAL.`, LogType.MATCH); valoracionDelta -= 0.5;
        }
        turnoMoral -= 3; valoracionDelta -= 0.3;
      }
    }

    if (res.resultado === ResultadoDecision.PERFECTO || res.resultado === ResultadoDecision.EXITO) turnoForma = 1;
    else if (res.resultado === ResultadoDecision.FALLO || res.resultado === ResultadoDecision.CRITICO_FALLO) turnoForma = -1;

    let turnoRiesgo = (currentPlayer.estado.fatiga > 60) ? Math.floor(Math.random() * 6) + 3 : 0;

    statsPartido.valoracion = Math.max(1, Math.min(10, statsPartido.valoracion + valoracionDelta));
    currentPlayer = updatePlayerStats(currentPlayer, { fatiga: turnoFatiga, moral: turnoMoral });
    currentPlayer.estado.forma = Math.max(0, Math.min(100, currentPlayer.estado.forma + turnoForma));
    currentPlayer.estado.riesgoLesion = Math.max(0, Math.min(100, currentPlayer.estado.riesgoLesion + turnoRiesgo));
  }

  // --- FINAL ---
  let impactoEntrenador = 0;
  let impactoVestuario = 0;
  let impactoReputacion = 0;

  if (statsPartido.valoracion >= 7.0) impactoEntrenador += Math.floor(statsPartido.valoracion - 5) * 3;
  else if (statsPartido.valoracion < 6.0) impactoEntrenador -= 4;
  if (statsPartido.goles > 0) impactoEntrenador += 5;

  if (statsPartido.asistencias > 0) impactoVestuario += 5;
  if (statsPartido.valoracion < 5.0) impactoVestuario -= 5;
  
  impactoReputacion += (statsPartido.goles * 3) + (statsPartido.asistencias * 2);
  if (statsPartido.valoracion >= 8.0) impactoReputacion += 3;

  currentPlayer = updatePlayerStats(currentPlayer, { entrenador: impactoEntrenador, moral: 0 });
  currentPlayer.confianza.vestuario += impactoVestuario;
  currentPlayer.confianza.reputacion += impactoReputacion;

  currentPlayer.carrera.estadisticasTemporada.partidosJugados++;
  currentPlayer.carrera.estadisticasTemporada.goles += statsPartido.goles;
  currentPlayer.carrera.estadisticasTemporada.asistencias += statsPartido.asistencias;
  
  const jugados = currentPlayer.carrera.estadisticasTemporada.partidosJugados;
  const mediaAnt = currentPlayer.carrera.estadisticasTemporada.valoracionMedia;
  currentPlayer.carrera.estadisticasTemporada.valoracionMedia = ((mediaAnt * (jugados - 1)) + statsPartido.valoracion) / jugados;

  await logger(`🏁 FINAL: ${currentPlayer.carrera.club} ${marcador.local} - ${marcador.visitante} Rival FC`, LogType.MATCH);
  await logger(`📊 Stats: ${statsPartido.goles} Goles | ${statsPartido.asistencias} Asist. | Val: ${statsPartido.valoracion.toFixed(1)}`, LogType.MATCH);
  
  return currentPlayer;
};
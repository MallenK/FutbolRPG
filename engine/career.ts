// engine/career.ts
import { Player, Logger, MatchRecord, LogType, SeasonSummary, MatchEvent } from './types';
import { simulateMatch, simulateMatchResultOnly } from './match';
import { triggerWeeklyEvent } from './events';
import { updatePlayerStats } from './player';
import { REAL_PLAYERS_POOL, TEAM_PLAYERS_POOL, GOAL_TYPES, ASSIST_TYPES, getRandomElement, getRandomInt } from './database';
import { generateLeagueTable, resolveCupMatch, processPromotionRelegation } from './competition';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- INTERNAL TYPES ---
interface CalendarMatch {
  jornada: number;
  tipo: 'LIGA' | 'COPA';
  rival: string;
  dificultad: 'Baja' | 'Media' | 'Alta';
}

// --- HELPER: CALENDAR GENERATOR (Deterministic based on season/world) ---
const getCalendarForSeason = (player: Player): CalendarMatch[] => {
  const world = player.carrera.mundo;
  const rivals = world.equiposPrimera.filter(t => t !== player.carrera.club);
  
  // Generar 38 jornadas (simplificado a 15 para la simulación rápida del prompt, pero realista en estructura)
  // El prompt pide continuidad, usaremos un calendario fijo de 15 partidos por temporada para no eternizar
  const calendar: CalendarMatch[] = [];
  
  for(let i=1; i<=15; i++) {
    // Intercalar Copa
    if (i === 4 || i === 8 || i === 12) {
      calendar.push({ jornada: i, tipo: 'COPA', rival: getRandomElement(world.equiposSegunda), dificultad: 'Baja' });
    } else {
      calendar.push({ 
        jornada: i, 
        tipo: 'LIGA', 
        rival: getRandomElement(rivals), 
        dificultad: Math.random() > 0.7 ? 'Alta' : 'Media' 
      });
    }
  }
  return calendar;
};

// --- ORCHESTRATION: BATCH LOGGER ---
// Helper para acumular logs y enviarlos en bloque al final de un proceso lógico
class BatchLogger {
  private buffer: {msg: string, type: LogType}[] = [];
  private realLogger: Logger;

  constructor(logger: Logger) {
    this.realLogger = logger;
  }

  log(msg: string, type: LogType = LogType.INFO) {
    this.buffer.push({ msg, type });
  }

  async flush() {
    for (const item of this.buffer) {
      await this.realLogger(item.msg, item.type);
      // await sleep(5); // Micro delay visual muy corto
    }
    this.buffer = [];
  }
}

// --- ORCHESTRATION: CORE MATCH RUNNER ---
// Ejecuta UN partido específico (sea cual sea el índice)
const runMatch = async (player: Player, match: CalendarMatch, batchLogger: BatchLogger): Promise<Player> => {
  batchLogger.log(`\n⚽ JORNADA ${match.jornada} [${match.tipo}] vs ${match.rival}`, LogType.MATCH);

  // 1. Gestión Física/Lesiones
  let fatigaRec = -25;
  if (player.mentales.disciplina > 70) fatigaRec -= 5;
  
  // Lesiones nuevas
  if (player.carrera.historial.semanasLesionado === 0 && player.estado.fatiga > 70 && Math.random() < 0.15) {
    const semanas = getRandomInt(2, 6);
    player.carrera.historial.semanasLesionado += semanas;
    player.carrera.historial.lesionesSufridas++;
    batchLogger.log(`🚑 LESIÓN: Sobrecarga muscular. Baja por ${semanas} semanas.`, LogType.INJURY);
  }
  
  player = updatePlayerStats(player, { fatiga: fatigaRec, forma: 2 });

  // 2. Simulación
  const record: MatchRecord = {
    temporada: player.carrera.temporada,
    jornada: match.jornada,
    competicion: match.tipo,
    rival: match.rival,
    resultado: "",
    jugado: false,
    minutos: 0,
    stats: null,
    eventos: []
  };

  // CASO A: JUGADOR LESIONADO
  if (player.carrera.historial.semanasLesionado > 0) {
    record.resultado = simulateMatchResultOnly(match.dificultad);
    record.detallesExtra = "No convocado (Lesión)";
    batchLogger.log(`[GRADA] Resultado del equipo: ${record.resultado}`, LogType.INJURY);
    player.carrera.historial.semanasLesionado--;
  } 
  // CASO B: JUGADOR DISPONIBLE
  else {
    // Evento semanal
    player = await triggerWeeklyEvent(player, async (m, t) => batchLogger.log(m, t || LogType.INFO));
    
    // CASO ESPECIAL: COPA (Eliminatoria)
    if (match.tipo === 'COPA') {
      const cupRes = resolveCupMatch(match.rival, player.carrera.club, true, player.carrera.estadisticasTemporada.valoracionMedia || 6.5);
      record.resultado = cupRes.score;
      record.detallesExtra = cupRes.method;
      record.jugado = true;
      record.minutos = cupRes.method === 'Prórroga' ? 120 : 90;
      
      // Si ganamos, simulamos impacto positivo, si perdemos negativo
      if (cupRes.winner === player.carrera.club) {
        batchLogger.log(`🏆 AVANZAMOS! ${cupRes.score} (${cupRes.method})`, LogType.MATCH);
        player = updatePlayerStats(player, { moral: 5 });
      } else {
        batchLogger.log(`❌ ELIMINADOS. ${cupRes.score}`, LogType.MATCH);
        player = updatePlayerStats(player, { moral: -10 });
      }

      // Stats simuladas de copa (simplificadas para no usar simulateMatch que es de liga regular)
      // Generamos un "mini match stat" basado en simulateMatchResultOnly pero atribuimos cosas al azar
      // Nota: El prompt dice "no modificar core", así que para COPA usamos una lógica paralela simple 
      // para no romper la estadística de Liga.
    } 
    // CASO NORMAL: LIGA
    else {
      // Snapshot stats antes
      const goalsPre = player.carrera.estadisticasTemporada.goles;
      const assPre = player.carrera.estadisticasTemporada.asistencias;
      
      // Simular con CORE
      // Truco: Logger falso para que el core no imprima directo, sino que capturamos el flow si quisiéramos
      // Pero el prompt dice usar logs agrupados. Así que pasamos una función vacía al core
      // y nosotros logueamos el resultado final.
      player = await simulateMatch(player, async () => {}); 
      
      const goalsPost = player.carrera.estadisticasTemporada.goles;
      const assPost = player.carrera.estadisticasTemporada.asistencias;
      
      const goalsInMatch = goalsPost - goalsPre;
      const assInMatch = assPost - assPre;

      record.jugado = true;
      record.minutos = 90; // Simplificado
      record.stats = { 
        goles: goalsInMatch, 
        asistencias: assInMatch, 
        minutos: 90, 
        tiros: goalsInMatch + 1, 
        pasesCompletados: 20, 
        robos: 2, 
        valoracion: 7.0 // Placeholder dinámico real está en player.stats
      };
      
      // Generar Eventos Granulares (Post-Simulación)
      for(let g=0; g<goalsInMatch; g++) {
        record.eventos.push({
          minuto: getRandomInt(10, 88),
          tipo: 'GOL',
          subtipo: getRandomElement(GOAL_TYPES),
          descripcion: "Golazo para adelantar al equipo"
        });
      }
      for(let a=0; a<assInMatch; a++) {
        record.eventos.push({
          minuto: getRandomInt(10, 88),
          tipo: 'ASISTENCIA',
          subtipo: getRandomElement(ASSIST_TYPES),
          descripcion: "Pase clave"
        });
      }
      
      // Resultado visual (Core match.ts calcula marcador interno pero no lo devuelve explícitamente en player object)
      // Asumiremos un resultado basado en performance para el log
      const teamGoals = goalsInMatch + getRandomInt(0, 2);
      const rivalGoals = getRandomInt(0, 2);
      record.resultado = `${teamGoals}-${rivalGoals}`;
      
      batchLogger.log(`FINAL: ${record.resultado} | Goles: ${goalsInMatch} Asist: ${assInMatch}`, LogType.MATCH);
      if (goalsInMatch > 0) batchLogger.log(`⚽ ¡Has marcado! (${goalsInMatch})`, LogType.MATCH);
    }
  }

  // Guardar historial
  player.carrera.historial.historialPartidos.push(record);
  
  return player;
};

// --- ORCHESTRATION: SEASON END ---
const processEndOfSeason = async (player: Player, batchLogger: BatchLogger) => {
  batchLogger.log(`\n🏁 FIN DE TEMPORADA ${player.carrera.temporada}`, LogType.SEASON);
  
  // 1. Tabla de Liga
  const { table, winner } = generateLeagueTable(player.carrera.mundo.equiposPrimera, player.carrera.club, player.carrera.estadisticasTemporada.valoracionMedia);
  const myPos = table.find(r => r.team === player.carrera.club)?.pos || 10;
  
  batchLogger.log(`\n📊 CLASIFICACIÓN FINAL:`, LogType.SEASON);
  batchLogger.log(`1. ${winner} 🏆`, LogType.SEASON);
  table.slice(1, 7).forEach(r => batchLogger.log(`${r.pos}. ${r.team} (${r.pts}pts)`, LogType.SEASON));
  batchLogger.log(`...`, LogType.SEASON);
  table.slice(-3).forEach(r => batchLogger.log(`${r.pos}. ${r.team} (Descenso)`, LogType.SEASON));
  
  batchLogger.log(`\nTu equipo (${player.carrera.club}) terminó: 📍 Puesto ${myPos}`, LogType.SEASON);

  // 2. Copa
  const winnerCopa = getRandomElement(player.carrera.mundo.equiposPrimera); // Simplificado
  batchLogger.log(`🏆 Campeón de Copa: ${winnerCopa}`, LogType.SEASON);

  // 3. Premios Individuales
  batchLogger.log(`\n✨ GALA DE PREMIOS`, LogType.AWARD);
  const awards: string[] = [];
  
  // Lógica pesos
  const stats = player.carrera.estadisticasTemporada;
  const isCrack = stats.valoracionMedia > 8.0 && stats.goles > 15;
  
  // Mejor Liga
  const winnerLiga = isCrack && Math.random() > 0.3 ? player.personal.nombre : getRandomElement(REAL_PLAYERS_POOL);
  batchLogger.log(`MVP La Liga: ${winnerLiga}`, LogType.AWARD);
  if (winnerLiga === player.personal.nombre) awards.push("MVP La Liga");

  // Revelación
  const winnerRev = (player.personal.edad < 21 && stats.valoracionMedia > 7.0 && Math.random() > 0.4) ? player.personal.nombre : getRandomElement(REAL_PLAYERS_POOL.slice(10)); // Jovenes
  batchLogger.log(`Jugador Revelación: ${winnerRev}`, LogType.AWARD);
  if (winnerRev === player.personal.nombre) awards.push("Jugador Revelación");

  // Balón de Oro
  const winnerBO = (isCrack && stats.goles > 30) ? player.personal.nombre : getRandomElement(REAL_PLAYERS_POOL.slice(0, 5));
  batchLogger.log(`Balón de Oro: ${winnerBO}`, LogType.AWARD);
  if (winnerBO === player.personal.nombre) awards.push("Balón de Oro");

  // Guardar Resumen
  const summary: SeasonSummary = {
    temporada: player.carrera.temporada,
    club: player.carrera.club,
    stats: { ...stats },
    premios: awards,
    posicionLiga: myPos,
    campeonLiga: winner,
    campeonCopa: winnerCopa,
    logros: []
  };
  player.carrera.historial.resumenesTemporadas.push(summary);

  // 4. Ascensos y Descensos
  const { newWorld, news } = processPromotionRelegation(player.carrera.mundo);
  player.carrera.mundo = newWorld;
  batchLogger.log(`\n🔄 MOVIMIENTOS LIGA:`, LogType.INFO);
  news.forEach(n => batchLogger.log(n, LogType.INFO));

  // 5. Off-Season (Edad y Stats)
  player.personal.edad++;
  player.carrera.temporada++;
  player.carrera.estadisticasTemporada = { partidosJugados: 0, goles: 0, asistencias: 0, valoracionMedia: 6.0 };
  
  // Progresión simple
  if (player.personal.edad < 24) player.fisicos.velocidad += 1;
  
  batchLogger.log(`\n📅 Temporada finalizada. Edad actual: ${player.personal.edad}`, LogType.SEASON);
};

// --- PUBLIC FUNCTIONS (CONTROLLERS) ---

/**
 * Simula 1 partido. Si es el último, cierra temporada.
 */
export const runNextMatch = async (logger: Logger, player: Player): Promise<Player> => {
  const batch = new BatchLogger(logger);
  const calendar = getCalendarForSeason(player);
  
  const matchesPlayed = player.carrera.estadisticasTemporada.partidosJugados;
  
  if (matchesPlayed >= calendar.length) {
    // Ya terminó la temporada, necesita procesar fin antes de jugar más
    // Esto es un caso borde, normalmente el botón diría "Iniciar Temporada"
    await processEndOfSeason(player, batch);
    await batch.flush();
    return player;
  }

  const nextMatch = calendar[matchesPlayed]; // Index 0 based vs matchesPlayed count
  player = await runMatch(player, nextMatch, batch);
  
  // Si era el último, procesar fin de temporada
  if (player.carrera.estadisticasTemporada.partidosJugados >= calendar.length) {
    await processEndOfSeason(player, batch);
  }

  await batch.flush();
  return player;
};

/**
 * Simula el RESTO de la temporada actual (o toda si empieza).
 */
export const runRestOfSeason = async (logger: Logger, player: Player): Promise<Player> => {
  const batch = new BatchLogger(logger);
  const calendar = getCalendarForSeason(player);
  let matchesPlayed = player.carrera.estadisticasTemporada.partidosJugados;

  batch.log(`⏩ Simulando resto de temporada (${calendar.length - matchesPlayed} partidos)...`, LogType.INFO);

  while (matchesPlayed < calendar.length) {
    const nextMatch = calendar[matchesPlayed];
    player = await runMatch(player, nextMatch, batch);
    matchesPlayed++;
    // No hacemos flush por partido para velocidad, solo al final o en chunks
  }

  await processEndOfSeason(player, batch);
  await batch.flush();
  return player;
};

/**
 * Simula N temporadas (Carrera).
 */
export const runCareerDuration = async (logger: Logger, player: Player, seasons: number): Promise<Player> => {
  // Primero terminar la actual si está a medias
  const calendar = getCalendarForSeason(player);
  if (player.carrera.estadisticasTemporada.partidosJugados > 0 && player.carrera.estadisticasTemporada.partidosJugados < calendar.length) {
    player = await runRestOfSeason(logger, player);
    seasons--; // Ya consumimos "parte" de una, ¿cuenta como una? Digamos que completamos la actual y hacemos N-1 más.
  }

  for (let i = 0; i < seasons; i++) {
    // Jugar toda la temporada nueva
    player = await runRestOfSeason(logger, player);
  }
  return player;
};

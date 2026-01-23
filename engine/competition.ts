// engine/competition.ts
import { WorldState } from './types';
import { TEAMS_PRIMERA_BASE, TEAMS_SEGUNDA_BASE, getRandomElement } from './database';

export interface LeagueRow {
  pos: number;
  team: string;
  pts: number;
  gf: number;
  gc: number;
}

export const generateLeagueTable = (teams: string[], playerTeam: string, playerPerformance: number): { table: LeagueRow[], winner: string } => {
  // Simulación abstracta de tabla
  const rows: LeagueRow[] = teams.map(team => ({
    pos: 0,
    team,
    pts: 0,
    gf: 0,
    gc: 0
  }));

  rows.forEach(row => {
    // Base de puntos aleatoria + sesgo por "prestigio" (simulado por posición en array base)
    const baseStrength = 1.0 - (TEAMS_PRIMERA_BASE.indexOf(row.team) / 40); // 0.5 a 1.0 aprox
    row.pts = Math.floor(30 + (Math.random() * 50) + (baseStrength * 20));
    row.gf = Math.floor(30 + Math.random() * 40);
    row.gc = Math.floor(30 + Math.random() * 40);

    // Bonus si es el equipo del jugador y jugó bien
    if (row.team === playerTeam) {
      row.pts += Math.floor(playerPerformance * 0.5); // Si media 8.0 -> +4 puntos
    }
  });

  // Ordenar
  rows.sort((a, b) => b.pts - a.pts);
  rows.forEach((r, i) => r.pos = i + 1);

  return { table: rows, winner: rows[0].team };
};

export const resolveCupMatch = (rival: string, playerTeam: string, playerPlayed: boolean, playerRating: number): { winner: string, score: string, method: string } => {
  // 1. Resultado Base
  let gLocal = 0, gVisit = 0;
  
  // Si juega el jugador, influimos ligeramente
  const baseAdvantage = playerPlayed ? (playerRating - 6.0) / 4 : 0;
  
  const strengthDiff = (Math.random() - 0.5) + baseAdvantage; // -0.5 a 0.5
  
  if (strengthDiff > 0.1) { gLocal = Math.floor(Math.random() * 3) + 1; gVisit = Math.floor(Math.random() * 2); }
  else if (strengthDiff < -0.1) { gLocal = Math.floor(Math.random() * 2); gVisit = Math.floor(Math.random() * 3) + 1; }
  else { gLocal = 1; gVisit = 1; } // Empate probable

  if (gLocal !== gVisit) {
    return { winner: gLocal > gVisit ? playerTeam : rival, score: `${gLocal}-${gVisit}`, method: 'Regular' };
  }

  // 2. Prórroga
  const etLocal = Math.random() > 0.7 ? 1 : 0;
  const etVisit = Math.random() > 0.7 ? 1 : 0;
  
  const ftScore = `${gLocal}-${gVisit}`;
  gLocal += etLocal;
  gVisit += etVisit;
  
  if (gLocal !== gVisit) {
    return { winner: gLocal > gVisit ? playerTeam : rival, score: `${gLocal}-${gVisit} (AET)`, method: 'Prórroga' };
  }

  // 3. Penaltis
  // Simulación 50/50
  const pensLocal = 3 + Math.floor(Math.random() * 3);
  const pensVisit = 3 + Math.floor(Math.random() * 3);
  // Forzar ganador si empatan pens
  const finalWinner = pensLocal >= pensVisit ? playerTeam : rival;
  const winnerScore = pensLocal >= pensVisit ? pensLocal : pensVisit;
  const loserScore = pensLocal >= pensVisit ? pensVisit : pensLocal;

  return { winner: finalWinner, score: `${gLocal}-${gVisit} (${winnerScore}-${loserScore} PEN)`, method: 'Penaltis' };
};

export const processPromotionRelegation = (world: WorldState): { newWorld: WorldState, news: string[] } => {
  const news: string[] = [];
  
  // Copia profuna
  const primera = [...world.equiposPrimera];
  const segunda = [...world.equiposSegunda];
  
  // 3 descienden de Primera (los últimos del array simulado, o random de la cola)
  // Para simplificar sin tabla completa persistente, cogemos 3 randoms del "fondo" teórico
  // Asumimos que los equipos del final de la lista base son "más débiles"
  
  // Mezclar un poco para que no siempre bajen los mismos
  const candidatesRel = primera.slice(14); // Los últimos 6
  const candidatesProm = segunda.slice(0, 6); // Los primeros 6
  
  const relegated = [];
  const promoted = [];

  for(let i=0; i<3; i++) {
    const rIdx = Math.floor(Math.random() * candidatesRel.length);
    const pIdx = Math.floor(Math.random() * candidatesProm.length);
    
    relegated.push(candidatesRel[rIdx]);
    promoted.push(candidatesProm[pIdx]);
    
    // Evitar duplicados en la selección del mismo año (simple splice)
    candidatesRel.splice(rIdx, 1);
    candidatesProm.splice(pIdx, 1);
  }

  // Aplicar cambios
  const newPrimera = primera.filter(t => !relegated.includes(t)).concat(promoted);
  const newSegunda = segunda.filter(t => !promoted.includes(t)).concat(relegated);
  
  news.push(`Descendidos: ${relegated.join(", ")}`);
  news.push(`Ascendidos: ${promoted.join(", ")}`);

  return {
    newWorld: { ...world, equiposPrimera: newPrimera, equiposSegunda: newSegunda },
    news
  };
};
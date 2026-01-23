// engine/types.ts

export enum Posicion {
  PORTERO = "GK",
  DEFENSA_CENTRAL = "CB",
  LATERAL = "FB",
  MEDIOCENTRO = "CM",
  MEDIAPUNTA = "AM",
  EXTREMO = "W",
  DELANTERO = "ST"
}

export enum ResultadoDecision {
  CRITICO_FALLO = "CRITICO_FALLO",
  FALLO = "FALLO",
  PARCIAL = "PARCIAL",
  EXITO = "EXITO",
  PERFECTO = "PERFECTO"
}

export enum LogType {
  INFO = 'INFO',
  MATCH = 'MATCH',    // Blue
  SEASON = 'SEASON',  // Yellow
  INJURY = 'INJURY',  // Red
  AWARD = 'AWARD'     // Gold/Green
}

export interface StatsTecnicos {
  control: number;
  pase: number;
  tiro: number;
  regate: number;
  cabeceo: number;
}

export interface StatsFisicos {
  resistencia: number;
  velocidad: number;
  aceleracion: number;
  fuerza: number;
}

export interface StatsTacticos {
  posicionamiento: number;
  vision: number;
  decisiones: number;
}

export interface StatsMentales {
  disciplina: number;
  confianza: number;
  presion: number; // Capacidad de aguantar presión
}

export interface EstadoJugador {
  fatiga: number; // 0-100 (100 es exhausto)
  forma: number;  // 0-100 (100 es top form)
  moral: number;  // 0-100
  riesgoLesion: number; // %
}

export interface Confianza {
  entrenador: number;
  vestuario: number;
  reputacion: number; // Global
}

export interface StatsTemporada {
  partidosJugados: number;
  goles: number;
  asistencias: number;
  valoracionMedia: number;
}

export interface MatchStats {
  minutos: number;
  goles: number;
  asistencias: number;
  tiros: number;
  pasesCompletados: number;
  robos: number;
  valoracion: number;
}

// Granular Event Details
export interface MatchEvent {
  minuto: number;
  tipo: 'GOL' | 'ASISTENCIA';
  subtipo: string; // "Cabeza", "Volea", "Pase filtrado"
  descripcion: string;
}

export interface MatchRecord {
  temporada: number;
  jornada: number;
  competicion: 'LIGA' | 'COPA';
  rival: string;
  resultado: string; // "2-1"
  jugado: boolean;
  minutos: number;
  stats: MatchStats | null;
  eventos: MatchEvent[];
  detallesExtra?: string; // "Ganado en penaltis", "Prórroga"
}

export interface SeasonSummary {
  temporada: number;
  club: string;
  stats: StatsTemporada;
  premios: string[];
  posicionLiga: number;
  campeonLiga: string;
  campeonCopa: string;
  logros: string[]; // "Ascenso", "Descenso", "Campeón"
}

export interface WorldState {
  equiposPrimera: string[];
  equiposSegunda: string[];
  campeonesHistoricos: string[];
}

export interface SeasonHistory {
  historialPartidos: MatchRecord[];
  resumenesTemporadas: SeasonSummary[];
  lesionesSufridas: number;
  semanasLesionado: number;
  eventosImportantes: string[];
}

export interface Carrera {
  club: string;
  rol: 'Reserva' | 'Rotación' | 'Titular' | 'Estrella';
  temporada: number;
  etiquetas: string[]; 
  estadisticasTemporada: StatsTemporada;
  historial: SeasonHistory; 
  mundo: WorldState; // Nuevo: Estado del mundo (ascensos/descensos)
}

export interface Player {
  id: string;
  personal: {
    nombre: string;
    edad: number;
    nacionalidad: string;
    genero: 'M' | 'F';
    piernaDominante: 'Derecha' | 'Izquierda' | 'Ambas';
    altura: number; 
    peso: number; 
    dorsal: number;
    fechaNacimiento: string;
    cantera: string;
    representante: string;
  };
  posicionPrincipal: Posicion;
  posicionesSecundarias: Posicion[];
  
  tecnicos: StatsTecnicos;
  fisicos: StatsFisicos;
  tacticos: StatsTacticos;
  mentales: StatsMentales;
  
  estado: EstadoJugador;
  confianza: Confianza;
  carrera: Carrera;
}

export interface DecisionContext {
  dificultadBase: number; 
  presionSituacional: number; 
  bonusContexto: number; 
}

export interface DecisionOption {
  id: string;
  texto: string;
  tipo: 'AGRESIVO' | 'EQUILIBRADO' | 'SEGURO' | 'TECNICO' | 'TACTICO' | 'FISICO';
  statPrincipal: keyof StatsTecnicos | keyof StatsFisicos | keyof StatsTacticos; 
  pesoStat: number; 
  riesgo: number; 
}

// Logger ahora soporta batching implícitamente si se maneja en UI, 
// pero mantenemos la firma simple para compatibilidad.
export type Logger = (msg: string, type?: LogType) => Promise<void>;
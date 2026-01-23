// engine/player.ts
import { Player, Posicion } from './types';
import { TEAMS_PRIMERA_BASE, TEAMS_SEGUNDA_BASE } from './database';

export const createDefaultPlayer = (): Player => {
  return {
    id: 'player_001',
    personal: {
      nombre: "Alex 'El Rayo' Martínez",
      edad: 18, 
      nacionalidad: "España",
      genero: 'M',
      piernaDominante: 'Derecha',
      altura: 178,
      peso: 74,
      dorsal: 29,
      fechaNacimiento: "12/04/2006",
      cantera: "Rayo Vallecano",
      representante: "Golazo Sports Agency"
    },
    posicionPrincipal: Posicion.DELANTERO,
    posicionesSecundarias: [Posicion.EXTREMO],
    
    tecnicos: {
      control: 70,
      pase: 65,
      tiro: 75,
      regate: 72,
      cabeceo: 60
    },
    fisicos: {
      resistencia: 70,
      velocidad: 82,
      aceleracion: 80,
      fuerza: 65
    },
    tacticos: {
      posicionamiento: 68,
      vision: 60,
      decisiones: 65
    },
    mentales: {
      disciplina: 70,
      confianza: 75,
      presion: 60
    },
    
    estado: {
      fatiga: 0,
      forma: 80,
      moral: 85,
      riesgoLesion: 5
    },
    
    confianza: {
      entrenador: 60,
      vestuario: 50,
      reputacion: 40
    },
    
    carrera: {
      club: "Rayo Vallecano",
      rol: "Rotación",
      temporada: 1,
      etiquetas: ["Joven Promesa"],
      estadisticasTemporada: {
        partidosJugados: 0,
        goles: 0,
        asistencias: 0,
        valoracionMedia: 6.0
      },
      historial: {
        historialPartidos: [],
        resumenesTemporadas: [],
        lesionesSufridas: 0,
        semanasLesionado: 0,
        eventosImportantes: []
      },
      mundo: {
        equiposPrimera: [...TEAMS_PRIMERA_BASE],
        equiposSegunda: [...TEAMS_SEGUNDA_BASE],
        campeonesHistoricos: []
      }
    }
  };
};

export const updatePlayerStats = (player: Player, effects: Partial<Player['estado'] & Player['confianza']>): Player => {
  return {
    ...player,
    estado: {
      ...player.estado,
      fatiga: Math.min(100, Math.max(0, player.estado.fatiga + (effects.fatiga || 0))),
      moral: Math.min(100, Math.max(0, player.estado.moral + (effects.moral || 0))),
    },
    confianza: {
      ...player.confianza,
      entrenador: Math.min(100, Math.max(0, player.confianza.entrenador + (effects.entrenador || 0))),
    }
  };
};
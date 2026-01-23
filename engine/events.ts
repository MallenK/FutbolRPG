// engine/events.ts
import { Player, Logger, LogType } from './types';
import { updatePlayerStats } from './player';

export interface EventOption {
  texto: string;
  statCheck?: keyof Player['mentales']; 
  efectos: (player: Player) => Partial<Player['estado'] & Player['confianza']>;
  logResultado: string;
}

export interface CareerEvent {
  id: string;
  titulo: string;
  descripcion: string;
  triggerCondition: (player: Player) => boolean;
  opciones: EventOption[];
}

const careerEvents: CareerEvent[] = [
  {
    id: 'conflicto_entrenador',
    titulo: 'Conflicto Táctico',
    descripcion: 'El entrenador te recrimina públicamente por tu falta de sacrificio defensivo.',
    triggerCondition: (p) => p.confianza.entrenador < 40 && Math.random() < 0.3,
    opciones: [
      {
        texto: "Pedir disculpas y trabajar más",
        statCheck: 'disciplina',
        efectos: (p) => ({ entrenador: 10, moral: -5, fatiga: 10 }),
        logResultado: "El míster valora tu humildad. Recuperas confianza."
      },
      {
        texto: "Discutir y defender tu estilo",
        statCheck: 'confianza',
        efectos: (p) => ({ entrenador: -15, reputacion: 5, moral: 5 }),
        logResultado: "La discusión sube de tono. El vestuario te apoya, pero el míster te sentencia."
      }
    ]
  },
  {
    id: 'oferta_renovacion',
    titulo: 'Oferta de Renovación',
    descripcion: 'El club te ofrece extender el contrato, pero con un sueldo bajo.',
    triggerCondition: (p) => p.carrera.estadisticasTemporada.valoracionMedia > 7.5 && Math.random() < 0.1,
    opciones: [
      {
        texto: "Aceptar por amor al club",
        efectos: (p) => ({ entrenador: 5, vestuario: 10, reputacion: 2 }),
        logResultado: "Firmas la renovación. La afición te adora."
      },
      {
        texto: "Rechazar y esperar algo mejor",
        statCheck: 'confianza',
        efectos: (p) => ({ entrenador: -5, moral: 5 }),
        logResultado: "Rechazas la oferta. El club se molesta, pero tú confías en tu valor."
      }
    ]
  },
  {
    id: 'presion_mediatica',
    titulo: 'Presión Mediática',
    descripcion: 'Rumores sobre tu vida nocturna aparecen en prensa rosa.',
    triggerCondition: (p) => p.confianza.reputacion > 60 && Math.random() < 0.2,
    opciones: [
      {
        texto: "Emitir comunicado y centrarte",
        statCheck: 'disciplina',
        efectos: (p) => ({ reputacion: 5, moral: -5 }),
        logResultado: "Desmientes los rumores con elegancia."
      },
      {
        texto: "Ignorarlo (salir de fiesta igual)",
        efectos: (p) => ({ forma: -10, fatiga: 10, moral: 10 }),
        logResultado: "Decides ignorar a la prensa. Tu forma física se resiente."
      }
    ]
  },
  {
    id: 'ultima_oportunidad',
    titulo: 'Ultimátum',
    descripcion: 'Tu rendimiento es inaceptable. Si no mejoras, te irás a la grada.',
    triggerCondition: (p) => p.carrera.estadisticasTemporada.valoracionMedia < 5.5 && p.carrera.estadisticasTemporada.partidosJugados > 3,
    opciones: [
      {
        texto: "Entrenar doble turno",
        statCheck: 'presion',
        efectos: (p) => ({ fatiga: 20, forma: 15, entrenador: 5 }),
        logResultado: "Te machacas físicamente. Estás agotado pero en mejor forma."
      },
      {
        texto: "Quejarse del sistema",
        efectos: (p) => ({ entrenador: -20, vestuario: -10 }),
        logResultado: "Te excusas en la táctica. Nadie te cree."
      }
    ]
  }
];

export const triggerWeeklyEvent = async (player: Player, logger: Logger): Promise<Player> => {
  const posibles = careerEvents.filter(e => e.triggerCondition(player));
  
  if (posibles.length === 0) return player;

  const evento = posibles[Math.floor(Math.random() * posibles.length)];
  
  await logger(`\n📢 [EVENTO] ${evento.titulo.toUpperCase()}`, LogType.INFO);
  
  // Simulación de decisión
  let opcionElegida: EventOption;
  const roll = Math.random() * 100;
  const bestOption = evento.opciones.find(o => o.statCheck && player.mentales[o.statCheck] > 60);
  
  if (bestOption && roll < 80) {
    opcionElegida = bestOption;
  } else {
    opcionElegida = evento.opciones[Math.floor(Math.random() * evento.opciones.length)];
  }

  await logger(`>> Decisión: ${opcionElegida.texto}`, LogType.INFO);
  await logger(`>> Resultado: ${opcionElegida.logResultado}`, LogType.INFO);

  player.carrera.historial.eventosImportantes.push(`${evento.titulo}: ${opcionElegida.texto}`);

  return updatePlayerStats(player, opcionElegida.efectos(player));
};
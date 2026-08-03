// ─── Types ────────────────────────────────────────────────────────────────────

export type EventoEfectos = {
  moral?: number
  forma?: number
  fatiga?: number
  riesgoLesion?: number
  reputacion?: number
  confianza_entrenador?: number
  confianza_vestuario?: number
  transferirA?: { club: string; liga: string; rol: string; division: number }
  seleccionConvocado?: boolean
  attributePoints?: number
  addTrait?: string
  removeTrait?: string
}

export type OpcionEvento = {
  id: string
  texto: string
  narrativo: string
  efectos: EventoEfectos
  requiereStat?: { stat: string; minValue: number }
  seguimientoEventoId?: string
}

export type CareerEvent = {
  id: string
  tipo: "PRENSA" | "LESION" | "TRANSFERENCIA" | "EQUIPO" | "ENTRENAMIENTO" | "PERSONAL" | "SELECCION"
  titulo: string
  descripcion: string
  opciones: OpcionEvento[]
  minJornada?: number
  minDivision?: number
  maxDivision?: number
  posiciones?: string[]      // vacío = todas; ["ST","W"] = solo delanteros/extremos
  roles?: string[]           // vacío = todos; ["Titular","Estrella"]
  requiereStats?: Record<string, number>  // evento aparece solo si jugador cumple umbral
  minReputacion?: number
  esArco?: boolean           // true = no aparece por azar, solo como seguimiento de arco
}

export type PlayerContext = {
  position?: string
  role?: string
  reputacion?: number
  stats?: Record<string, number>
}

// ─── PRENSA ───────────────────────────────────────────────────────────────────

const EVENTOS_PRENSA: CareerEvent[] = [
  {
    id: "prensa_victoria",
    tipo: "PRENSA",
    titulo: "Rueda de prensa post-victoria",
    descripcion: "El equipo acaba de ganar y los medios quieren tus palabras. El micrófono es tuyo.",
    opciones: [
      {
        id: "felicitar_equipo",
        texto: "\"El mérito es del equipo, yo solo hice mi trabajo\"",
        narrativo: "Tu humildad llega bien al vestuario y el entrenador lo valora.",
        efectos: { moral: 5, confianza_vestuario: 8, confianza_entrenador: 5, reputacion: 2 },
      },
      {
        id: "destacar_actuacion",
        texto: "\"Creo que hoy demostré mi nivel real\"",
        narrativo: "Los medios te destacan, pero en el vestuario hay quien levanta las cejas.",
        efectos: { reputacion: 10, confianza_vestuario: -5, moral: 3 },
      },
      {
        id: "hablar_objetivos",
        texto: "\"Seguimos trabajando, esto es solo el principio\"",
        narrativo: "Respuesta ambiciosa y de líder. El club y la afición lo valoran.",
        efectos: { moral: 4, reputacion: 6, confianza_entrenador: 4 },
      },
    ],
  },
  {
    id: "prensa_critica",
    tipo: "PRENSA",
    titulo: "Críticas en la prensa",
    descripcion: "Un periodista te ha señalado como el eslabón débil del equipo. El artículo está circulando.",
    opciones: [
      {
        id: "ignorar",
        texto: "Ignorarlo. Que hable el campo.",
        narrativo: "Silencio y trabajo. Tu actitud convence al entrenador aunque por dentro duela.",
        efectos: { moral: -5, forma: 3, confianza_entrenador: 5 },
      },
      {
        id: "responder_con_clase",
        texto: "Dar una respuesta elegante en redes",
        narrativo: "Tu respuesta medida gana admiradores. La polémica se apaga con dignidad.",
        efectos: { moral: 2, reputacion: 5, confianza_vestuario: 3 },
      },
      {
        id: "enfrentarse",
        texto: "Confrontar al periodista públicamente",
        narrativo: "La pelea mediática te desgasta. El club no quiere polémicas.",
        efectos: { moral: -8, reputacion: -5, confianza_entrenador: -8 },
      },
    ],
  },
  {
    id: "prensa_renovacion",
    tipo: "PRENSA",
    titulo: "Pregunta sobre tu contrato",
    descripcion: "Un periodista te pregunta directamente si seguirás en el club la próxima temporada.",
    opciones: [
      {
        id: "confirmar_compromiso",
        texto: "\"Estoy muy feliz aquí, mi cabeza está en este club\"",
        narrativo: "El director deportivo lo agradece. Las negociaciones de renovación avanzan.",
        efectos: { moral: 3, confianza_entrenador: 8, reputacion: 3 },
      },
      {
        id: "dejar_abierto",
        texto: "\"Veremos qué pasa al final de temporada\"",
        narrativo: "Respuesta ambigua que genera rumores. Los aficionados están inquietos.",
        efectos: { reputacion: 5, confianza_entrenador: -3 },
      },
    ],
  },
  {
    id: "prensa_record",
    tipo: "PRENSA",
    titulo: "¡Récord del club!",
    descripcion: "Acabas de convertirte en el jugador más joven en alcanzar una marca histórica del club.",
    opciones: [
      {
        id: "agradecer_club",
        texto: "Agradecer al club y a la afición",
        narrativo: "El estadio te aclama. Tu nombre empieza a sonar más allá de la ciudad.",
        efectos: { moral: 12, reputacion: 15, confianza_vestuario: 5 },
      },
      {
        id: "pedir_mas",
        texto: "\"Quiero seguir rompiendo récords\"",
        narrativo: "La ambición es bien vista. Los cazatalentos toman nota.",
        efectos: { moral: 8, reputacion: 12, forma: 5 },
      },
    ],
  },
  {
    id: "prensa_redes_sociales",
    tipo: "PRENSA",
    titulo: "Un momento incómodo se hace viral",
    descripcion: "Alguien grabó tu cara de frustración al ser sustituido y el vídeo lleva medio millón de reproducciones.",
    opciones: [
      {
        id: "humor_viral",
        texto: "Reírte de ti mismo en redes: \"Necesito trabajar el poker face\"",
        narrativo: "El gesto desinfla la polémica. Los aficionados lo adoran. Sumas seguidores y credibilidad.",
        efectos: { reputacion: 10, moral: 5, confianza_vestuario: 5 },
      },
      {
        id: "ignorar_viral",
        texto: "Ignorarlo, el tiempo lo olvida",
        narrativo: "El clip sigue circulando pero sin tu reacción pierde fuerza. El ruido se apaga.",
        efectos: { moral: -2, reputacion: -3 },
      },
      {
        id: "disculpa_formal",
        texto: "Publicar una disculpa seria al entrenador y al club",
        narrativo: "El club lo agradece públicamente. El entrenador te llama para decirte que ya está olvidado.",
        efectos: { moral: 3, confianza_entrenador: 10, confianza_vestuario: 4 },
      },
    ],
  },
  {
    id: "prensa_leyenda",
    tipo: "PRENSA",
    titulo: "Te comparan con una leyenda",
    descripcion: "Un periodista veterano escribe que recuerdas al mejor jugador de la historia del club en tu posición.",
    opciones: [
      {
        id: "humildad_leyenda",
        texto: "\"No estoy a su nivel, aprendo cada día\"",
        narrativo: "La respuesta llega a la leyenda en cuestión, que te manda un mensaje privado de apoyo.",
        efectos: { moral: 15, reputacion: 12, forma: 5 },
      },
      {
        id: "aceptar_comparacion",
        texto: "\"Es un honor, haré todo para estar a su altura\"",
        narrativo: "La afición lo celebra pero los vestuarios rivales lo usarán como motivación extra.",
        efectos: { reputacion: 18, moral: 8, confianza_vestuario: -3 },
      },
    ],
  },
  {
    id: "prensa_declaracion_companero",
    tipo: "PRENSA",
    titulo: "Un compañero te señala en rueda de prensa",
    descripcion: "Tras una derrota, un compañero dijo ante los medios que el equipo necesita \"más sacrificio de todos\". Todos saben que te miraba a ti.",
    opciones: [
      {
        id: "hablar_vestuario",
        texto: "Abordarlo en el vestuario antes de que escale",
        narrativo: "La conversación es tensa pero directa. Quedáis en hacer borrón y cuenta nueva.",
        efectos: { moral: -3, confianza_vestuario: 5, confianza_entrenador: 5 },
      },
      {
        id: "responder_prensa",
        texto: "Responderle en la siguiente rueda de prensa",
        narrativo: "El intercambio en medios divide la opinión. El entrenador convoca una reunión urgente.",
        efectos: { moral: -5, reputacion: -5, confianza_vestuario: -8, confianza_entrenador: -5 },
      },
      {
        id: "trabajo_silencioso",
        texto: "No decir nada y responder con el rendimiento",
        narrativo: "Tu actitud profesional desactiva el conflicto. La prensa pierde el hilo de la historia.",
        efectos: { forma: 5, confianza_entrenador: 8, moral: 2 },
      },
    ],
  },
  {
    id: "prensa_polemica_viral",
    tipo: "PRENSA",
    titulo: "Tus palabras desatan la tormenta",
    descripcion: "En una entrevista relajada dijiste algo que sacaron de contexto. Los titulares son devastadores. El club te pide que actúes.",
    opciones: [
      {
        id: "disculpa_rapida",
        texto: "Disculparte de inmediato con un comunicado claro",
        narrativo: "La crisis se gestiona rápido. El club lo aplaude y los medios pasan página en 48 horas.",
        efectos: { moral: 3, reputacion: 5, confianza_entrenador: 8 },
        seguimientoEventoId: "prensa_arc_resuelta",
      },
      {
        id: "defender_contexto",
        texto: "Defender que te sacaron de contexto",
        narrativo: "Tienes razón, pero el barro ya salpica. La polémica se enquista y los rivales la explotan.",
        efectos: { moral: -5, reputacion: -8, confianza_entrenador: -5 },
        seguimientoEventoId: "prensa_arc_escalada",
      },
    ],
  },
]

// ─── LESIÓN ───────────────────────────────────────────────────────────────────

const EVENTOS_LESION: CareerEvent[] = [
  {
    id: "lesion_muscular",
    tipo: "LESION",
    titulo: "Molestia muscular en entrenamiento",
    descripcion: "El médico detecta una pequeña contractura en el isquiotibial. No es grave pero requiere decisión.",
    opciones: [
      {
        id: "descansar",
        texto: "Descansar y recuperarse bien",
        narrativo: "Tres días de reposo. Llegas al partido siguiente al 100%.",
        efectos: { fatiga: -15, riesgoLesion: -10, forma: -5 },
      },
      {
        id: "infiltracion",
        texto: "Infiltración y seguir entrenando",
        narrativo: "Entrenas con dolor. Llegas al partido pero el riesgo de lesión seria es real.",
        efectos: { riesgoLesion: 20, fatiga: 10, confianza_entrenador: 5 },
      },
      {
        id: "tratamiento_moderado",
        texto: "Tratamiento sin forzar, a criterio del médico",
        narrativo: "El fisio maneja la situación. Llegas justo para el partido.",
        efectos: { fatiga: -5, riesgoLesion: -5, forma: -2 },
      },
    ],
  },
  {
    id: "lesion_golpe",
    tipo: "LESION",
    titulo: "Golpe en el último partido",
    descripcion: "Recibes un golpe en el tobillo que no pitó el árbitro. El fisio recomienda precaución esta semana.",
    opciones: [
      {
        id: "reposo_total",
        texto: "Reposo total e hielo",
        narrativo: "Llegas al siguiente partido sin molestias. El tobillo está perfecto.",
        efectos: { fatiga: -10, riesgoLesion: -8, forma: -3 },
      },
      {
        id: "entrenar_con_cuidado",
        texto: "Entrenar con cuidado adaptando los ejercicios",
        narrativo: "Entrenamientos suaves. Llegas al partido con algo de precaución pero funcional.",
        efectos: { riesgoLesion: 5, fatiga: 5 },
      },
    ],
  },
  {
    id: "fisio_descanso",
    tipo: "LESION",
    titulo: "El fisio recomienda un descanso activo",
    descripcion: "No hay lesión, pero el fisio ve señales de sobrecarga. Propone una semana diferente.",
    opciones: [
      {
        id: "aceptar_protocolo",
        texto: "Seguir el protocolo del fisio",
        narrativo: "Semana de recuperación activa. Llegas al partido fresco y con las pilas cargadas.",
        efectos: { fatiga: -20, riesgoLesion: -5, forma: 5 },
      },
      {
        id: "ignorar_fisio",
        texto: "Seguir entrenando a tope, necesitas ritmo",
        narrativo: "Tu cuerpo acusa la carga. El rendimiento puede verse afectado.",
        efectos: { fatiga: 15, riesgoLesion: 10, forma: 3 },
      },
    ],
  },
  {
    id: "lesion_rodilla",
    tipo: "LESION",
    titulo: "Inflamación en la rodilla",
    descripcion: "Los análisis muestran inflamación leve en el tendón rotuliano. El médico habla de dos opciones: reposo o cirugía preventiva menor.",
    opciones: [
      {
        id: "reposo_prolongado",
        texto: "Reposo prolongado y fisioterapia intensiva",
        narrativo: "Dos semanas de trabajo específico. La rodilla queda en perfectas condiciones para el tramo final.",
        efectos: { fatiga: -25, riesgoLesion: -15, forma: -10 },
      },
      {
        id: "infiltracion_rodilla",
        texto: "Infiltración para continuar",
        narrativo: "Puedes seguir jugando pero el médico te advierte que el riesgo de recaída es alto.",
        efectos: { riesgoLesion: 25, fatiga: 5, confianza_entrenador: 5 },
      },
      {
        id: "cirugia_preventiva",
        texto: "Operar ahora para cerrar el problema definitivamente",
        narrativo: "Pierdes tres semanas pero la rodilla queda blindada. Una decisión de largo plazo.",
        efectos: { fatiga: -30, riesgoLesion: -25, forma: -20, moral: -5 },
      },
    ],
  },
  {
    id: "lesion_enfermedad",
    tipo: "LESION",
    titulo: "Gripe justo antes del partido más importante",
    descripcion: "Te despiertas con 38.5°C. El médico dice que tienes un 50% de posibilidades de estar bien para jugar.",
    opciones: [
      {
        id: "guardar_cama",
        texto: "Quedarte en casa y recuperar bien",
        narrativo: "No juegas pero llegas al siguiente partido al 100%. El equipo lo entiende.",
        efectos: { fatiga: -20, riesgoLesion: -5, moral: -5 },
      },
      {
        id: "jugar_enfermo",
        texto: "Jugar con todo aunque no estés al 100%",
        narrativo: "Tu entrega impresiona. Juegas 60 minutos antes de ser sustituido. Sumas respeto en el vestuario.",
        efectos: { fatiga: 20, riesgoLesion: 10, confianza_vestuario: 10, confianza_entrenador: 8, moral: 5 },
      },
    ],
  },
  {
    id: "lesion_sobrecarga",
    tipo: "LESION",
    titulo: "El cuerpo pide parar",
    descripcion: "Llevas 6 partidos seguidos de titular. El preparador físico detecta sobrecargas múltiples. Te recomienda descansar un partido.",
    opciones: [
      {
        id: "aceptar_descanso",
        texto: "Aceptar el descanso y recargar",
        narrativo: "Un partido fuera te sienta bien. Vuelves con energía renovada y sin riesgo de lesión.",
        efectos: { fatiga: -30, riesgoLesion: -10, forma: 8 },
      },
      {
        id: "insistir_jugar",
        texto: "Insistir en jugar, te sientes bien",
        narrativo: "El entrenador cede pero el cuerpo lo acusa en la segunda mitad.",
        efectos: { fatiga: 15, riesgoLesion: 12, confianza_entrenador: -5 },
      },
    ],
  },
  {
    id: "lesion_recurrente",
    tipo: "LESION",
    titulo: "La misma lesión, otra vez",
    descripcion: "El isquiotibial que se resintió la temporada pasada vuelve a darte problemas. El médico dice que necesitas una decisión definitiva.",
    opciones: [
      {
        id: "parar_definitivamente",
        texto: "Parar del todo y hacer el tratamiento completo de 4 semanas",
        narrativo: "La decisión más difícil de la temporada. Pero el médico dice que es la única forma de cerrar esto.",
        efectos: { fatiga: -35, forma: -15, riesgoLesion: -20 },
        seguimientoEventoId: "lesion_arc_recuperacion_completa",
      },
      {
        id: "parche_y_seguir",
        texto: "Parche, infiltración y seguir compitiendo",
        narrativo: "El médico te avisa: estás comprando tiempo. El riesgo de lesión grave crece cada semana.",
        efectos: { riesgoLesion: 30, fatiga: 10, confianza_entrenador: 5 },
        seguimientoEventoId: "lesion_arc_agravamiento",
      },
    ],
  },
  {
    id: "lesion_prevencion",
    tipo: "LESION",
    titulo: "Programa de prevención personalizado",
    descripcion: "El fisio ha diseñado un programa específico para tu perfil físico. Requiere media hora extra diaria durante tres semanas.",
    opciones: [
      {
        id: "aceptar_programa",
        texto: "Aceptar y comprometerte al 100%",
        narrativo: "Tres semanas de trabajo. El fisio dice que tu perfil de riesgo ha bajado considerablemente.",
        efectos: { riesgoLesion: -15, fatiga: -10, confianza_entrenador: 5, attributePoints: 1 },
      },
      {
        id: "hacer_parcialmente",
        texto: "Intentarlo pero sin garantías de constancia",
        narrativo: "El programa se hace a medias. Algún beneficio pero no el resultado óptimo.",
        efectos: { riesgoLesion: -5, fatiga: -5 },
      },
    ],
  },
]

// ─── TRANSFERENCIA ────────────────────────────────────────────────────────────

const EVENTOS_TRANSFERENCIA: CareerEvent[] = [
  {
    id: "oferta_division_superior",
    tipo: "TRANSFERENCIA",
    titulo: "¡Oferta de la división superior!",
    descripcion: "Tu agente te llama emocionado. Un club del nivel superior ha preguntado por ti. El club pide una cesión o traspaso.",
    minJornada: 4,
    maxDivision: 4,
    opciones: [
      {
        id: "aceptar_oferta",
        texto: "Pedir al club que acepte la oferta",
        narrativo: "El club acepta tras negociación. Das el salto al siguiente nivel.",
        efectos: {
          moral: 20, reputacion: 30, confianza_entrenador: -10,
          transferirA: { club: "__NEXT_DIVISION_CLUB__", liga: "__NEXT_DIVISION_NAME__", rol: "Rotación", division: -1 },
        },
      },
      {
        id: "quedarse",
        texto: "Rechazar y seguir en tu club",
        narrativo: "El club y los aficionados te lo agradecen. Tu reputación local sube.",
        efectos: { moral: 8, reputacion: 10, confianza_entrenador: 15, confianza_vestuario: 10 },
      },
    ],
  },
  {
    id: "oferta_champions",
    tipo: "TRANSFERENCIA",
    titulo: "¡Interés de un gigante europeo!",
    descripcion: "Tu agente no puede creerlo: un club de Champions League ha preguntado por ti. Una oportunidad histórica.",
    minJornada: 4,
    minDivision: 4,
    opciones: [
      {
        id: "aceptar_champions",
        texto: "Aceptar el reto europeo",
        narrativo: "Firmas por el gigante europeo. Tu carrera da el salto definitivo a la élite mundial.",
        efectos: {
          moral: 25, reputacion: 40, confianza_entrenador: -10,
          transferirA: { club: "__NEXT_DIVISION_CLUB__", liga: "Champions League", rol: "Rotación", division: 5 },
        },
      },
      {
        id: "rechazar_champions",
        texto: "Rechazar, no es el momento",
        narrativo: "El club respira aliviado. Los aficionados te ovacionan. Seguirás siendo el ídolo local.",
        efectos: { moral: 10, reputacion: 15, confianza_entrenador: 15, confianza_vestuario: 12 },
      },
    ],
  },
  {
    id: "oferta_extranjero",
    tipo: "TRANSFERENCIA",
    titulo: "Interés desde el extranjero",
    descripcion: "Un club de la liga portuguesa ha hecho una oferta formal. Sueldo el doble, proyecto ganador, pero salir de España.",
    minJornada: 5,
    minDivision: 2,
    opciones: [
      {
        id: "emigrar",
        texto: "Aceptar el reto internacional",
        narrativo: "Nueva aventura en el extranjero. La experiencia internacional dispara tu perfil.",
        efectos: {
          moral: 15, reputacion: 25,
          transferirA: { club: "Sporting de Portugal", liga: "Primeira Liga", rol: "Rotación", division: 4 },
        },
      },
      {
        id: "preferir_espana",
        texto: "Preferir continuar en España",
        narrativo: "El club valora tu lealtad y te ofrece una pequeña mejora de contrato.",
        efectos: { moral: 5, reputacion: 5, confianza_entrenador: 10 },
      },
    ],
  },
  {
    id: "renovacion_club",
    tipo: "TRANSFERENCIA",
    titulo: "El club propone renovación",
    descripcion: "El director deportivo te llama para hablar de renovar tu contrato con mejora salarial del 15%.",
    opciones: [
      {
        id: "aceptar_renovacion",
        texto: "Firmar la renovación",
        narrativo: "Firmas la ampliación. Te quedas con tranquilidad y el club respira aliviado.",
        efectos: { moral: 10, reputacion: 5, confianza_entrenador: 10, confianza_vestuario: 5 },
      },
      {
        id: "pedir_mas",
        texto: "Pedir mejores condiciones antes de firmar",
        narrativo: "Las negociaciones se alargan. Hay tensión, pero el club sube un poco más la oferta.",
        efectos: { moral: 3, reputacion: 3, confianza_entrenador: -5 },
      },
      {
        id: "rechazar_renovacion",
        texto: "Rechazar, prefiero explorar el mercado",
        narrativo: "El club no lo entiende bien. El ambiente se enfría ligeramente.",
        efectos: { moral: -3, reputacion: 5, confianza_entrenador: -10 },
      },
    ],
  },
  {
    id: "oferta_prestamo",
    tipo: "TRANSFERENCIA",
    titulo: "Propuesta de cesión a préstamo",
    descripcion: "Un club de tu misma división quiere cederte seis meses. Más minutos garantizados, pero cambiar de ambiente.",
    roles: ["Reserva", "Rotación"],
    opciones: [
      {
        id: "aceptar_prestamo",
        texto: "Aceptar: necesito minutos para crecer",
        narrativo: "Firmas la cesión. El cambio de escenario te da el protagonismo que pedías.",
        efectos: { moral: 12, forma: 10, reputacion: 8, confianza_entrenador: -5 },
      },
      {
        id: "rechazar_prestamo",
        texto: "Rechazar y pelear por mi sitio aquí",
        narrativo: "Decides quedarte a competir. El entrenador aprecia tu actitud aunque no promete nada.",
        efectos: { moral: 5, confianza_entrenador: 8 },
      },
    ],
  },
  {
    id: "agente_nuevo_representante",
    tipo: "TRANSFERENCIA",
    titulo: "Un gran agente quiere representarte",
    descripcion: "El agente de varios internacionales te contacta. Dice que puede llevarte al siguiente nivel, pero significaría cambiar de representante.",
    minReputacion: 25,
    opciones: [
      {
        id: "cambiar_agente",
        texto: "Fichar por el nuevo agente",
        narrativo: "Las puertas que se abren son de otra categoría. Los clubes grandes empiezan a preguntar.",
        efectos: { reputacion: 15, moral: 8, confianza_entrenador: -3 },
      },
      {
        id: "mantener_agente_actual",
        texto: "Mantener la lealtad a tu agente actual",
        narrativo: "La decisión dice mucho de quién eres. Tu agente actual redobla sus esfuerzos.",
        efectos: { moral: 8, reputacion: 5, confianza_vestuario: 5 },
      },
    ],
  },
  {
    id: "rumor_mercado",
    tipo: "TRANSFERENCIA",
    titulo: "Un rumor de mercado te involucra",
    descripcion: "Varios medios apuntan que un club grande te quiere en el próximo mercado. Tu agente no confirma ni desmiente.",
    minJornada: 3,
    opciones: [
      {
        id: "desmentir_publicamente",
        texto: "Desmentirlo: \"Estoy centrado en mi equipo\"",
        narrativo: "El club respira. El entrenador te pone de ejemplo de profesionalidad en la reunión del lunes.",
        efectos: { confianza_entrenador: 10, confianza_vestuario: 8, reputacion: 5 },
      },
      {
        id: "no_desmentir",
        texto: "No confirmar ni desmentir, dejar que ruede",
        narrativo: "El rumor crece. El vestuario nota que no has desmentido nada. El entrenador te observa con distancia.",
        efectos: { reputacion: 8, confianza_entrenador: -8, confianza_vestuario: -5 },
      },
    ],
  },
]

// ─── EQUIPO ───────────────────────────────────────────────────────────────────

const EVENTOS_EQUIPO: CareerEvent[] = [
  {
    id: "conflicto_companero",
    tipo: "EQUIPO",
    titulo: "Tensión en el vestuario",
    descripcion: "Tras el entrenamiento, un compañero te echa en cara que no le pasas el balón cuando estás en buena posición.",
    opciones: [
      {
        id: "dialogar",
        texto: "Hablar con él en privado y resolver",
        narrativo: "La conversación es incómoda pero sincera. El ambiente mejora.",
        efectos: { moral: 5, confianza_vestuario: 10 },
      },
      {
        id: "ignorar_conflicto",
        texto: "Ignorarlo, el fútbol lo resolverá",
        narrativo: "El silencio enquista el problema. El vestuario lo nota pero nadie interviene.",
        efectos: { moral: -5, confianza_vestuario: -8 },
      },
      {
        id: "hablar_entrenador",
        texto: "Comentárselo al entrenador",
        narrativo: "El entrenador interviene y media. La situación se neutraliza pero el compañero te mira diferente.",
        efectos: { moral: 2, confianza_entrenador: 5, confianza_vestuario: -5 },
      },
    ],
  },
  {
    id: "capitan_consejo",
    tipo: "EQUIPO",
    titulo: "El capitán te llama aparte",
    descripcion: "El capitán del equipo te dice que eres el jugador más talentoso del vestuario pero que necesitas ser más constante.",
    opciones: [
      {
        id: "aceptar_critica",
        texto: "Agradecerle el consejo y tomar nota",
        narrativo: "Tu actitud madura impresiona al capitán. El vestuario lo nota. Creces como profesional.",
        efectos: { moral: 8, forma: 5, confianza_vestuario: 10, confianza_entrenador: 5 },
      },
      {
        id: "defender_postura",
        texto: "Defender tu rendimiento actual",
        narrativo: "El capitán no insiste pero el mensaje no ha calado. Seguirá observando.",
        efectos: { moral: 3, confianza_vestuario: -3 },
      },
    ],
  },
  {
    id: "celebracion_equipo",
    tipo: "EQUIPO",
    titulo: "Cena de equipo",
    descripcion: "El entrenador organiza una cena para el equipo tras la buena racha. La participación es voluntaria pero esperada.",
    opciones: [
      {
        id: "ir_y_ser_el_alma",
        texto: "Ir y ser el alma de la fiesta",
        narrativo: "Una noche memorable. El grupo está unido. El espíritu de equipo se dispara.",
        efectos: { moral: 12, confianza_vestuario: 12, fatiga: 5 },
      },
      {
        id: "ir_discreto",
        texto: "Ir pero estar discreto",
        narrativo: "Estás pero no brillas socialmente. Cumples pero no conectas del todo.",
        efectos: { moral: 5, confianza_vestuario: 4 },
      },
      {
        id: "no_ir",
        texto: "Excusarte por descanso",
        narrativo: "El equipo lo entiende pero el entrenador frunce el ceño.",
        efectos: { moral: -3, confianza_vestuario: -8, fatiga: -10 },
      },
    ],
  },
  {
    id: "tension_resultados",
    tipo: "EQUIPO",
    titulo: "Reunión de vestuario tras la racha negativa",
    descripcion: "El equipo lleva tres partidos sin ganar. El entrenador convoca una reunión donde cada jugador debe hablar.",
    opciones: [
      {
        id: "liderazgo",
        texto: "Dar un discurso motivador al grupo",
        narrativo: "Tus palabras encogen la habitación. El equipo sale con otra cara al entrenamiento.",
        efectos: { moral: 10, confianza_vestuario: 12, confianza_entrenador: 8, reputacion: 5 },
      },
      {
        id: "autocritica",
        texto: "Reconocer tus errores y proponer mejoras",
        narrativo: "La honestidad te hace ganar respeto en el vestuario.",
        efectos: { moral: 5, confianza_vestuario: 8, confianza_entrenador: 10 },
      },
      {
        id: "silencio_reunion",
        texto: "Escuchar y no comprometerte",
        narrativo: "No sumas ni restas. El equipo pasa página aunque sin gran convicción.",
        efectos: { moral: -2, confianza_vestuario: -5 },
      },
    ],
  },
  {
    id: "nuevo_companero_competencia",
    tipo: "EQUIPO",
    titulo: "El club ficha a un jugador en tu posición",
    descripcion: "El director deportivo confirma la llegada de un jugador para competir directamente contigo. Llega esta semana.",
    opciones: [
      {
        id: "bienvenida_sincera",
        texto: "Darle la bienvenida con sinceridad y ofrecerte a ayudarle",
        narrativo: "Tu actitud sorprende a todos. El entrenador te llama para decirte que eso es lo que quería ver.",
        efectos: { moral: 5, confianza_vestuario: 12, confianza_entrenador: 10 },
        seguimientoEventoId: "equipo_arc_companero_aliado",
      },
      {
        id: "frialdad_calculada",
        texto: "Ser correcto pero frío. Que se gane su sitio.",
        narrativo: "El vestuario nota la tensión. El nuevo compañero también. La competencia está servida.",
        efectos: { moral: 2, confianza_vestuario: -5 },
        seguimientoEventoId: "equipo_arc_companero_rival",
      },
    ],
  },
  {
    id: "charla_entrenador_futuro",
    tipo: "EQUIPO",
    titulo: "El entrenador te cita en su despacho",
    descripcion: "El mister quiere hablar de tu rol para el tramo final de la temporada. No parece ser nada malo, pero tampoco confirma nada.",
    opciones: [
      {
        id: "escuchar_plan",
        texto: "Escuchar su plan y aceptar lo que proponga",
        narrativo: "El entrenador agradece tu disposición y te adelanta que tendrás más minutos.",
        efectos: { moral: 10, confianza_entrenador: 12, forma: 5 },
      },
      {
        id: "exigir_minutos",
        texto: "Ser directo: necesitas más minutos para rendir",
        narrativo: "La conversación es tensa pero honesta. El entrenador valora la franqueza aunque no promete nada.",
        efectos: { moral: 5, confianza_entrenador: -5, reputacion: 3 },
      },
      {
        id: "pedir_objetivos_claros",
        texto: "Pedirle objetivos claros para evaluar tu rendimiento",
        narrativo: "Salís del despacho con un pacto: si cumples ciertas metas, tienes la titularidad.",
        efectos: { moral: 8, confianza_entrenador: 8, forma: 3 },
      },
    ],
  },
  {
    id: "mentor_veterano",
    tipo: "EQUIPO",
    titulo: "Un veterano se interesa por ti",
    descripcion: "El jugador más experimentado del equipo te propone quedaros después de los entrenamientos para trabajar algunos aspectos del juego.",
    opciones: [
      {
        id: "aceptar_mentoria",
        texto: "Aceptar y ser un esponja",
        narrativo: "Las sesiones extra con el veterano abren tu visión del juego. La mejora se nota en partidos.",
        efectos: { forma: 10, moral: 8, confianza_vestuario: 8, attributePoints: 1 },
      },
      {
        id: "declinar_amablemente",
        texto: "Agradecer pero declinar, confías en tu método",
        narrativo: "El veterano lo acepta. Sigues tu camino, aunque quizás perdiste una oportunidad de crecer.",
        efectos: { moral: 2 },
      },
    ],
  },
  {
    id: "liderazgo_vacante",
    tipo: "EQUIPO",
    titulo: "El capitán se va. ¿Quién toma el relevo?",
    descripcion: "El capitán ficha por otro club. El entrenador busca a alguien que llene ese vacío de liderazgo. Varios ojos te miran.",
    minJornada: 5,
    roles: ["Titular", "Estrella"],
    opciones: [
      {
        id: "ofrecerte_lider",
        texto: "Dar un paso al frente y liderar al grupo",
        narrativo: "El entrenador te da el brazalete. El vestuario te sigue. Una nueva versión de ti mismo emerge.",
        efectos: { moral: 15, confianza_vestuario: 15, confianza_entrenador: 12, reputacion: 10, addTrait: "lider" },
      },
      {
        id: "no_capitania",
        texto: "Preferir no ser el capitán, mejor desde la sombra",
        narrativo: "Otro compañero asume el liderazgo formal. Tú aportas desde la discreción.",
        efectos: { moral: 5, confianza_vestuario: 5 },
      },
    ],
  },
  {
    id: "arbitro_polemica",
    tipo: "EQUIPO",
    titulo: "Decisión arbitral injusta que os perjudica",
    descripcion: "Un penalti claro no pitado en el descuento os costó dos puntos. El vestuario está indignado.",
    opciones: [
      {
        id: "calmar_compañeros",
        texto: "Calmar a los compañeros más encendidos",
        narrativo: "Tu madurez evita una sanción colectiva. El entrenador te lo agradece después.",
        efectos: { moral: 3, confianza_vestuario: 8, confianza_entrenador: 8 },
      },
      {
        id: "protestar_publicamente",
        texto: "Protestar públicamente en redes",
        narrativo: "Tus palabras reflejan lo que piensa la afición, pero el árbitro presenta un informe.",
        efectos: { moral: 5, reputacion: 5, confianza_entrenador: -8 },
      },
      {
        id: "silencio_arbitraje",
        texto: "Aceptarlo y foco en el próximo partido",
        narrativo: "Profesionalismo puro. El entrenador destaca tu actitud en la rueda de prensa.",
        efectos: { moral: -2, confianza_entrenador: 10, forma: 3 },
      },
    ],
  },
  {
    id: "fractura_vestuario",
    tipo: "EQUIPO",
    titulo: "El vestuario se divide en dos bandos",
    descripcion: "Hay tensión entre los jugadores extranjeros y los nacionales. El clima está enrarecido y los entrenamientos lo notan.",
    opciones: [
      {
        id: "mediar_grupos",
        texto: "Hacer de puente entre ambos grupos",
        narrativo: "Tu iniciativa de unir a ambos bandos funciona mejor de lo esperado. El vestuario lo agradece.",
        efectos: { moral: 8, confianza_vestuario: 15, confianza_entrenador: 8 },
      },
      {
        id: "alinearse_bando",
        texto: "Alinearte con el bando que más te conviene",
        narrativo: "Ganas aliados en un lado pero pierdes en el otro. La fractura no se cierra.",
        efectos: { confianza_vestuario: -5, moral: -3 },
      },
      {
        id: "ignorar_fractura",
        texto: "Mantenerte al margen del drama",
        narrativo: "No entras en el conflicto pero tampoco ayudas. La situación persiste.",
        efectos: { moral: -2 },
      },
    ],
  },
]

// ─── ENTRENAMIENTO ────────────────────────────────────────────────────────────

const EVENTOS_ENTRENAMIENTO: CareerEvent[] = [
  {
    id: "sesion_extra_tiros",
    tipo: "ENTRENAMIENTO",
    titulo: "Sesión extra de definición",
    descripcion: "El preparador te propone quedarte una hora más para trabajar el remate. Es voluntario.",
    opciones: [
      {
        id: "quedarse",
        texto: "Quedarse y trabajar con intensidad",
        narrativo: "Cien remates después, tu ojo de cara a gol mejora notablemente.",
        efectos: { forma: 8, fatiga: 10, confianza_entrenador: 5 },
      },
      {
        id: "declinar_sesion",
        texto: "Declinar educadamente, necesitas descanso",
        narrativo: "El preparador lo entiende. Descansas pero el trabajo extra queda sin hacerse.",
        efectos: { fatiga: -8 },
      },
    ],
  },
  {
    id: "test_fisico",
    tipo: "ENTRENAMIENTO",
    titulo: "Test de condición física",
    descripcion: "El preparador físico hace los test semestrales. Tus datos salen por encima de la media del equipo.",
    opciones: [
      {
        id: "compartir_datos",
        texto: "Compartir los resultados con el equipo para motivarlos",
        narrativo: "El dato positivo energiza al vestuario. El preparador te felicita públicamente.",
        efectos: { moral: 8, forma: 5, confianza_vestuario: 5, reputacion: 3 },
      },
      {
        id: "mantener_privado",
        texto: "Guardarlo para ti y seguir trabajando",
        narrativo: "Sigues mejorando sin alardear. El entrenador aprecia la discreción.",
        efectos: { moral: 5, forma: 8, confianza_entrenador: 5 },
      },
    ],
  },
  {
    id: "analisis_tactico",
    tipo: "ENTRENAMIENTO",
    titulo: "Sesión de videoanálisis táctico",
    descripcion: "El equipo de analistas presenta errores del último partido. Algunos clips te implican directamente.",
    opciones: [
      {
        id: "atender_tomar_notas",
        texto: "Atender con interés y tomar notas",
        narrativo: "Tu actitud receptiva contrasta con otros. El entrenador te pone como ejemplo.",
        efectos: { forma: 5, confianza_entrenador: 8, confianza_vestuario: 3 },
      },
      {
        id: "defender_decisiones",
        texto: "Defender tus decisiones en los clips",
        narrativo: "El debate es tenso. El analista te rebate con datos. La reunión se alarga.",
        efectos: { moral: -3, confianza_entrenador: -5 },
      },
    ],
  },
  {
    id: "nutricionista",
    tipo: "ENTRENAMIENTO",
    titulo: "El nutricionista propone un plan personalizado",
    descripcion: "Un nutricionista ha analizado tu perfil y propone cambios en la dieta que podrían mejorar tu recuperación entre partidos.",
    opciones: [
      {
        id: "seguir_plan_nutri",
        texto: "Seguir el plan al pie de la letra",
        narrativo: "Cuatro semanas después, los datos de recuperación mejoran. El fisio confirma los cambios.",
        efectos: { fatiga: -10, riesgoLesion: -5, forma: 5, attributePoints: 1 },
      },
      {
        id: "dieta_propia",
        texto: "Agradecerlo pero continuar con tus hábitos",
        narrativo: "Sigues como siempre. Sin mejoras pero sin cambios tampoco.",
        efectos: { moral: 2 },
      },
    ],
  },
  {
    id: "metodologia_nueva",
    tipo: "ENTRENAMIENTO",
    titulo: "El cuerpo técnico estrena metodología",
    descripcion: "El nuevo preparador físico trae ejercicios que nunca habías visto. El equipo está dividido entre curiosidad y resistencia.",
    opciones: [
      {
        id: "adoptar_metodologia",
        texto: "Adoptarla con entusiasmo desde el primer día",
        narrativo: "Tu actitud arrastra a otros. El preparador te señala como el mejor ejemplo del grupo.",
        efectos: { forma: 8, confianza_entrenador: 10, confianza_vestuario: 5, moral: 5 },
      },
      {
        id: "escepticismo",
        texto: "Hacerlo pero con escepticismo visible",
        narrativo: "Cumples pero sin convicción. El preparador lo nota y pierde confianza en ti.",
        efectos: { confianza_entrenador: -5, moral: -2 },
      },
    ],
  },
  {
    id: "psicologo_deportivo",
    tipo: "ENTRENAMIENTO",
    titulo: "El club propone sesiones con el psicólogo deportivo",
    descripcion: "El staff del club ha contratado a un psicólogo deportivo. Las sesiones son voluntarias pero el entrenador las recomienda para todos.",
    opciones: [
      {
        id: "ir_psicologo",
        texto: "Ir con mente abierta",
        narrativo: "Las sesiones te ayudan a gestionar la presión de una forma que no esperabas. El cambio es sutil pero real.",
        efectos: { moral: 10, forma: 5, confianza_entrenador: 5, attributePoints: 1 },
      },
      {
        id: "rechazar_psicologo",
        texto: "Declinar, lo tuyo lo resuelves tú solo",
        narrativo: "No hay obligación. Sigues con tu rutina habitual.",
        efectos: { moral: -2 },
      },
    ],
  },
  {
    id: "evaluacion_mister",
    tipo: "ENTRENAMIENTO",
    titulo: "El entrenador quiere probar algo diferente contigo",
    descripcion: "El mister te llama aparte después del entrenamiento. Cree que podrías rendir mejor con una ligera variación en tu rol o posición en el campo.",
    opciones: [
      {
        id: "aceptar_variacion",
        texto: "Aceptar el experimento con confianza plena",
        narrativo: "El cambio táctico te saca de tu zona de confort. Los primeros días son difíciles pero el entrenador insiste.",
        efectos: { confianza_entrenador: 12, moral: 5 },
        seguimientoEventoId: "entrenamiento_arc_nuevo_rol_exito",
      },
      {
        id: "rechazar_cambio",
        texto: "Explicar que prefieres tu rol habitual",
        narrativo: "El entrenador lo acepta pero la conversación deja un rastro de tensión.",
        efectos: { confianza_entrenador: -8, moral: 2 },
        seguimientoEventoId: "entrenamiento_arc_tension_mister",
      },
    ],
  },
  {
    id: "feedback_asistente",
    tipo: "ENTRENAMIENTO",
    titulo: "El segundo entrenador te da feedback privado",
    descripcion: "El ayudante del míster te busca después del entreno. Tiene observaciones sobre tu juego que no se han dicho en reunión.",
    opciones: [
      {
        id: "escuchar_feedback",
        texto: "Escuchar con atención y hacer preguntas",
        narrativo: "El feedback es valioso y específico. Sales del campo con ideas claras para mejorar.",
        efectos: { forma: 8, confianza_entrenador: 8, moral: 5 },
      },
      {
        id: "tomar_sal",
        texto: "Escuchar pero tomártelo con distancia",
        narrativo: "Tomas nota mentalmente de lo útil. El ayudante queda con dudas de si has aprovechado la charla.",
        efectos: { forma: 3, confianza_entrenador: 3 },
      },
    ],
  },
]

// ─── PERSONAL ─────────────────────────────────────────────────────────────────

const EVENTOS_PERSONAL: CareerEvent[] = [
  {
    id: "familia_visita",
    tipo: "PERSONAL",
    titulo: "Tu familia viene a verte jugar",
    descripcion: "Tus padres y hermanos vendrán al próximo partido. Es la primera vez que te ven jugar en un estadio profesional.",
    opciones: [
      {
        id: "emocionarte",
        texto: "Dejar que la emoción te motive",
        narrativo: "Juegas con un extra de motivación. La familia en la grada siempre suma.",
        efectos: { moral: 15, forma: 8 },
      },
      {
        id: "mantener_cabeza",
        texto: "Tratar el partido como cualquier otro",
        narrativo: "Profesionalismo ante todo. El partido es un partido. Juegas con la cabeza fría.",
        efectos: { moral: 8, forma: 3 },
      },
    ],
  },
  {
    id: "patrocinador",
    tipo: "PERSONAL",
    titulo: "Propuesta de patrocinio",
    descripcion: "Una marca deportiva local te propone ser su imagen. Sueldo modesto pero visibilidad en la ciudad.",
    opciones: [
      {
        id: "aceptar_patrocinador",
        texto: "Aceptarlo, es una buena oportunidad",
        narrativo: "Tu cara aparece en vallas por la ciudad. La reputación local despega.",
        efectos: { reputacion: 12, moral: 8 },
      },
      {
        id: "esperar_mejor_oferta",
        texto: "Esperar a que lleguen propuestas más grandes",
        narrativo: "La marca entiende tu posición. Por ahora sigues sin patrocinador.",
        efectos: { moral: 2 },
      },
    ],
  },
  {
    id: "aficionado_calle",
    tipo: "PERSONAL",
    titulo: "Un niño te reconoce por la calle",
    descripcion: "Un niño de unos 10 años te reconoce en el supermercado. Te pide un autógrafo nervioso y con los ojos brillantes.",
    opciones: [
      {
        id: "foto_autografo_charla",
        texto: "Tomarte el tiempo, foto, autógrafo y charla",
        narrativo: "Cinco minutos que ese niño recordará toda la vida. Y tú también.",
        efectos: { moral: 12, reputacion: 8 },
      },
      {
        id: "firma_rapida",
        texto: "Firma rápida y seguir con tu día",
        narrativo: "El niño se va contento. Tú con la conciencia tranquila.",
        efectos: { moral: 5, reputacion: 3 },
      },
    ],
  },
  {
    id: "reconocimiento_club",
    tipo: "PERSONAL",
    titulo: "El club reconoce tu rendimiento",
    descripcion: "El director deportivo te cita en su despacho para felicitarte por tu actitud y rendimiento esta temporada.",
    opciones: [
      {
        id: "aprovechar_momento",
        texto: "Aprovechar para hablar de tu futuro en el club",
        narrativo: "La conversación va más allá del reconocimiento. Sales con una hoja de ruta clara.",
        efectos: { moral: 12, reputacion: 8, confianza_entrenador: 8 },
      },
      {
        id: "agradecer_y_salir",
        texto: "Agradecer y volver al trabajo",
        narrativo: "Discreción que el club valora. Eres un profesional, no un charlatán.",
        efectos: { moral: 10, confianza_entrenador: 5, reputacion: 5 },
      },
    ],
  },
  {
    id: "charidad_escuela",
    tipo: "PERSONAL",
    titulo: "Un colegio local te invita a hablar",
    descripcion: "Un centro escolar del barrio quiere que vayas a hablar con los niños sobre deporte, esfuerzo y sueños.",
    opciones: [
      {
        id: "ir_colegio",
        texto: "Ir con entusiasmo y preparar algo especial",
        narrativo: "Una hora que marca a todos. El club sube una nota de prensa. Tu imagen en la ciudad crece.",
        efectos: { moral: 15, reputacion: 12 },
      },
      {
        id: "enviar_video",
        texto: "Mandar un vídeo grabado en casa",
        narrativo: "Los niños lo agradecen igualmente pero el impacto es menor.",
        efectos: { moral: 5, reputacion: 4 },
      },
      {
        id: "rechazar_colegio",
        texto: "No tienes tiempo en esta etapa de la temporada",
        narrativo: "El colegio lo entiende pero la oportunidad se pierde.",
        efectos: { moral: -3 },
      },
    ],
  },
  {
    id: "rumor_vida_privada",
    tipo: "PERSONAL",
    titulo: "Un tabloide inventa una historia",
    descripcion: "Un medio amarillista publica una historia sobre tu vida privada que es completamente falsa. Tus compañeros la han visto.",
    opciones: [
      {
        id: "desmentir_brevemente",
        texto: "Desmentirlo con una línea corta y no alimentar el fuego",
        narrativo: "La noticia muere sin oxígeno. El club lo gestiona discretamente.",
        efectos: { moral: 2, reputacion: 3, confianza_entrenador: 3 },
      },
      {
        id: "ignorar_tabloide",
        texto: "Ignorarlo completamente",
        narrativo: "El rumor circula unos días pero sin que le des cuerda se apaga solo.",
        efectos: { moral: -5, reputacion: -3 },
      },
      {
        id: "acciones_legales",
        texto: "Tomar acciones legales contra el medio",
        narrativo: "El proceso es largo pero el mensaje es claro: no eres alguien con quien meterse.",
        efectos: { moral: 5, reputacion: 8, fatiga: 5 },
      },
    ],
  },
  {
    id: "oferta_imagen_marca",
    tipo: "PERSONAL",
    titulo: "Propuesta de campaña publicitaria nacional",
    descripcion: "Una gran marca de ropa deportiva quiere ficharte para una campaña nacional. Dinero, exposición, pero muchos compromisos de agenda.",
    minReputacion: 30,
    opciones: [
      {
        id: "aceptar_campana",
        texto: "Firmar el contrato con la marca",
        narrativo: "Tu cara aparece en todo el país. Tu nombre trasciende el mundo del fútbol.",
        efectos: { reputacion: 20, moral: 10, fatiga: 8 },
      },
      {
        id: "rechazar_campana",
        texto: "Rechazar para mantener el foco en el fútbol",
        narrativo: "El agente no lo entiende, pero el entrenador lo valora enormemente.",
        efectos: { reputacion: 5, confianza_entrenador: 8, forma: 5 },
      },
    ],
  },
  {
    id: "vieja_amistad_rival",
    tipo: "PERSONAL",
    titulo: "Tu amigo de infancia juega contra ti",
    descripcion: "Tu mejor amigo del barrio fichó por el equipo rival. El próximo partido es un duelo especial entre los dos.",
    opciones: [
      {
        id: "tratarlo_como_rival",
        texto: "Tratarlo como a cualquier rival en el campo",
        narrativo: "En el partido das el 100%. Después tomaréis una cerveza. El fútbol y la amistad por separado.",
        efectos: { forma: 5, moral: 8 },
      },
      {
        id: "hablar_antes",
        texto: "Quedar antes del partido para hablar",
        narrativo: "La conversación os da perspectiva a los dos. Entráis al campo con respeto mutuo.",
        efectos: { moral: 12, forma: 3, confianza_vestuario: 3 },
      },
    ],
  },
]

// ─── POSICIÓN: DELANTERO / EXTREMO (ST, W) ───────────────────────────────────

const EVENTOS_DELANTERO: CareerEvent[] = [
  {
    id: "st_racha_goles",
    tipo: "ENTRENAMIENTO",
    titulo: "Cuatro partidos seguidos marcando",
    descripcion: "Llevas cuatro jornadas consecutivas marcando. La prensa habla de ti, el entrenador te felicita y los aficionados cantan tu nombre.",
    posiciones: ["ST", "W"],
    requiereStats: { tiro: 70 },
    opciones: [
      {
        id: "mantener_ritmo",
        texto: "Mantener la cabeza fría y seguir trabajando igual",
        narrativo: "Tu humildad en el éxito es tu mayor virtud. La racha continúa.",
        efectos: { moral: 15, forma: 10, reputacion: 12, confianza_entrenador: 5 },
      },
      {
        id: "exigir_protagonismo",
        texto: "Pedir al entrenador más libertad táctica",
        narrativo: "El entrenador escucha pero te recuerda que el equipo es lo primero.",
        efectos: { moral: 8, reputacion: 8, confianza_entrenador: -5 },
      },
    ],
  },
  {
    id: "st_sequia_goles",
    tipo: "EQUIPO",
    titulo: "Cinco partidos sin marcar. El entrenador habla contigo.",
    descripcion: "La sequía se alarga. Los medios ya escriben de ti. El entrenador te cita en privado para hablar de situación.",
    posiciones: ["ST", "W"],
    opciones: [
      {
        id: "trabajar_mas",
        texto: "Comprometerte a trabajar el doble en entrenamiento",
        narrativo: "El entrenador aprecia la actitud. El equipo te apoya y el trabajo empieza a dar señales.",
        efectos: { forma: 8, confianza_entrenador: 10, fatiga: 10, moral: 5 },
        seguimientoEventoId: "st_arc_sequia_rota",
      },
      {
        id: "pedir_cambio_tactica",
        texto: "Pedir que os alimenten más en el área",
        narrativo: "El entrenador escucha tu propuesta táctica y se comprometete a trabajarla.",
        efectos: { confianza_entrenador: 5, moral: 3 },
        seguimientoEventoId: "st_arc_sequia_ayuda_tactica",
      },
    ],
  },
  {
    id: "st_penalti_clave",
    tipo: "PRENSA",
    titulo: "El entrenador te encomienda el penalti decisivo",
    descripcion: "En el minuto 88, con empate en el marcador, el entrenador te señala a ti para tirar el penalti. Hay más de un delantero en el equipo.",
    posiciones: ["ST", "W"],
    opciones: [
      {
        id: "asumir_penalti",
        texto: "Asumir la responsabilidad sin dudar",
        narrativo: "Caminas hacia el punto con calma. El estadio en silencio. El balón vuela al fondo de la red.",
        efectos: { moral: 20, reputacion: 15, confianza_entrenador: 10, forma: 5 },
      },
      {
        id: "penalti_tecnica",
        texto: "Estudiar al portero antes de tirar",
        narrativo: "Tres segundos de análisis. Eliges esquina y el portero va al otro lado.",
        efectos: { moral: 15, reputacion: 10, confianza_entrenador: 8 },
        requiereStat: { stat: "vision", minValue: 68 },
      },
      {
        id: "ceder_penalti",
        texto: "Cederlo a otro compañero",
        narrativo: "El otro jugador lo falla. El empate persiste. Todos saben que tú lo cediste.",
        efectos: { moral: -8, confianza_entrenador: -10, confianza_vestuario: -5 },
      },
    ],
  },
  {
    id: "st_nuevo_delantero",
    tipo: "TRANSFERENCIA",
    titulo: "El club ficha a otro delantero",
    descripcion: "Acaba de llegar un delantero con mucho nombre. Los medios dicen que viene para ser el titular indiscutible.",
    posiciones: ["ST", "W"],
    roles: ["Rotación", "Titular"],
    opciones: [
      {
        id: "motivarse_competencia",
        texto: "Tomarlo como motivación extra",
        narrativo: "La competencia te despierta. Llegas a los entrenamientos más temprano y con más hambre.",
        efectos: { forma: 10, moral: 5, confianza_entrenador: 5 },
      },
      {
        id: "pedir_garantias",
        texto: "Pedir al entrenador garantías de minutos",
        narrativo: "El entrenador no te garantiza nada pero valora la franqueza.",
        efectos: { moral: 3, confianza_entrenador: -5 },
      },
    ],
  },
  {
    id: "w_velocidad_scouts",
    tipo: "PRENSA",
    titulo: "Los scouts miden tu velocidad en el calentamiento",
    descripcion: "Un scout de un equipo grande te dijo que has sido el extremo más rápido que ha visto esta temporada. El dato llega a la prensa.",
    posiciones: ["W"],
    requiereStats: { velocidad: 76 },
    opciones: [
      {
        id: "explotar_velocidad",
        texto: "Trabajar más la llegada y el 1vs1",
        narrativo: "Tu velocidad ya era arma; ahora combinada con el último pase se convierte en pesadilla para los rivales.",
        efectos: { forma: 10, reputacion: 12, attributePoints: 1 },
      },
      {
        id: "equilibrar_juego",
        texto: "No depender solo de la velocidad, mejorar el juego combinativo",
        narrativo: "El entrenador aprecia la visión de largo plazo. Tu juego gana en complejidad.",
        efectos: { forma: 5, reputacion: 8, confianza_entrenador: 8 },
      },
    ],
  },
  {
    id: "st_posicionamiento_cuestionado",
    tipo: "ENTRENAMIENTO",
    titulo: "El analista señala tu posicionamiento",
    descripcion: "El analista de vídeo muestra clips donde tu posición en el área en fase de finalización no es la óptima.",
    posiciones: ["ST", "W"],
    opciones: [
      {
        id: "aceptar_analisis",
        texto: "Aceptar el análisis y trabajar el posicionamiento",
        narrativo: "Dedicas una semana a sesiones específicas de movimiento en el área. Los números mejoran.",
        efectos: { forma: 8, confianza_entrenador: 10, attributePoints: 1 },
      },
      {
        id: "defender_instinto",
        texto: "Defender que el instinto vale más que los datos",
        narrativo: "El debate es rico pero el analista no cede. El entrenador te pide que confíes en el proceso.",
        efectos: { confianza_entrenador: -5, moral: 2 },
      },
    ],
  },
]

// ─── POSICIÓN: MEDIOCENTRO / MEDIAPUNTA (CM, AM) ──────────────────────────────

const EVENTOS_CENTROCAMPISTA: CareerEvent[] = [
  {
    id: "cm_vision_destacada",
    tipo: "PRENSA",
    titulo: "Los analistas elogian tu visión de juego",
    descripcion: "Un programa de análisis táctico te ha dedicado un informe completo. Dicen que eres el mejor distribuidor de la categoría.",
    posiciones: ["CM", "AM"],
    requiereStats: { vision: 70 },
    opciones: [
      {
        id: "seguir_mismo_camino",
        texto: "Agradecer y seguir con tu trabajo",
        narrativo: "El reconocimiento te da confianza. Tu juego alcanza un nuevo nivel de consistencia.",
        efectos: { moral: 12, forma: 8, reputacion: 10 },
      },
      {
        id: "añadir_goles",
        texto: "Aprovechar para trabajar también la llegada",
        narrativo: "Tu juego evoluciona: ya no solo creas, también llegas. El entrenador empieza a darte más libertad.",
        efectos: { forma: 10, reputacion: 8, confianza_entrenador: 8, attributePoints: 1 },
      },
    ],
  },
  {
    id: "cm_perdida_clave",
    tipo: "EQUIPO",
    titulo: "Una pérdida de balón cuesta un gol",
    descripcion: "Tu pérdida en zona de creación derivó directamente en el gol del empate rival. El vestuario está en silencio.",
    posiciones: ["CM", "AM"],
    opciones: [
      {
        id: "autocritica_vestuario",
        texto: "Asumir el error ante el vestuario",
        narrativo: "La autocrítica en caliente gana respeto. El capitán te da una palmada en la espalda.",
        efectos: { moral: -5, confianza_vestuario: 10, confianza_entrenador: 8 },
      },
      {
        id: "trabajo_extra_balon",
        texto: "Quedarte a trabajar la protección del balón",
        narrativo: "Media hora de trabajo específico después de todos. El asistente lo anota.",
        efectos: { moral: -3, forma: 5, confianza_entrenador: 10, fatiga: 5 },
      },
      {
        id: "olvidar_perder",
        texto: "Pasar página rápido, los errores son parte del juego",
        narrativo: "Psicología de élite. Aunque el vestuario esperaba más autocrítica.",
        efectos: { moral: 2, confianza_vestuario: -5 },
      },
    ],
  },
  {
    id: "am_libertad_creativa",
    tipo: "EQUIPO",
    titulo: "El entrenador te da libertad total en ataque",
    descripcion: "El mister ha decidido darte carta blanca para movert te entre líneas. Depende de ti usarla bien.",
    posiciones: ["AM", "CM"],
    roles: ["Titular", "Estrella"],
    opciones: [
      {
        id: "explotar_libertad",
        texto: "Asumir el rol con total confianza",
        narrativo: "Tus movimientos desestabilizan a los rivales. El entrenador está encantado con el resultado.",
        efectos: { moral: 15, forma: 10, confianza_entrenador: 10, reputacion: 8 },
      },
      {
        id: "libertad_moderada",
        texto: "Usar la libertad con responsabilidad táctica",
        narrativo: "Tu equilibrio entre creatividad y responsabilidad es el ideal. El equipo te lo agradece.",
        efectos: { moral: 10, forma: 8, confianza_vestuario: 8 },
      },
    ],
  },
  {
    id: "cm_rol_defensivo",
    tipo: "EQUIPO",
    titulo: "El entrenador te pide que bajes más a defender",
    descripcion: "El preparador detecta que el equipo sufre en transiciones. Quiere que hagas un trabajo defensivo extra.",
    posiciones: ["CM", "AM"],
    roles: ["Reserva", "Rotación"],
    opciones: [
      {
        id: "aceptar_rol_defensivo",
        texto: "Aceptar el rol defensivo sin rechistar",
        narrativo: "Tu adaptabilidad táctica convence al entrenador. Los resultados del equipo mejoran.",
        efectos: { confianza_entrenador: 12, moral: 3, forma: 5 },
      },
      {
        id: "negociar_equilibrio",
        texto: "Proponer un equilibrio: defender pero tener libertad en ataque",
        narrativo: "El mister escucha y encontráis un punto medio que funciona.",
        efectos: { confianza_entrenador: 8, moral: 8 },
      },
      {
        id: "rechazar_rol_defensivo",
        texto: "Explicar que eso no es tu rol natural",
        narrativo: "El entrenador no lo toma bien. Tu posición en el equipo se complica.",
        efectos: { confianza_entrenador: -12, moral: 2 },
      },
    ],
  },
  {
    id: "am_asistidor_referencia",
    tipo: "PRENSA",
    titulo: "Eres el máximo asistidor de la categoría",
    descripcion: "Las estadísticas te ponen como el jugador con más asistencias de toda la división. El entrenador lo celebra en rueda de prensa.",
    posiciones: ["AM", "CM"],
    requiereStats: { pase: 70 },
    opciones: [
      {
        id: "reconocer_delanteros",
        texto: "\"Los mérito es de los que las meten\"",
        narrativo: "Los delanteros del equipo te lo agradecen en privado. El vestuario sube entero.",
        efectos: { moral: 12, confianza_vestuario: 15, reputacion: 8 },
      },
      {
        id: "reivindicar_asistencias",
        texto: "Destacar que crear es tan importante como marcar",
        narrativo: "El debate futbolístico que generas te pone en el mapa mediático.",
        efectos: { reputacion: 15, moral: 8, confianza_vestuario: 3 },
      },
    ],
  },
]

// ─── POSICIÓN: DEFENSA CENTRAL / LATERAL (CB, FB) ────────────────────────────

const EVENTOS_DEFENSA: CareerEvent[] = [
  {
    id: "cb_lider_linea",
    tipo: "EQUIPO",
    titulo: "El entrenador te pide que dirijas la línea defensiva",
    descripcion: "El mister quiere que seas la voz de la defensa: hablar, corregir posiciones y liderar en campo. Es una gran responsabilidad.",
    posiciones: ["CB", "FB"],
    requiereStats: { liderazgo: 65 },
    opciones: [
      {
        id: "asumir_liderazgo_defensa",
        texto: "Asumir el reto con todo",
        narrativo: "Tus indicaciones en campo dan seguridad a toda la línea. El entrenador ve en ti un futuro capitán.",
        efectos: { confianza_entrenador: 12, confianza_vestuario: 8, reputacion: 8, addTrait: "lider" },
      },
      {
        id: "liderazgo_moderado",
        texto: "Hacerlo pero sin imposiciones, más con el ejemplo",
        narrativo: "Tu liderazgo silencioso funciona a medias. La defensa mejora pero podría ser más compacta.",
        efectos: { confianza_entrenador: 8, confianza_vestuario: 5 },
      },
    ],
  },
  {
    id: "cb_error_grave",
    tipo: "EQUIPO",
    titulo: "Tu error lleva directamente a un gol en contra",
    descripcion: "Un mal control en la salida de balón derivó en un gol rival. El estadio lo vio. Tú lo viviste. ¿Cómo gestionas lo que sigue?",
    posiciones: ["CB", "FB"],
    opciones: [
      {
        id: "responsabilizarse",
        texto: "Asumir el error ante el equipo y el mister",
        narrativo: "El capitán y el entrenador destacan tu actitud. El error duele menos cuando hay honestidad.",
        efectos: { moral: -5, confianza_vestuario: 10, confianza_entrenador: 8 },
      },
      {
        id: "trabajo_extra_balon",
        texto: "Trabajar extra en la salida de balón hasta dominarlo",
        narrativo: "Dos semanas de trabajo específico con el balón. El error no se repetirá.",
        efectos: { moral: -3, forma: 8, confianza_entrenador: 10, fatiga: 8, attributePoints: 1 },
      },
      {
        id: "olvidar_cb",
        texto: "Borrarlo de la mente y seguir",
        narrativo: "La resiliencia es parte del oficio. Aunque el vestuario esperaba más autocrítica.",
        efectos: { moral: 5, confianza_vestuario: -5 },
      },
    ],
  },
  {
    id: "fb_subidas_reconocidas",
    tipo: "PRENSA",
    titulo: "Tus incorporaciones al ataque se vuelven un arma",
    descripcion: "El preparador ha destacado en reunión que tus subidas al ataque son uno de los mejores datos del equipo. La prensa empieza a seguirte.",
    posiciones: ["FB"],
    requiereStats: { velocidad: 72 },
    opciones: [
      {
        id: "potenciar_subidas",
        texto: "Pedir más libertad para subir aún más",
        narrativo: "El entrenador te da más autonomía. Tus incorporaciones se convierten en el arma táctica del equipo.",
        efectos: { forma: 10, reputacion: 12, confianza_entrenador: 8 },
      },
      {
        id: "equilibrar_ataque_defensa",
        texto: "Mantener el equilibrio ataque-defensa, no arriesgar más",
        narrativo: "Tu solidez defensiva no se resiente. El equipo se beneficia de tu versión completa.",
        efectos: { forma: 8, confianza_entrenador: 10, confianza_vestuario: 5 },
      },
    ],
  },
  {
    id: "cb_duelo_referencia",
    tipo: "PRENSA",
    titulo: "Imbatido en duelos individuales",
    descripcion: "Las estadísticas revelan que llevas 18 duelos individuales ganados consecutivos. Eres el defensa más sólido de la categoría.",
    posiciones: ["CB"],
    requiereStats: { entradas: 70 },
    opciones: [
      {
        id: "celebrar_duelos",
        texto: "Aprovechar el reconocimiento para trabajar más el juego aéreo",
        narrativo: "A tu solidez en el suelo sumas ahora dominio aéreo. Te conviertes en un central completo.",
        efectos: { moral: 10, reputacion: 12, forma: 8, attributePoints: 1 },
      },
      {
        id: "no_confiarse_duelos",
        texto: "Recordarte que un error puede arruinar la racha",
        narrativo: "Tu nivel de concentración no baja. Seguirás siendo el más fiable partido tras partido.",
        efectos: { moral: 8, forma: 10, confianza_entrenador: 5 },
      },
    ],
  },
  {
    id: "fb_corners_cabeceo",
    tipo: "ENTRENAMIENTO",
    titulo: "El preparador propone que subas a los córners",
    descripcion: "El entrenador ha visto tus datos de cabeceo y quiere que vayas al área rival en las jugadas a balón parado.",
    posiciones: ["FB"],
    requiereStats: { cabeceo: 66 },
    opciones: [
      {
        id: "asumir_corner",
        texto: "Asumir el rol con entusiasmo",
        narrativo: "Tu presencia en el área crea confusión en la defensa rival y genera ocasiones.",
        efectos: { forma: 5, confianza_entrenador: 10, moral: 8 },
      },
      {
        id: "rechazar_corner",
        texto: "Preferir quedarte atrás para no descuidar la defensa",
        narrativo: "Tu precaución es válida. El entrenador la respeta aunque le hubiera gustado más audacia.",
        efectos: { confianza_entrenador: -3, moral: 2 },
      },
    ],
  },
]

// ─── POSICIÓN: PORTERO (GK) ───────────────────────────────────────────────────

const EVENTOS_PORTERO: CareerEvent[] = [
  {
    id: "gk_serie_imbatido",
    tipo: "PRENSA",
    titulo: "Cinco partidos sin encajar. La prensa habla de ti.",
    descripcion: "Llevas cinco jornadas sin recibir un gol. El entrenador dice en rueda de prensa que eres el mejor portero que ha dirigido.",
    posiciones: ["GK"],
    requiereStats: { reflejos: 70 },
    opciones: [
      {
        id: "foco_siguiente",
        texto: "\"Foco en el siguiente partido, la racha no importa\"",
        narrativo: "Tu mentalidad de portero nato impresiona. La defensa se contagia de tu seguridad.",
        efectos: { moral: 15, reputacion: 12, forma: 8, confianza_vestuario: 8 },
      },
      {
        id: "goal_reconocer_equipo",
        texto: "\"Es mérito de toda la defensa, yo solo soy el último\"",
        narrativo: "Los defensas te lo agradecen. El vestuario te ve como un verdadero compañero.",
        efectos: { moral: 12, reputacion: 8, confianza_vestuario: 15 },
      },
    ],
  },
  {
    id: "gk_penalti_tapadazo",
    tipo: "PRENSA",
    titulo: "El penalti parado que cambió el partido",
    descripcion: "Tu parada del penalti en el minuto 75 cuando el marcador estaba igualado cambió el partido. Los focos están sobre ti.",
    posiciones: ["GK"],
    opciones: [
      {
        id: "analizar_penalti",
        texto: "Explicar el proceso: \"Estudié al lanzador durante toda la semana\"",
        narrativo: "La preparación tiene premio. El equipo de analistas te pone como ejemplo de profesionalidad.",
        efectos: { moral: 18, reputacion: 15, confianza_entrenador: 10, forma: 5 },
      },
      {
        id: "instinto_penalti",
        texto: "\"Fue instinto puro, en esos momentos el cuerpo decide solo\"",
        narrativo: "La respuesta apasionada conecta con los aficionados. Tu nombre llena los periódicos.",
        efectos: { moral: 15, reputacion: 18, confianza_vestuario: 8 },
      },
    ],
  },
  {
    id: "gk_error_grave",
    tipo: "LESION",
    titulo: "El error del portero que todos vieron",
    descripcion: "Un balón que debías haber atajado se te escapó y acabó en gol. El estadio en silencio. Tus compañeros te miran.",
    posiciones: ["GK"],
    opciones: [
      {
        id: "cabeza_alta_gk",
        texto: "Levantar la cabeza y seguir jugando",
        narrativo: "Tu capacidad de reacción mental impresiona. En el siguiente balón haces una parada increíble.",
        efectos: { moral: -5, forma: 8, confianza_entrenador: 10, confianza_vestuario: 8 },
      },
      {
        id: "hundirse_gk",
        texto: "El error te afecta el resto del partido",
        narrativo: "El fantasma del error te pesa. El equipo lo nota y la segunda parte es sufrida.",
        efectos: { moral: -12, forma: -8, confianza_entrenador: -5 },
      },
      {
        id: "hablar_con_psicologo",
        texto: "Pedir sesión urgente con el psicólogo después del partido",
        narrativo: "La proactividad mental es un activo de élite. Vuelves más preparado para situaciones de presión.",
        efectos: { moral: -3, forma: 5, attributePoints: 1 },
      },
    ],
  },
  {
    id: "gk_distribucion_elogiada",
    tipo: "ENTRENAMIENTO",
    titulo: "El entrenador quiere que inicies el juego desde atrás",
    descripcion: "El mister propone un sistema de salida de balón desde el portero. Necesita que seas el primer pase del equipo.",
    posiciones: ["GK"],
    opciones: [
      {
        id: "aceptar_distribucion",
        texto: "Aceptar y trabajar la distribución con pies",
        narrativo: "Semanas de trabajo específico. Cuando llega el día, el equipo fluye desde atrás de forma natural.",
        efectos: { forma: 8, confianza_entrenador: 12, attributePoints: 1 },
      },
      {
        id: "distribucion_conservadora",
        texto: "Hacerlo pero con pases seguros, sin arriesgar",
        narrativo: "El sistema funciona a medias. Sin riesgo pero sin la fluidez que el entrenador buscaba.",
        efectos: { confianza_entrenador: 5, moral: 3 },
        requiereStat: { stat: "pase", minValue: 60 },
      },
    ],
  },
  {
    id: "gk_suplente_llega",
    tipo: "TRANSFERENCIA",
    titulo: "El club ficha a un portero con mucho nombre",
    descripcion: "La directiva anuncia el fichaje de un portero que fue internacional. Dicen que viene como suplente, pero nadie se lo cree del todo.",
    posiciones: ["GK"],
    opciones: [
      {
        id: "trabajar_mas_presion",
        texto: "Entrenar más duro que nunca para que no haya dudas",
        narrativo: "Tu reacción a la presión es la correcta. El entrenador confirma que sigues siendo el número uno.",
        efectos: { forma: 12, moral: 5, confianza_entrenador: 10, fatiga: 10 },
      },
      {
        id: "hablar_claro_gk",
        texto: "Hablar directamente con el entrenador sobre tu posición",
        narrativo: "El mister te tranquiliza: eres el titular. La conversación te da paz mental.",
        efectos: { moral: 10, confianza_entrenador: 8 },
      },
    ],
  },
]

// ─── EVENTOS DE ARCO (esArco: true) ──────────────────────────────────────────

const EVENTOS_ARCO: CareerEvent[] = [
  // Arco: Polémica viral prensa
  {
    id: "prensa_arc_resuelta",
    esArco: true,
    tipo: "PRENSA",
    titulo: "La polémica se cierra: el club te respalda públicamente",
    descripcion: "El club emite un comunicado de apoyo y los medios cierran el tema. Pero el entrenador quiere hablar contigo en privado.",
    opciones: [
      {
        id: "entrevista_reparadora",
        texto: "Dar una entrevista reparadora con total transparencia",
        narrativo: "La crisis se convierte en historia de madurez. Tu imagen sale reforzada.",
        efectos: { moral: 12, reputacion: 15, confianza_entrenador: 10 },
      },
      {
        id: "pasar_pagina",
        texto: "Pasar página sin más explicaciones",
        narrativo: "El tema muere. Sigues adelante con el foco en el campo.",
        efectos: { moral: 5, reputacion: 5, confianza_entrenador: 5 },
      },
    ],
  },
  {
    id: "prensa_arc_escalada",
    esArco: true,
    tipo: "PRENSA",
    titulo: "La polémica explota: ahora te piden disculpas formales",
    descripcion: "Tu respuesta inicial empeoró las cosas. El club recibe presión de patrocinadores. Hay que actuar ya.",
    opciones: [
      {
        id: "disculpa_publica_tv",
        texto: "Salir en televisión a disculparte formalmente",
        narrativo: "La disculpa en directo es incómoda pero efectiva. La mayoría te perdona.",
        efectos: { moral: -5, reputacion: 5, confianza_entrenador: 8, fatiga: 8 },
      },
      {
        id: "silencio_total",
        texto: "Silencio total y esperar que pase la tormenta",
        narrativo: "La tormenta dura tres semanas más. El club pierde un patrocinador. Las relaciones se tensan.",
        efectos: { moral: -10, reputacion: -15, confianza_entrenador: -12 },
      },
    ],
  },

  // Arco: Lesión recurrente
  {
    id: "lesion_arc_recuperacion_completa",
    esArco: true,
    tipo: "LESION",
    titulo: "Alta médica: la lesión está cerrada definitivamente",
    descripcion: "El médico confirma que el tratamiento fue un éxito. Vuelves con el aval del staff y la garantía de que el problema está resuelto.",
    opciones: [
      {
        id: "vuelta_gradual",
        texto: "Volver de forma gradual sin forzar",
        narrativo: "Cinco días de trabajo progresivo. Cuando regresas al ritmo completo estás mejor que antes de la lesión.",
        efectos: { forma: 15, riesgoLesion: -20, moral: 15, confianza_entrenador: 5 },
      },
      {
        id: "vuelta_a_tope",
        texto: "Volver directamente a máxima intensidad",
        narrativo: "El cuerpo responde bien pero el médico te mira con desconfianza. La forma vuelve rápido.",
        efectos: { forma: 10, riesgoLesion: 5, moral: 10 },
      },
    ],
  },
  {
    id: "lesion_arc_agravamiento",
    esArco: true,
    tipo: "LESION",
    titulo: "La lesión se agrava. El médico era claro.",
    descripcion: "Lo que era una molestia se convierte en una rotura parcial. El médico dice que ahora el tratamiento será más largo.",
    opciones: [
      {
        id: "aceptar_tiempo_fuera",
        texto: "Aceptar el tiempo que necesites y hacerlo bien",
        narrativo: "Seis semanas fuera. Pero cuando vuelves, vuelves entero. Y más sabio.",
        efectos: { fatiga: -40, riesgoLesion: -20, forma: -15, moral: -10 },
      },
      {
        id: "segunda_opinion",
        texto: "Pedir una segunda opinión médica",
        narrativo: "El segundo médico coincide con el diagnóstico pero te da un plan alternativo ligeramente más rápido.",
        efectos: { riesgoLesion: -10, forma: -10, moral: -5, fatiga: -20 },
      },
    ],
  },

  // Arco: Nuevo compañero en tu posición
  {
    id: "equipo_arc_companero_aliado",
    esArco: true,
    tipo: "EQUIPO",
    titulo: "El nuevo fichaje te ayuda a mejorar",
    descripcion: "El jugador que llegó para competir contigo resulta ser alguien generoso. En los entrenamientos os exigís el uno al otro y los dos mejoráis.",
    opciones: [
      {
        id: "competencia_sana",
        texto: "Formalizar una competencia sana y profesional",
        narrativo: "Los dos rendís mejor. El entrenador dice públicamente que es la mejor competencia interna que ha tenido.",
        efectos: { forma: 12, moral: 12, confianza_vestuario: 12, reputacion: 8 },
      },
      {
        id: "aprendizaje_mutuo",
        texto: "Proponer sesiones de trabajo conjunto",
        narrativo: "El intercambio de conocimientos es puro oro. Os hacéis mejores jugadores y mejores compañeros.",
        efectos: { forma: 15, moral: 10, confianza_vestuario: 10, attributePoints: 1 },
      },
    ],
  },
  {
    id: "equipo_arc_companero_rival",
    esArco: true,
    tipo: "EQUIPO",
    titulo: "La tensión con el nuevo fichaje escala",
    descripcion: "La frialdad inicial se convirtió en rivalidad abierta. El vestuario se ha posicionado. El entrenador llama a ambos.",
    opciones: [
      {
        id: "dar_brazo_torcer",
        texto: "Dar el primer paso y ofrecerle la mano",
        narrativo: "El gesto de madurez rompe el hielo. El entrenador os reúne y la situación se desactiva.",
        efectos: { moral: 5, confianza_vestuario: 12, confianza_entrenador: 10 },
      },
      {
        id: "dejar_decidir_mister",
        texto: "Dejar que el entrenador decida quien juega más",
        narrativo: "El terreno de juego dirá. Mientras tanto, la tensión se gestiona pero no se resuelve.",
        efectos: { moral: 2, confianza_entrenador: 5, confianza_vestuario: -3 },
      },
    ],
  },

  // Arco: Evaluación del mister (rol nuevo)
  {
    id: "entrenamiento_arc_nuevo_rol_exito",
    esArco: true,
    tipo: "ENTRENAMIENTO",
    titulo: "El cambio de rol te sienta de maravilla",
    descripcion: "Tres semanas después del experimento, los datos son claros: en la nueva posición/rol eres más influyente. El entrenador te llama.",
    opciones: [
      {
        id: "abrazar_nuevo_rol",
        texto: "Abrazar el cambio definitivamente",
        narrativo: "El nuevo rol se convierte en tu identidad. El equipo mejora y tú eres la razón.",
        efectos: { forma: 15, moral: 15, confianza_entrenador: 15, reputacion: 10, attributePoints: 2 },
      },
      {
        id: "hibrido",
        texto: "Proponer un rol híbrido que combine lo mejor de ambos",
        narrativo: "El entrenador acepta la propuesta con entusiasmo. Tu polivalencia se convierte en un lujo.",
        efectos: { forma: 10, moral: 12, confianza_entrenador: 10, reputacion: 8 },
      },
    ],
  },
  {
    id: "entrenamiento_arc_tension_mister",
    esArco: true,
    tipo: "ENTRENAMIENTO",
    titulo: "La tensión con el entrenador no se resuelve sola",
    descripcion: "Desde que rechazaste el cambio de rol, el entrenador apenas te habla. Las convocatorias empiezan a dejarte en el banquillo.",
    opciones: [
      {
        id: "pedir_reunion",
        texto: "Pedir una reunión para aclarar la situación",
        narrativo: "La conversación es incómoda pero necesaria. Llegáis a un acuerdo mínimo para convivir.",
        efectos: { confianza_entrenador: 8, moral: 5 },
      },
      {
        id: "aceptar_variacion_tarde",
        texto: "Reconsiderar y probar el cambio que propuso",
        narrativo: "Llega tarde pero llega. El entrenador aprecia que hayas cambiado de postura.",
        efectos: { confianza_entrenador: 12, moral: 8, forma: 5 },
      },
    ],
  },

  // Arco: Sequía goles (ST)
  {
    id: "st_arc_sequia_rota",
    esArco: true,
    tipo: "PRENSA",
    titulo: "¡Fin de la sequía! El gol del alivio",
    descripcion: "Ha llegado. Después de semanas sin marcar, el balón entra. El estadio explota y tú con él.",
    posiciones: ["ST", "W"],
    opciones: [
      {
        id: "dedicar_compañeros",
        texto: "Dedicar el gol al equipo que no te soltó",
        narrativo: "La dedicatoria emociona al vestuario. El gol es tuyo pero la victoria es de todos.",
        efectos: { moral: 25, confianza_vestuario: 15, forma: 10, reputacion: 10 },
      },
      {
        id: "dedicar_familia",
        texto: "Dedicárselo a tu familia con el gesto que ellos reconocen",
        narrativo: "El momento íntimo se vuelve viral. Las redes sociales se rinden a la escena.",
        efectos: { moral: 22, reputacion: 15, forma: 8 },
      },
    ],
  },
  {
    id: "st_arc_sequia_ayuda_tactica",
    esArco: true,
    tipo: "EQUIPO",
    titulo: "El cambio táctico empieza a funcionar",
    descripcion: "El equipo ha ajustado la manera de alimentarte. Las ocasiones llegan y uno de estos días el gol cae.",
    posiciones: ["ST", "W"],
    opciones: [
      {
        id: "aprovechar_ajuste",
        texto: "Aprovechar cada ocasión sin presión extra",
        narrativo: "El gol llega en el momento menos esperado. Tu cabeza estaba limpia y el cuerpo respondió.",
        efectos: { moral: 18, forma: 12, confianza_entrenador: 10, confianza_vestuario: 8 },
      },
      {
        id: "trabajar_llegadas",
        texto: "Trabajar específicamente las llegadas al área",
        narrativo: "La mecánica del movimiento mejora. Cuando el gol llega, fue trabajado y merecido.",
        efectos: { moral: 15, forma: 15, attributePoints: 1 },
      },
    ],
  },
]

// ─── Eventos Selección Nacional ───────────────────────────────────────────────

const EVENTOS_SELECCION: CareerEvent[] = [
  {
    id: "seleccion_primera_convocatoria",
    tipo: "PERSONAL",
    titulo: "La llamada que siempre soñaste",
    descripcion: "El seleccionador nacional te llama por primera vez. Es el mayor honor de tu carrera hasta ahora. El vestuario del club te felicita con una ovación espontánea.",
    minReputacion: 30,
    opciones: [
      {
        id: "aceptar_emocionado",
        texto: "Aceptar con todo el orgullo del mundo",
        narrativo: "Entras al vestuario de la selección con los ojos abiertos como platos. Estrechar la mano del capitán es un momento que recordarás toda la vida.",
        efectos: { moral: 20, reputacion: 10, confianza_vestuario: 8 },
      },
      {
        id: "mantener_calma_profesional",
        texto: "Responder con calma y profesionalidad",
        narrativo: "El seleccionador aprecia tu madurez. Eres nuevo pero ya proyectas una imagen de veterano. Los compañeros te dan la bienvenida sin fanfarria.",
        efectos: { moral: 12, reputacion: 8, confianza_entrenador: 10 },
      },
    ],
  },
  {
    id: "seleccion_titular_debate",
    tipo: "PRENSA",
    titulo: "¿Mereces ser titular con la selección?",
    descripcion: "Un conocido periodista cuestiona públicamente tu presencia en la selección. Asegura que hay jugadores más merecedores y que tu convocatoria es política.",
    minReputacion: 35,
    opciones: [
      {
        id: "ignorar_critica",
        texto: "Dejar que el campo hable por ti",
        narrativo: "No dices nada. Entrenas al máximo nivel y en el primer partido demuestras por qué estás aquí.",
        efectos: { moral: 5, forma: 5 },
      },
      {
        id: "responder_con_clase",
        texto: "Responder con clase en redes sociales",
        narrativo: "Un post comedido pero directo. La afición te apoya masivamente. El seleccionador te llama para decirte que está de tu lado.",
        efectos: { moral: 10, reputacion: 5, confianza_entrenador: 5 },
      },
      {
        id: "confrontar_periodista",
        texto: "Confrontar públicamente al periodista",
        narrativo: "Ganas el duelo dialéctico pero el ruido mediático te cansa durante semanas. Hay quienes dicen que no tienes temple internacional.",
        efectos: { moral: 3, reputacion: -5 },
      },
    ],
  },
  {
    id: "seleccion_capitan_debate",
    tipo: "EQUIPO",
    titulo: "El seleccionador te propone el brazalete",
    descripcion: "El míster te convoca aparte y te dice que estás en su cabeza como próximo capitán de la selección. No es oficial, pero quiere saber tu disposición.",
    minReputacion: 55,
    roles: ["Titular", "Estrella"],
    opciones: [
      {
        id: "aceptar_liderazgo",
        texto: "Aceptar el reto con ilusión",
        narrativo: "La responsabilidad pesa, pero creces con ella. Los compañeros ya te ven como líder antes de que se haga oficial.",
        efectos: { moral: 15, reputacion: 12, confianza_vestuario: 15, attributePoints: 1, addTrait: "lider_seleccion" },
      },
      {
        id: "declinar_por_ahora",
        texto: "Pedir más tiempo para madurar",
        narrativo: "El seleccionador lo comprende. La humildad que demuestras le convence aún más de que eres la persona correcta.",
        efectos: { moral: 8, confianza_entrenador: 12 },
      },
    ],
  },
  {
    id: "seleccion_gol_historico",
    tipo: "PERSONAL",
    titulo: "El gol que marca un antes y un después",
    descripcion: "Has marcado en un partido importante con la selección. El estadio enlouquece. Las redes sociales se llenan de tu nombre.",
    minReputacion: 40,
    minJornada: 5,
    opciones: [
      {
        id: "dedicar_familia",
        texto: "Dedicar el gol a tu familia",
        narrativo: "La imagen de tu celebración vuelta hacia las cámaras con el dedo al cielo se convierte en icónica. Tu familia llora de emoción en casa.",
        efectos: { moral: 20, reputacion: 8, forma: 10 },
      },
      {
        id: "dedicar_aficion",
        texto: "Celebrar con toda la afición",
        narrativo: "Corres hacia la grada y te fundes con el calor de miles de personas que llevan años esperando un momento así.",
        efectos: { moral: 18, reputacion: 12, confianza_vestuario: 5 },
      },
    ],
  },
  {
    id: "seleccion_roces_companero",
    tipo: "EQUIPO",
    titulo: "Tensión en el vestuario de la selección",
    descripcion: "Hay roces entre tú y otro convocado, una estrella de otro club. La competencia por el puesto es feroz y las palabras se calientan en el entrenamiento.",
    minReputacion: 40,
    opciones: [
      {
        id: "hablar_directo",
        texto: "Hablarlo en privado como profesionales",
        narrativo: "La conversación es tensa pero honesta. Llegáis a un punto de respeto mutuo. En el partido siguiente os complementáis perfectamente.",
        efectos: { moral: 8, confianza_vestuario: 12, forma: 5 },
      },
      {
        id: "ignorar_tension",
        texto: "Ignorarlo y centrarte en lo tuyo",
        narrativo: "La tensión persiste toda la concentración pero no afecta al rendimiento. El seleccionador lo nota y habla con ambos.",
        efectos: { moral: 3, confianza_vestuario: -5 },
      },
      {
        id: "hablar_con_seleccionador",
        texto: "Comunicárselo al seleccionador",
        narrativo: "El míster agradece tu transparencia. El otro jugador se enfría un poco contigo, pero la dinámica del equipo mejora.",
        efectos: { moral: 5, confianza_entrenador: 10, confianza_vestuario: -8 },
      },
    ],
  },
]

// ─── Eventos Contrato y Veterano ──────────────────────────────────────────────

const EVENTOS_CONTRATO: CareerEvent[] = [
  {
    id: "contrato_oferta_mejora",
    tipo: "TRANSFERENCIA",
    titulo: "El club quiere blindarte",
    descripcion: "El director deportivo del club te convoca a una reunión. Tienen una propuesta de renovación con mejoras sustanciales. Confían en ti para el proyecto.",
    opciones: [
      {
        id: "firmar_inmediatamente",
        texto: "Firmar sin dudar, este es tu hogar",
        narrativo: "La firma se convierte en noticia positiva. El club te presenta como pieza clave del proyecto. Tu vínculo con la afición se fortalece.",
        efectos: { moral: 12, confianza_entrenador: 10, confianza_vestuario: 8, reputacion: 5 },
      },
      {
        id: "negociar_primero",
        texto: "Negociar para obtener mejores condiciones",
        narrativo: "Las conversaciones se alargan. Al final consigues mejoras adicionales, pero el club ya no te mira igual de fiel.",
        efectos: { moral: 8, confianza_entrenador: -5, reputacion: 3 },
      },
    ],
  },
  {
    id: "veterano_consejos",
    tipo: "EQUIPO",
    titulo: "Los jóvenes buscan tu consejo",
    descripcion: "Un joven talento del equipo de reservas lleva semanas observándote en los entrenamientos. Hoy se acerca tímidamente para pedirte consejo.",
    roles: ["Titular", "Estrella"],
    minJornada: 4,
    opciones: [
      {
        id: "dedicarle_tiempo",
        texto: "Dedicarle todo el tiempo que necesita",
        narrativo: "Pasas una tarde entera trabajando con él. El entrenador lo ve y tu figura de líder se consolida. El joven brilla en el siguiente partido.",
        efectos: { moral: 10, confianza_vestuario: 15, reputacion: 5, addTrait: "mentor" },
      },
      {
        id: "consejo_rapido",
        texto: "Darle un consejo rápido entre entrenamiento",
        narrativo: "Pocas palabras pero cargadas de sabiduría. El chico las aplica y funcionan. Te lo agradece con la mirada.",
        efectos: { moral: 6, confianza_vestuario: 8 },
      },
      {
        id: "derivar_al_cuerpo_tecnico",
        texto: "Decirle que hable con el cuerpo técnico",
        narrativo: "Respuesta lógica pero el joven se lleva cierta decepción. Eres un profesional, no un mentor. El vestuario lo nota.",
        efectos: { moral: 2, confianza_vestuario: -3 },
      },
    ],
  },
  {
    id: "veterano_fatiga_acumulada",
    tipo: "ENTRENAMIENTO",
    titulo: "El cuerpo ya no es el de antes",
    descripcion: "El médico del club te llama aparte. Los análisis muestran signos claros de fatiga acumulada. Te recomienda reducir carga de entrenamiento las próximas semanas.",
    opciones: [
      {
        id: "aceptar_descanso",
        texto: "Seguir el protocolo médico al pie de la letra",
        narrativo: "Costoso de aceptar, pero sabio. Tres semanas después estás al cien por cien y tu cuerpo te lo agradece.",
        efectos: { fatiga: -30, riesgoLesion: -15, moral: 5, forma: 10 },
      },
      {
        id: "ignorar_y_entrenar",
        texto: "Ignorar la advertencia y seguir a tope",
        narrativo: "Tu competitividad te puede. Rindes bien en el siguiente partido, pero el riesgo de lesión se dispara.",
        efectos: { fatiga: 10, riesgoLesion: 25, forma: 5, moral: -5 },
      },
    ],
  },
  {
    id: "legado_homenaje",
    tipo: "PERSONAL",
    titulo: "El club te hace un homenaje",
    descripcion: "Después de años de servicio, el club organiza un acto en tu honor antes de un partido de liga. La afición te ovaciona durante varios minutos en el estadio.",
    roles: ["Estrella"],
    minReputacion: 65,
    minJornada: 8,
    opciones: [
      {
        id: "discurso_emocionado",
        texto: "Dar un discurso emotivo desde el corazón",
        narrativo: "Las palabras fluyen solas. Hay lágrimas en las gradas y en el banquillo. Es el tipo de momento que define una carrera.",
        efectos: { moral: 20, reputacion: 15, confianza_vestuario: 20, attributePoints: 2 },
      },
      {
        id: "discurso_humilde",
        texto: "Agradecer brevemente y dejar hablar al fútbol",
        narrativo: "Breve, elegante, auténtico. La afición lo aprecia. Un jugador de pocos gestos pero muchos hechos.",
        efectos: { moral: 15, reputacion: 10, confianza_vestuario: 15 },
      },
    ],
  },
  {
    id: "record_historico",
    tipo: "PRENSA",
    titulo: "Un paso más hacia la historia",
    descripcion: "Los estadísticos del club te informan: si marcas en el próximo partido, serás el máximo goleador histórico de la entidad. La prensa habla de ello cada día.",
    roles: ["Titular", "Estrella"],
    minReputacion: 60,
    posiciones: ["ST", "W", "AM"],
    opciones: [
      {
        id: "disfrutar_presion",
        texto: "Abrazar la presión como motivación extra",
        narrativo: "La presión te eleva. En el calentamiento ya notas que estás en un día especial. Las cámaras te buscan constantemente.",
        efectos: { moral: 15, forma: 15, reputacion: 10 },
      },
      {
        id: "gestionar_mentalmente",
        texto: "Gestionarlo con el psicólogo del club",
        narrativo: "La charla con el psicólogo te da perspectiva. El récord llegará, dice, cuando menos lo pienses.",
        efectos: { moral: 10, riesgoLesion: -5, forma: 8 },
      },
    ],
  },
]

// ─── Más eventos generales (para llegar a 100+) ───────────────────────────────

const EVENTOS_EXTRA: CareerEvent[] = [
  {
    id: "extra_visita_academia",
    tipo: "PERSONAL",
    titulo: "Te piden que visites tu antigua academia",
    descripcion: "Los entrenadores de tu academia de formación te contactan. Quieren que visites a los chicos de 14 años y les hables de tu trayectoria.",
    opciones: [
      {
        id: "ir_encantado",
        texto: "Ir con toda la ilusión del mundo",
        narrativo: "Pasas una mañana con los jóvenes promesas. Sus ojos llenos de ilusión te recuerdan por qué empezaste. Sales renovado y con energía extra.",
        efectos: { moral: 15, reputacion: 5, forma: 8 },
      },
      {
        id: "delegar_por_agenda",
        texto: "Enviar un mensaje de video en su lugar",
        narrativo: "No puedes ir pero grabas un mensaje sincero. Los chicos lo agradecen igualmente.",
        efectos: { moral: 5, reputacion: 2 },
      },
    ],
  },
  {
    id: "extra_partido_benefico",
    tipo: "PERSONAL",
    titulo: "Partido benéfico solidario",
    descripcion: "Una fundación organiza un partido benéfico de leyendas para recaudar fondos. Te invitan como figura destacada del fútbol actual.",
    opciones: [
      {
        id: "participar",
        texto: "Participar con todo el entusiasmo",
        narrativo: "El evento es un éxito. Te fotografías con leyendas del fútbol y la causa recauda más de lo esperado. Tu imagen positiva se dispara.",
        efectos: { moral: 12, reputacion: 8, confianza_vestuario: 5 },
      },
      {
        id: "declinar_carga",
        texto: "Declinar para no añadir carga física",
        narrativo: "El cuerpo te lo agradece. Envías una donación privada que nadie sabe pero tú sí.",
        efectos: { fatiga: -5, moral: 3 },
      },
    ],
  },
  {
    id: "extra_debut_tv",
    tipo: "PRENSA",
    titulo: "Debut como comentarista de televisión",
    descripcion: "Una cadena de deportes te propone comentar un partido de la selección desde el estudio. Sería tu primera aparición en televisión como experto.",
    opciones: [
      {
        id: "aceptar_debut_tv",
        texto: "Aceptarlo, es una experiencia nueva",
        narrativo: "Nervioso al principio, pero al final resulta natural. Tu análisis técnico sorprende a los espectadores. La cadena quiere repetir.",
        efectos: { moral: 8, reputacion: 10 },
      },
      {
        id: "rechazar_por_foco",
        texto: "Rechazarlo para mantener el foco en el fútbol",
        narrativo: "Disciplina de élite. Tu representante se queja pero sabe que tienes razón.",
        efectos: { moral: 5, confianza_entrenador: 5 },
      },
    ],
  },
  {
    id: "extra_bajon_rendimiento",
    tipo: "ENTRENAMIENTO",
    titulo: "Racha de bajo rendimiento inesperada",
    descripcion: "Llevas tres partidos sin tu mejor versión. Los números no mienten. El entrenador te habla en privado con preocupación sincera.",
    opciones: [
      {
        id: "analizar_con_datos",
        texto: "Pedir analítica de rendimiento para identificar el problema",
        narrativo: "Los datos revelan una sobrecarga postural. Con los ejercicios correctos, en dos semanas vuelves a tu nivel.",
        efectos: { fatiga: -10, forma: 10, riesgoLesion: -5 },
      },
      {
        id: "trabajar_extra",
        texto: "Quedarte entrenamientos extra por tu cuenta",
        narrativo: "El trabajo adicional paga. El entrenador lo ve y recuperas su confianza. Aunque el cuerpo acusa la carga.",
        efectos: { forma: 8, fatiga: 15, confianza_entrenador: 10 },
      },
      {
        id: "aceptar_mental",
        texto: "Aceptar que es un bache mental y buscar apoyo psicológico",
        narrativo: "El psicólogo deportivo te ayuda a resetear. En una semana tienes la cabeza más clara que nunca.",
        efectos: { moral: 15, forma: 12, riesgoLesion: -5 },
      },
    ],
  },
  {
    id: "extra_cambio_representante",
    tipo: "TRANSFERENCIA",
    titulo: "Tu representante quiere darte más visibilidad",
    descripcion: "Tu agente te llama emocionado. Tiene contactos con clubs del extranjero que preguntan por ti. Te propone hacer una gira de presentación internacional.",
    minReputacion: 45,
    opciones: [
      {
        id: "explorar_internacional",
        texto: "Dar el paso y explorar el mercado internacional",
        narrativo: "La noticia genera revuelo. Tu club se pone nervioso y acelera las conversaciones de renovación. El valor de mercado sube.",
        efectos: { reputacion: 12, moral: 8, confianza_entrenador: -8 },
      },
      {
        id: "mantener_estabilidad",
        texto: "Agradecer pero mantener la estabilidad",
        narrativo: "Tu representante refunfuña pero lo acepta. El club lo valora enormemente. A veces la lealtad tiene su recompensa.",
        efectos: { moral: 10, reputacion: 5, confianza_entrenador: 12 },
      },
    ],
  },
  {
    id: "extra_tactica_nueva_liga",
    tipo: "ENTRENAMIENTO",
    titulo: "El club ficha a un entrenador de métodos revolucionarios",
    descripcion: "El nuevo cuerpo técnico llega con datos, GPS, y una filosofía radicalmente diferente. Para algunos es el futuro; para otros, demasiado disruptivo.",
    opciones: [
      {
        id: "adaptarse_curioso",
        texto: "Abrazar el cambio con curiosidad",
        narrativo: "Eres el primero en asimilar el nuevo sistema. El entrenador te pone como ejemplo de adaptación. Tus estadísticas mejoran en los siguientes partidos.",
        efectos: { forma: 12, confianza_entrenador: 15, attributePoints: 1 },
      },
      {
        id: "resistencia_veterano",
        texto: "Mostrar escepticismo y mantener tus hábitos",
        narrativo: "No todo el mundo se adapta igual de rápido. Tu experiencia te mantiene estable pero pierdes terreno con el nuevo cuerpo técnico.",
        efectos: { forma: 3, confianza_entrenador: -12, moral: -5 },
      },
    ],
  },
  {
    id: "extra_derbi_especial",
    tipo: "EQUIPO",
    titulo: "El derbi más importante del año",
    descripcion: "Esta semana hay derbi. La ciudad está dividida. El capitán del vestuario habla antes del entrenamiento y te señala como pieza clave para esta semana.",
    minJornada: 3,
    opciones: [
      {
        id: "asumir_responsabilidad",
        texto: "Asumir el rol de referente sin dudarlo",
        narrativo: "Toda la semana entrenas con una intensidad diferente. El vestuario lo nota y te sigue. El ambiente antes del partido es eléctrico.",
        efectos: { moral: 12, confianza_vestuario: 12, forma: 10, riesgoLesion: 5 },
      },
      {
        id: "trabajo_colectivo",
        texto: "Insistir en que el derbi lo gana el equipo, no un individuo",
        narrativo: "Mensaje maduro y bien recibido por todos. El vestuario se une como un bloque. Esa cohesión puede ser la diferencia.",
        efectos: { moral: 8, confianza_vestuario: 18, forma: 5 },
      },
    ],
  },
  {
    id: "extra_lesion_companero",
    tipo: "EQUIPO",
    titulo: "Tu compañero cae lesionado de gravedad",
    descripcion: "En el entrenamiento de hoy, tu compañero más cercano sufre una lesión de rodilla que le tendrá varios meses fuera. El vestuario está destrozado.",
    opciones: [
      {
        id: "apoyo_incondicional",
        texto: "Ser el primero en apoyarle públicamente",
        narrativo: "Tus palabras en redes y en el vestuario generan una respuesta colectiva de apoyo. El equipo dedica el siguiente partido a su recuperación.",
        efectos: { moral: 8, confianza_vestuario: 15 },
      },
      {
        id: "asumir_responsabilidad_campo",
        texto: "Asumir más responsabilidad en el campo en su ausencia",
        narrativo: "Nadie te lo pide, pero todos lo ven. Tus números mejoran y el equipo se mantiene competitivo sin él.",
        efectos: { moral: 10, forma: 8, reputacion: 5, fatiga: 10 },
      },
    ],
  },
  {
    id: "extra_temporada_recordada",
    tipo: "PRENSA",
    titulo: "La prensa empieza a hablar de tu mejor temporada",
    descripcion: "Varios medios de comunicación coinciden: estás en tu mejor momento. Apareces en las portadas con titulares sobre tu año excepcional.",
    roles: ["Titular", "Estrella"],
    minReputacion: 50,
    minJornada: 10,
    opciones: [
      {
        id: "mantener_cabeza_baja",
        texto: "Mantener la cabeza baja y seguir trabajando",
        narrativo: "La humildad que demuestras ante los micrófonos genera aún más admiración. Eres noticia por tu discreción, paradójicamente.",
        efectos: { moral: 12, reputacion: 8, confianza_entrenador: 8 },
      },
      {
        id: "disfrutar_momento",
        texto: "Disfrutar del momento y hacer algunas entrevistas",
        narrativo: "Aprovechas la ola. Tus entrevistas son entretenidas y honestas. La gente te conecta como persona, no solo como jugador.",
        efectos: { moral: 15, reputacion: 15, fatiga: 5 },
      },
    ],
  },
]

// ─── Array combinado ──────────────────────────────────────────────────────────

export const CAREER_EVENTS: CareerEvent[] = [
  ...EVENTOS_PRENSA,
  ...EVENTOS_LESION,
  ...EVENTOS_TRANSFERENCIA,
  ...EVENTOS_EQUIPO,
  ...EVENTOS_ENTRENAMIENTO,
  ...EVENTOS_PERSONAL,
  ...EVENTOS_DELANTERO,
  ...EVENTOS_CENTROCAMPISTA,
  ...EVENTOS_DEFENSA,
  ...EVENTOS_PORTERO,
  ...EVENTOS_ARCO,
  ...EVENTOS_SELECCION,
  ...EVENTOS_CONTRATO,
  ...EVENTOS_EXTRA,
]

// ─── Pick random event ────────────────────────────────────────────────────────

export const pickRandomEvent = (
  jornada: number,
  division: number = 3,
  excludeIds: string[] = [],
  ctx: PlayerContext = {},
): CareerEvent => {
  const available = CAREER_EVENTS.filter((e) => {
    if (e.esArco) return false
    if (e.minJornada && e.minJornada > jornada) return false
    if (e.minDivision && e.minDivision > division) return false
    if (e.maxDivision && e.maxDivision < division) return false
    if (excludeIds.includes(e.id)) return false
    if (e.posiciones?.length && ctx.position && !e.posiciones.includes(ctx.position)) return false
    if (e.roles?.length && ctx.role && !e.roles.includes(ctx.role)) return false
    if (e.minReputacion && (ctx.reputacion ?? 0) < e.minReputacion) return false
    if (e.requiereStats) {
      for (const [stat, min] of Object.entries(e.requiereStats)) {
        if ((ctx.stats?.[stat] ?? 0) < min) return false
      }
    }
    return true
  })

  const pool = available.length > 0 ? available : CAREER_EVENTS.filter((e) => !e.esArco)
  return pool[Math.floor(Math.random() * pool.length)]
}

export const getEventById = (id: string): CareerEvent | undefined =>
  CAREER_EVENTS.find((e) => e.id === id)

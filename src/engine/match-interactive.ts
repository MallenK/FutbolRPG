import {
  Player,
  Posicion,
  DecisionOption,
  DecisionContext,
  ResultadoDecision,
} from "./types"
import { resolveStatValue, isCriticoFalloCondition } from "./decision"
export { getResultColor, getResultLabel } from "@/lib/result-display"

export interface Situacion {
  id: string
  descripcion: string
  minuto: number
  contexto: DecisionContext
  opciones: DecisionOption[]
  esOportunidadGol: boolean
  // Situación defensiva sobre la propia portería (portero): fallar aquí puede
  // encajar un gol real, no dar una oportunidad de gol propio.
  peligroPropio?: boolean
}

export interface TurnResult {
  opcion: DecisionOption
  resultado: ResultadoDecision
  score: number
  diceRoll: number
  narrativo: string
  gol: boolean
  asistencia: boolean
  valoracionDelta: number
  marcador: { local: number; visitante: number }
}

export interface InteractiveMatchState {
  turno: number
  totalTurnos: number
  marcador: { local: number; visitante: number }
  valoracion: number
  goles: number
  asistencias: number
  tiros: number
  fatiga: number
  moral: number
  log: TurnResult[]
}

// Generic fallback narratives
const NARRATIVOS: Record<ResultadoDecision, string[]> = {
  [ResultadoDecision.PERFECTO]: [
    "¡Ejecución magistral! El estadio enloquece.",
    "¡Perfecto! No podría haberlo hecho mejor.",
  ],
  [ResultadoDecision.EXITO]: [
    "Buena ejecución. Sale bien.",
    "Sólido. El equipo controla.",
  ],
  [ResultadoDecision.PARCIAL]: [
    "A medias. No fue lo que se esperaba.",
    "Forzado, pero sale adelante con esfuerzo.",
  ],
  [ResultadoDecision.FALLO]: [
    "Error en la ejecución. El rival aprovecha.",
    "Fallo claro. Había que hacerlo mejor.",
  ],
  [ResultadoDecision.CRITICO_FALLO]: [
    "¡Desastre! El rival celebra la oportunidad.",
    "¡Catástrofe! El partido se complica.",
  ],
}

const SITUACIONES: Situacion[] = [
  // ── GOL ──────────────────────────────────────────────────────────────
  {
    id: "mano_a_mano",
    descripcion: "Un pase filtrado te deja solo frente al portero. El estadio contiene la respiración.",
    minuto: 0,
    contexto: { dificultadBase: 50, presionSituacional: 30, bonusContexto: 0 },
    esOportunidadGol: true,
    opciones: [
      {
        id: "tiro_seguro",
        texto: "Asegurar al centro con potencia",
        tipo: "SEGURO",
        statPrincipal: "tiro",
        pesoStat: 1.1,
        riesgo: 0.1,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Calma total. Esperaste a que el portero se echara y colocaste al palo contrario. Imparable.",
            "Sin pensar, disparo cruzado y al fondo de la red. Instinto puro.",
          ],
          [ResultadoDecision.EXITO]: [
            "Disparo centrado pero con tanta fuerza que se le cuela al portero. Gol.",
            "El portero adivina la esquina pero no llega. Gol.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El portero desvía el balón al poste. El balón sale fuera. Córner.",
            "Disparo algo desviado, el portero llega a rozarlo. Sale el lateral.",
          ],
          [ResultadoDecision.FALLO]: [
            "Demasiado suave. El portero lo controla cómodamente.",
            "El balón va directamente a los guantes del portero. Una decepción.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Increíble. El balón sale por encima del travesaño desde menos de diez metros.",
            "El tiro se va al córner. El portero ni se ha movido. Lamentable.",
          ],
        },
      },
      {
        id: "tiro_colocado",
        texto: "Colocar al palo con rosca",
        tipo: "TECNICO",
        statPrincipal: "tiro",
        pesoStat: 1.0,
        riesgo: 0.2,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Rosca perfecta al palo corto. El portero ni lo ve. ¡Golazo de manual!",
            "La pelota entra besando el poste. No había ángulo, pero él lo encontró.",
          ],
          [ResultadoDecision.EXITO]: [
            "El balón roza el interior del poste y entra. La madera también marca hoy.",
            "Colocado pero sin tanto efecto del deseado. El portero se estira y no llega.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El balón roza el palo exterior y sale fuera. Centímetros de ser un golazo.",
            "El portero adivina la esquina y desvía a córner con la punta de los dedos.",
          ],
          [ResultadoDecision.FALLO]: [
            "La rosca sale demasiado cerrada. El balón se va al lateral de la red.",
            "El disparo se va desviado, sin ángulo. El portero lo recoge tranquilo.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El balón sale completamente desviado, directamente a la grada. El público no se lo cree.",
            "Disparo sin control: por encima del larguero con efecto inverso. Un horror.",
          ],
        },
      },
      {
        id: "regatear_gk",
        texto: "Regatear al portero que sale",
        tipo: "AGRESIVO",
        statPrincipal: "regate",
        pesoStat: 0.85,
        riesgo: 0.4,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Amaga a la derecha, el portero pica, y deslizas el balón al palo largo. ¡Clase total!",
            "Eludes al portero con un toque suave y empujas al vacío. Espectacular.",
          ],
          [ResultadoDecision.EXITO]: [
            "El portero se tira pronto. Empujas el balón al palo libre. Gol.",
            "Con la pierna débil, metes el balón antes de que el portero llegue. Dentro.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El portero aguanta bien el duelo. Te bloca con la pierna. Hay córner.",
            "El portero te choca y el balón sale al lateral. Poco más pudiste hacer.",
          ],
          [ResultadoDecision.FALLO]: [
            "El portero lee la jugada y te roba el balón con los pies antes de que dispares.",
            "Te lanzas demasiado pronto. El portero recupera sin problema.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Tropiezas con el balón al intentar el regate. El portero sale y se lo lleva. El estadio no puede creerlo.",
            "El portero te cierra los ángulos y te roba. Contraataque rival inmediato.",
          ],
        },
      },
    ],
  },
  {
    id: "centro_area_bombeado",
    descripcion: "Centro bombeado desde la banda izquierda. Llegas al punto de penalti con ventaja sobre tu marcador.",
    minuto: 0,
    contexto: { dificultadBase: 50, presionSituacional: 20, bonusContexto: 10 },
    esOportunidadGol: true,
    opciones: [
      {
        id: "control_tiro",
        texto: "Controlar el balón y asegurar el disparo",
        tipo: "SEGURO",
        statPrincipal: "control",
        pesoStat: 1.1,
        riesgo: 0.15,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Control perfecto con el pecho, el balón cae muerto a tus pies. Disparo colocado. Gol.",
            "Amortiguas el centro con el muslo y fusilas al portero en el segundo toque.",
          ],
          [ResultadoDecision.EXITO]: [
            "El control no fue perfecto pero el disparo sí. El balón entra por el palo.",
            "Controlas, giras y disparas antes de que el defensa cierre. Dentro.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El control se te va un poco largo. El defensa llega antes de que puedas disparar.",
            "Amortiguas mal el balón y el portero sale a blocar antes de que ajustes el disparo.",
          ],
          [ResultadoDecision.FALLO]: [
            "El balón bota raro y no consigues controlarlo. Se pierde el balón.",
            "El primer toque te deja sin ángulo. No puedes disparar con peligro.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El control es un desastre. El balón se te escapa lejos y el defensa despeja.",
            "Primer toque fatal: el balón sale del área y el rival contraataca.",
          ],
        },
      },
      {
        id: "cabeza",
        texto: "Remate de cabeza directo",
        tipo: "TECNICO",
        statPrincipal: "cabeceo",
        pesoStat: 1.0,
        riesgo: 0.2,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Salto perfecto, cuello fuerte y el balón al palo que el portero no cubre. ¡Gol de cabeza!",
            "Cabezazo potente y en picado. Al portero no le da tiempo ni a moverse.",
          ],
          [ResultadoDecision.EXITO]: [
            "Remate de cabeza que pilla al portero en el centro. No llega al palo.",
            "Cabezazo colocado, el portero lo roza pero entra.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El cabezazo va al cuerpo del portero. Para sin problemas.",
            "Remate demasiado blando. El portero lo bloca cómodamente.",
          ],
          [ResultadoDecision.FALLO]: [
            "El salto llega tarde. El balón te da en la frente sin fuerza y va al portero.",
            "El defensa llega antes y despeja el balón antes de que puedas rematar.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El remate de cabeza sale tan desviado que casi llega al córner rival. Incomprensible.",
            "Llegas mal al balón. El defensa aprovecha tu posición para saltar y despejar.",
          ],
        },
      },
      {
        id: "volea",
        texto: "Volea espectacular a primer toque",
        tipo: "AGRESIVO",
        statPrincipal: "tiro",
        pesoStat: 0.85,
        riesgo: 0.5,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "¡Volea perfecta! El balón entra en la escuadra antes de que el portero procese la jugada. Brutal.",
            "Impacto limpio, volea cruzada. El portero ni lo ve venir. Esto va al álbum de recuerdos.",
          ],
          [ResultadoDecision.EXITO]: [
            "La volea sale con potencia y desvío suficiente para descolocar al portero. Gol.",
            "No es una volea perfecta, pero tiene suficiente para engañar al portero.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "La volea roza el travesaño y sale fuera. Qué cerca del golazo.",
            "El portero adivina la trayectoria y desvía a córner con el puño.",
          ],
          [ResultadoDecision.FALLO]: [
            "La volea sale completamente ladeada. El balón va al lateral de la red por fuera.",
            "Demasiado complicado. El balón te bota mal y no consigues una buena conexión.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "La volea sale disparada a la grada. Hay que ver cómo se puede fallar tanto.",
            "Golpeas el balón con la parte exterior del pie. Sale a córner del rival.",
          ],
        },
      },
    ],
  },
  {
    id: "balon_parado_frontal",
    descripcion: "Tiro libre en la frontal del área. El muro ya está formado. El portero está en el palo corto.",
    minuto: 0,
    contexto: { dificultadBase: 52, presionSituacional: 40, bonusContexto: 0 },
    esOportunidadGol: true,
    opciones: [
      {
        id: "centro_fk",
        texto: "Centrar al segundo palo",
        tipo: "SEGURO",
        statPrincipal: "pase",
        pesoStat: 1.1,
        riesgo: 0.1,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Centro templado al segundo palo. El compañero aparece solo y empuja a la red.",
            "El balón llega exacto al segundo palo donde el delantero remata sin oposición.",
          ],
          [ResultadoDecision.EXITO]: [
            "El centro llega al área con peligro. Hay contacto y el balón entra con algo de ayuda.",
            "Centro forzado pero el delantero llega y empuja. Gol de equipo.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El centro llega pero el defensa despeja antes de que el compañero pueda rematar.",
            "El portero sale a puños y despeja antes de que el delantero contacte.",
          ],
          [ResultadoDecision.FALLO]: [
            "El balón se va demasiado largo. Sale de banda por línea de fondo.",
            "El centro es interceptado por el muro antes de llegar al área.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El centro va directamente a las manos del portero. Saque de portería.",
            "El balón choca en el muro y sale al contraataque rival. El equipo se queda descubierto.",
          ],
        },
      },
      {
        id: "tiro_colocado_fk",
        texto: "Disparar rosca sobre la barrera",
        tipo: "TECNICO",
        statPrincipal: "tiro",
        pesoStat: 1.0,
        riesgo: 0.25,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "La rosca describe un arco perfecto sobre el muro y se cuela por la escuadra. Obra de arte.",
            "La barrera salta, el balón pasa por encima y cae donde el portero no puede llegar. Increíble.",
          ],
          [ResultadoDecision.EXITO]: [
            "El balón rodea el muro y baja hacia la portería. El portero llega pero no puede evitarlo.",
            "Disparo con rosca que encuentra hueco entre el muro y el palo. Dentro.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El balón pasa sobre el muro pero el portero adivina la trayectoria y despeja.",
            "Demasiada rosca. El balón se va al lateral de la portería por fuera.",
          ],
          [ResultadoDecision.FALLO]: [
            "El disparo choca en la cabeza de un jugador del muro. Córner.",
            "La rosca no tiene suficiente potencia. El balón cae antes de la portería.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El balón sale por encima del larguero con mucho margen. A la primera fila de la grada.",
            "El disparo va directo al centro de la barrera. El rival despeja cómodamente.",
          ],
        },
      },
      {
        id: "potencia_fk",
        texto: "Lanzar con potencia al palo del portero",
        tipo: "AGRESIVO",
        statPrincipal: "fuerza",
        pesoStat: 0.85,
        riesgo: 0.4,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "El portero había tapado su palo pero no contaba con tanta potencia. Entra por su mismo lado.",
            "Cañonazo que va rozando el larguero y entra. El portero estaba bien colocado pero la fuerza es brutal.",
          ],
          [ResultadoDecision.EXITO]: [
            "Disparo con tanta potencia que sorprende al portero pese a estar bien colocado. Gol.",
            "El balón golpea el palo y entra. La madera también colabora hoy.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El tiro va al palo del portero pero él se tira bien y lo despeja a córner.",
            "Potente pero demasiado central. El portero lo bloca con el pecho.",
          ],
          [ResultadoDecision.FALLO]: [
            "Demasiado potencia, poca precisión. El balón sale varios metros desviado.",
            "El disparo le da a un jugador del muro en la espalda. Sale rápido al lateral.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El balón sale a una velocidad increíble... directo al público. Esto no puede suceder.",
            "La pierna se va del balón. El disparo ni siquiera supera el muro.",
          ],
        },
      },
    ],
  },
  {
    id: "penalti",
    descripcion: "Penalti señalado por mano en el área. Tú coges el balón. El estadio en silencio.",
    minuto: 0,
    contexto: { dificultadBase: 35, presionSituacional: 50, bonusContexto: 0 },
    esOportunidadGol: true,
    opciones: [
      {
        id: "esquina_baja",
        texto: "Colocar a la derecha del portero, raso",
        tipo: "TECNICO",
        statPrincipal: "tiro",
        pesoStat: 1.1,
        riesgo: 0.15,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "El portero se lanza al lado correcto pero no llega. El balón entra pegado al poste. Frío.",
            "Colocado al palo derecho, raso y con fuerza. El portero vuela pero no llega.",
          ],
          [ResultadoDecision.EXITO]: [
            "El portero adivina pero no llega con la mano. Gol.",
            "El balón entra en la esquina baja con suficiente precisión. Gol.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El portero se lanza al palo correcto y desvía a córner con la punta de los dedos.",
            "El balón golpea el poste y sale. El portero se ha salvado por centímetros.",
          ],
          [ResultadoDecision.FALLO]: [
            "El portero adivina la dirección y para el penalti con comodidad.",
            "El tiro va demasiado central. El portero no necesita ni tirarse.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El balón sale muy por encima del travesaño. Un penalti así no se puede fallar.",
            "Golpeas el poste de lleno. El balón rebota afuera. Silencio absoluto.",
          ],
        },
      },
      {
        id: "potencia_centro",
        texto: "Disparar con potencia al centro",
        tipo: "AGRESIVO",
        statPrincipal: "tiro",
        pesoStat: 0.95,
        riesgo: 0.25,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "El portero se lanza y el balón entra exacto donde él estaba. Un penalti al centro perfecto.",
            "Tanto potencia que el portero, aunque se queda quieto, no puede reaccionar. Entra.",
          ],
          [ResultadoDecision.EXITO]: [
            "El portero duda y no se mueve. El balón entra al centro bajo el cuerpo.",
            "El balón va con tanta velocidad que el portero no puede bajar las manos. Gol.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El portero se queda en el centro y lo para con el pecho. Buena lectura.",
            "El portero adivina y bloca con los dos puños. Despeja en corto.",
          ],
          [ResultadoDecision.FALLO]: [
            "El portero no se mueve. El balón le da directamente en la barriga. No podía ser más fácil.",
            "El disparo va al centro y el portero lo controla sin caer siquiera.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El balón da en el larguero y sale fuera. Un penalti rematado en el palo.",
            "El tiro sale completamente desviado, ni cerca de la portería. Increíble tensión.",
          ],
        },
      },
      {
        id: "panenka",
        texto: "Vaselina al centro — la Panenka",
        tipo: "TECNICO",
        statPrincipal: "control",
        pesoStat: 0.8,
        riesgo: 0.55,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "¡¡Panenka!! El portero se tira, el balón sube suave al centro. Elegancia absoluta. El estadio enloquece.",
            "El portero cae a un lado. El balón flota tranquilo al centro de la portería. Arte puro.",
          ],
          [ResultadoDecision.EXITO]: [
            "El portero duda y no se tira. El balón entra al centro con la vaselina justa.",
            "La vaselina no es perfecta pero el portero ya se había lanzado. Gol.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El portero adivina la Panenka y espera en el centro. El balón le cae a los brazos.",
            "La vaselina tiene demasiada altura. El portero espera y para fácil.",
          ],
          [ResultadoDecision.FALLO]: [
            "El portero lee la intención, no se lanza y bloca con las dos manos. Ridículo.",
            "El portero se queda quieto. El balón le viene directo. Bloqueado.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "La vaselina no tiene suficiente arco. El balón va directo a las manos del portero. Apaguen la luz.",
            "El balón sube demasiado y acaba en el larguero. La Panenka más fallida de la historia.",
          ],
        },
      },
    ],
  },
  {
    id: "tiro_lejano",
    descripcion: "El balón te queda suelto a 25 metros. Los defensas están replegados. El portero adelantado.",
    minuto: 0,
    contexto: { dificultadBase: 58, presionSituacional: 10, bonusContexto: 5 },
    esOportunidadGol: true,
    opciones: [
      {
        id: "disparo_ajustado",
        texto: "Disparar ajustado al palo",
        tipo: "TECNICO",
        statPrincipal: "tiro",
        pesoStat: 1.0,
        riesgo: 0.2,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "El tiro describe una parábola perfecta y entra por la escuadra. El portero solo puede mirar.",
            "Disparo ajustado al segundo palo. El portero está fuera de posición y no llega.",
          ],
          [ResultadoDecision.EXITO]: [
            "El tiro va con rosca al palo que el portero no cubre. Gol desde lejos.",
            "El balón bota delante del portero con efecto extraño. Entra.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El tiro va al poste. El balón rebota en el lateral de la red por fuera.",
            "El portero está lejos pero aun así llega a despejar a córner.",
          ],
          [ResultadoDecision.FALLO]: [
            "El disparo sale muy desviado. El portero ni se ha inmutado.",
            "El tiro va al cuerpo del portero que lo para sin problemas.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El balón sale tan desviado que llega al lateral de la portería rival. Sin palabras.",
            "La pierna se va del balón. Un tiro sin dirección, a la grada.",
          ],
        },
      },
      {
        id: "disparo_potente",
        texto: "Cañonazo con la pierna dominante",
        tipo: "AGRESIVO",
        statPrincipal: "fuerza",
        pesoStat: 1.0,
        riesgo: 0.3,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "¡Cañonazo! El balón entra casi sin rozar las redes. El portero ni lo vio.",
            "La potencia es tan brutal que el portero desiste de intentar pararlo.",
          ],
          [ResultadoDecision.EXITO]: [
            "El tiro va con tanta fuerza que el portero no puede retener. Rebote al fondo de la red.",
            "El portero intenta parar pero la potencia lo supera. Gol.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El portero bloca con dificultad pero retiene el balón.",
            "Demasiado centrado. El portero aguanta el impacto y despeja.",
          ],
          [ResultadoDecision.FALLO]: [
            "La potencia está pero la dirección no. El balón sale lejos de la portería.",
            "El disparo va alto y sale por encima del larguero.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El balón termina en las gradas del otro extremo del estadio. Una barbaridad.",
            "Cañonazo sin puntería. El balón va directamente al córner del campo.",
          ],
        },
      },
      {
        id: "amagay_disparo",
        texto: "Amagar al defensa y meter el pie",
        tipo: "EQUILIBRADO",
        statPrincipal: "regate",
        pesoStat: 0.9,
        riesgo: 0.25,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "El amague hace caer al defensa y el disparo desde la posición liberada entra al palo.",
            "Fintas al defensa, le saca la pierna y dispara al hueco. El portero no espera la dirección.",
          ],
          [ResultadoDecision.EXITO]: [
            "El defensa pica en el amague. El disparo no es perfecto pero tiene hueco. Gol.",
            "El defensa intenta bloquear pero llegas a disparar. El balón se cuela.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El defensa no pica. Bloquea el disparo con el cuerpo. Córner.",
            "El amague no funciona. El defensa está bien colocado y bloquea.",
          ],
          [ResultadoDecision.FALLO]: [
            "El defensa lee el amague perfectamente. Intercepta sin problema.",
            "El disparo acaba bloqueado. El defensa estaba esperando la jugada.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El defensa te roba el balón en el amague. Contragolpe rival.",
            "Tropiezas con el balón al intentar el amague. El rival se lo lleva.",
          ],
        },
      },
    ],
  },
  {
    id: "rebote_portero",
    descripcion: "El portero rechaza el disparo de un compañero. El balón te llega franco dentro del área.",
    minuto: 0,
    contexto: { dificultadBase: 42, presionSituacional: 25, bonusContexto: 5 },
    esOportunidadGol: true,
    opciones: [
      {
        id: "empuje_rapido",
        texto: "Empujar rápido antes de que el portero se rehaga",
        tipo: "AGRESIVO",
        statPrincipal: "tiro",
        pesoStat: 1.1,
        riesgo: 0.15,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Primer toque y dentro. El portero todavía en el suelo. Sin compasión.",
            "El rebote cae perfecto. La empujas antes de que nadie reaccione. Gol.",
          ],
          [ResultadoDecision.EXITO]: [
            "El portero casi llega pero no. El balón entra antes de que se rehaga.",
            "Primer toque al palo libre. El portero no puede volver a su posición. Gol.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El portero se rehace increíblemente rápido y bloca el segundo disparo.",
            "Un defensa despeja justo antes de que toques el balón.",
          ],
          [ResultadoDecision.FALLO]: [
            "El portero se recupera antes de que puedas disparar bien. Para fácil.",
            "La precipitación te traiciona. El primer toque sale mal y el portero recoge.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "En la urgencia, el primer toque te lleva el balón fuera del área.",
            "Golpeas el balón sin control. Sale por encima de la portería. Increíble.",
          ],
        },
      },
      {
        id: "acomodar_disparo",
        texto: "Acomodar el balón y disparar con calma",
        tipo: "SEGURO",
        statPrincipal: "control",
        pesoStat: 1.0,
        riesgo: 0.2,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Control preciso, balón muerto. Disparo al palo que el portero ha dejado libre. Gol.",
            "Un toque para acomodar, el segundo para fusolar. El portero ya estaba vencido.",
          ],
          [ResultadoDecision.EXITO]: [
            "El control no es perfecto pero tienes el tiempo justo para disparar bien. Gol.",
            "Acomodas y disparas antes de que el defensa cierre. El balón entra.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "Llegas a acomodar pero el defensa cierra antes de que puedas disparar.",
            "El control es bueno pero el portero ya está en posición. Para el segundo disparo.",
          ],
          [ResultadoDecision.FALLO]: [
            "Al intentar acomodar, un defensa llega y despeja. Se te ha ido la oportunidad.",
            "El tiempo que tomaste para acomodar dio al portero tiempo de rehacerse.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El control es un desastre. El balón se te escapa del área por completo.",
            "Al intentar controlar, el balón sale despedido. El rival lo recoge.",
          ],
        },
      },
      {
        id: "volea_rebote",
        texto: "Volea directa al balón en movimiento",
        tipo: "TECNICO",
        statPrincipal: "tiro",
        pesoStat: 0.9,
        riesgo: 0.35,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Volea limpia al primer toque. El balón entra en la escuadra sin que el portero pueda reaccionar.",
            "El rebote llega perfecto para la volea. Impacto seco y al fondo. Arte.",
          ],
          [ResultadoDecision.EXITO]: [
            "La volea no es limpia pero tiene suficiente dirección. El portero no llega.",
            "Volea con algo de desvío pero en la dirección correcta. Gol.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "La volea roza el larguero y sale fuera. Casi.",
            "El balón bota raro. La volea sale desviada. El portero la retiene.",
          ],
          [ResultadoDecision.FALLO]: [
            "El balón llega con un bote complicado. La volea no conecta bien.",
            "La volea sale completamente ladeada. Sin peligro.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "La volea falla el balón. Tropiezas y caes al área. El árbitro no pita nada.",
            "El impacto va a la tribuna. Volea sin control.",
          ],
        },
      },
    ],
  },

  // ── NO GOL ───────────────────────────────────────────────────────────
  {
    id: "presion_salida",
    descripcion: "El defensa rival duda con el balón en su propio campo. Tienes dos segundos para presionar.",
    minuto: 0,
    contexto: { dificultadBase: 40, presionSituacional: 0, bonusContexto: 5 },
    esOportunidadGol: false,
    opciones: [
      {
        id: "sprint_presion",
        texto: "Presionar con sprint al espacio",
        tipo: "FISICO",
        statPrincipal: "aceleracion",
        pesoStat: 1.1,
        riesgo: 0.1,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Sprint explosivo. El defensa entra en pánico y te cede el balón con el pase. Tu equipo en posición de gol.",
            "La presión es tan rápida que el defensa lo pierde sin contacto. Balón recuperado.",
          ],
          [ResultadoDecision.EXITO]: [
            "Presionas y el defensa lanza largo sin control. Pelota dividida que gana tu compañero.",
            "El defensa fuerza el pase bajo presión. Tu compañero lo intercepta.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "Presionas bien pero el defensa tiene el tiempo justo para pasar atrás. Sin peligro.",
            "El defensa aguanta tu presión y logra dar el pase, aunque apurado.",
          ],
          [ResultadoDecision.FALLO]: [
            "El defensa esquiva tu presión con un toque y te deja fuera de juego.",
            "No llegas a tiempo. El defensa ya ha dado el pase cuando llegas.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El defensa te amaga y pasa por tu lado. Tu equipo queda descubierto.",
            "Al sprinting, tropiezas. El defensa avanza con el balón ganando espacio.",
          ],
        },
      },
      {
        id: "interceptar",
        texto: "Cortar la línea de pase",
        tipo: "TACTICO",
        statPrincipal: "posicionamiento",
        pesoStat: 1.0,
        riesgo: 0.2,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Lees perfectamente el pase que va a dar y lo interceptas. Contraataque inmediato.",
            "Tu posicionamiento es perfecto. El balón viene hacia ti y lo robas limpiamente.",
          ],
          [ResultadoDecision.EXITO]: [
            "El defensa no ve la línea que has cortado. El pase sale hacia tu zona.",
            "Interceptas el pase aunque no en la mejor posición. El equipo mantiene el balón.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El defensa ve que has cortado esa línea y cambia el pase. No consigues robar.",
            "Llegas tarde a la intercepción. El balón pasa por encima de tu pierna.",
          ],
          [ResultadoDecision.FALLO]: [
            "El defensa cambia de opción antes de que puedas cortar. Pase limpio.",
            "Te posicionas mal. El pase pasa lejos de tu alcance.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Al intentar la intercepción fallas y el defensa queda solo para avanzar.",
            "Tu movimiento abre un pasillo. El defensa lo ve y avanza. Tu equipo corre.",
          ],
        },
      },
      {
        id: "entrada_fuerte",
        texto: "Entrada directa al defensa",
        tipo: "AGRESIVO",
        statPrincipal: "fuerza",
        pesoStat: 0.85,
        riesgo: 0.4,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Entrada limpia y contundente. Le robas el balón y tu equipo sale al contraataque.",
            "Perfecta lectura del momento. Entras, robas y sales con el balón.",
          ],
          [ResultadoDecision.EXITO]: [
            "La entrada es algo brusca pero ganas el balón. El árbitro deja seguir.",
            "Le tocas el balón antes que al jugador. El árbitro lo considera limpio.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El defensa te gana la dividida y el balón sale al lateral. Saque para ellos.",
            "Entras con fuerza pero llegas tarde. Falta en contra.",
          ],
          [ResultadoDecision.FALLO]: [
            "El árbitro pita falta. El defensa ya te esperaba.",
            "La entrada es tarde y brusca. Falta clara y tarjeta amarilla posible.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Roja directa. La entrada llega con el balón ya ido. El árbitro no duda.",
            "Entrada peligrosa por detrás. El árbitro saca amarilla y la posición es mala.",
          ],
        },
      },
    ],
  },
  {
    id: "espaldas_arco",
    descripcion: "Recibes de espaldas con el defensa pegado. Poco espacio para maniobrar.",
    minuto: 0,
    contexto: { dificultadBase: 45, presionSituacional: 15, bonusContexto: 0 },
    esOportunidadGol: false,
    opciones: [
      {
        id: "pivotear",
        texto: "Pivotar y descargar al compañero",
        tipo: "SEGURO",
        statPrincipal: "fuerza",
        pesoStat: 1.1,
        riesgo: 0.05,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Pivote limpio: ganas posición con el cuerpo y descarga al compañero libre en banda. Jugada perfecta.",
            "El defensa no puede con tu físico. Pivoteas, ves al compañero libre y das el pase de gol.",
          ],
          [ResultadoDecision.EXITO]: [
            "Aguantas el marcaje y descuelgas el balón a un compañero que llega.",
            "La descarga no es perfecta pero el equipo mantiene el balón y sigue construyendo.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El defensa te empuja en el pivote. El pase sale forzado. El rival lo roza.",
            "Aguantas pero pierdes equilibrio. El pase sale con poco peso.",
          ],
          [ResultadoDecision.FALLO]: [
            "El defensa es más fuerte. Te roba antes de que puedas pivotar.",
            "El defensa te empuja y el árbitro no pita. Pierdes el balón.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El defensa te roba el balón y sale en contraataque. Tu equipo está en apuros.",
            "Caes al intentar pivotar. El defensa aprovecha y avanza.",
          ],
        },
      },
      {
        id: "pared",
        texto: "Buscar la pared con un compañero",
        tipo: "EQUILIBRADO",
        statPrincipal: "pase",
        pesoStat: 1.0,
        riesgo: 0.2,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Pared perfecta. El pase de devolución te lleva a la espalda del defensa. Libre.",
            "La pared funciona a las mil maravillas. Tu compañero te la devuelve al espacio.",
          ],
          [ResultadoDecision.EXITO]: [
            "La pared funciona, aunque el segundo toque llega un poco larga. Mantienes.",
            "Tu compañero devuelve el balón y logras girar. Situación mejor.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El defensa adivina la pared y corta el pase de vuelta.",
            "La devolución llega interceptada. El rival recupera.",
          ],
          [ResultadoDecision.FALLO]: [
            "El pase de salida sale mal. Lo intercepta el rival directamente.",
            "El compañero no ve el movimiento. El balón queda muerto.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El pase es un regalo para el rival. Sale el contragolpe.",
            "El balón va directo al defensa. Contraataque inmediato.",
          ],
        },
      },
      {
        id: "giro_rapido",
        texto: "Giro brusco y auto-pase al espacio",
        tipo: "TECNICO",
        statPrincipal: "regate",
        pesoStat: 0.85,
        riesgo: 0.35,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Giro fulminante que deja al defensa mirando. Auto-pase al espacio y a correr.",
            "El defensa no esperaba el giro tan brusco. Queda detrás y tienes el campo abierto.",
          ],
          [ResultadoDecision.EXITO]: [
            "El giro funciona aunque el defensa reacciona rápido. Logras llegar al espacio.",
            "El defensa se descoloca. Tienes un metro de ventaja que aprovechas.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El giro es demasiado lento. El defensa bloca el movimiento.",
            "El defensa te sigue bien. No logras espacio para avanzar.",
          ],
          [ResultadoDecision.FALLO]: [
            "El defensa te lee y bloca el giro antes de que completes la vuelta.",
            "El auto-pase te queda largo. El rival llega antes.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El giro te hace perder el equilibrio. El defensa se lleva el balón fácilmente.",
            "El auto-pase sale directo al defensa. Robo limpio.",
          ],
        },
      },
    ],
  },
  {
    id: "contragolpe_pase",
    descripcion: "Contraataque 3 contra 2. Llevas el balón por el centro con espacio y tiempo.",
    minuto: 0,
    contexto: { dificultadBase: 45, presionSituacional: 10, bonusContexto: 15 },
    esOportunidadGol: false,
    opciones: [
      {
        id: "pase_profundidad",
        texto: "Abrir a la banda para generar el peligro",
        tipo: "SEGURO",
        statPrincipal: "vision",
        pesoStat: 1.1,
        riesgo: 0.1,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "El pase filtra perfecto al extremo que coge la espalda del lateral. Situación de gol.",
            "Ves el movimiento en banda antes de que nadie más. El pase es perfecto. Posición de centro.",
          ],
          [ResultadoDecision.EXITO]: [
            "El pase llega al compañero de banda. No es perfecto pero tiene tiempo de centrar.",
            "El extremo recibe y encarece el área. Hay posibilidades.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El pase llega algo pasado. El extremo tiene que frenar y pierde la ventaja.",
            "El lateral se recupera a tiempo. El extremo no puede desbordarlo.",
          ],
          [ResultadoDecision.FALLO]: [
            "El pase es interceptado por el defensa que lees a tus compañeros.",
            "El pase sale largo. Sale de banda.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El pase va directo al portero. Saque de puerta. El contraataque muerto.",
            "El pase es tan malo que inicia el contraataque contrario.",
          ],
        },
      },
      {
        id: "conducir_velocidad",
        texto: "Conducir con velocidad hasta el área",
        tipo: "FISICO",
        statPrincipal: "velocidad",
        pesoStat: 1.0,
        riesgo: 0.2,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Nadie te alcanza. Llegas al área con ventaja y eliges bien. La defensa está rota.",
            "Tu velocidad deja atrás a los dos defensas. Llegas al área solo.",
          ],
          [ResultadoDecision.EXITO]: [
            "Conduces con velocidad y llegas al borde del área con el defensa encima.",
            "Llegas al área aunque los defensas se han replegado. Tienes opciones.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El defensa te alcanza en el área. La oportunidad se reduce.",
            "Los defensas se repliegan bien. Llegas pero sin ventaja numérica.",
          ],
          [ResultadoDecision.FALLO]: [
            "El defensa más rápido te corta el camino. Llegas tarde.",
            "Conduces pero el ritmo no es suficiente. El contragolpe se enfría.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Un mal toque al correr te hace perder el balón en plena carrera.",
            "Tropiezas con el balón. El rival lo recupera y tu equipo en apuros.",
          ],
        },
      },
      {
        id: "frenar_recorte",
        texto: "Frenar en seco y romper con recorte",
        tipo: "TECNICO",
        statPrincipal: "regate",
        pesoStat: 0.85,
        riesgo: 0.3,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "El defensa no espera la parada en seco. El recorte lo deja en el suelo. Solo ante el portero.",
            "Fintas, paras, recortas. El defensa cae al suelo. Tienes el carril abierto.",
          ],
          [ResultadoDecision.EXITO]: [
            "El recorte funciona aunque el defensa reacciona. Llegas al área con un metro.",
            "El defensa pica en la finta. Tienes el espacio suficiente.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El defensa lee el recorte y no pica. Te bloca en el movimiento.",
            "La parada en seco te cuesta velocidad. El defensa se sitúa bien.",
          ],
          [ResultadoDecision.FALLO]: [
            "El defensa adivina el recorte. Te roba el balón.",
            "La finta es demasiado obvia. El defensa te corta limpiamente.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El recorte te lleva el balón fuera del campo. Lateral para el rival.",
            "Pierdes el equilibrio en el recorte. El rival sale solo.",
          ],
        },
      },
    ],
  },
  {
    id: "duelo_banda",
    descripcion: "1 contra 1 en la banda derecha. El lateral rival te cierra el camino al área.",
    minuto: 0,
    contexto: { dificultadBase: 48, presionSituacional: 10, bonusContexto: 0 },
    esOportunidadGol: false,
    opciones: [
      {
        id: "desborde_velocidad",
        texto: "Desbordarlo por velocidad por fuera",
        tipo: "FISICO",
        statPrincipal: "velocidad",
        pesoStat: 1.1,
        riesgo: 0.15,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Explosión de velocidad por la banda. El lateral no puede seguirte. Llegas a la línea de fondo.",
            "Primera velocidad inalcanzable. El lateral queda atrás. Centro al área.",
          ],
          [ResultadoDecision.EXITO]: [
            "Le ganas por velocidad aunque llega a molestarte. El centro sale aunque sea forzado.",
            "Desbordas por fuera con algo de ventaja. Hay centro.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El lateral es casi tan rápido como tú. Llegas a la línea pero sin espacio para centrar.",
            "Llegas a la línea de fondo pero el defensa cierra el centro.",
          ],
          [ResultadoDecision.FALLO]: [
            "El lateral te gana la carrera. Sales por la línea de banda.",
            "No eres suficientemente rápido. El lateral te corta antes de llegar.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El lateral te dobla. Pierdes el balón en la banda y tu equipo corre.",
            "Un mal toque al intentar el sprint. El lateral recupera.",
          ],
        },
      },
      {
        id: "regate_interior",
        texto: "Entrar al interior con el regate",
        tipo: "TECNICO",
        statPrincipal: "regate",
        pesoStat: 1.0,
        riesgo: 0.25,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "El recorte al interior deja al lateral sentado. Entras en el área con ventaja.",
            "Fintas el exterior y entras al interior. El lateral no puede seguirte.",
          ],
          [ResultadoDecision.EXITO]: [
            "El recorte funciona aunque el lateral llega a molestarte. Llegas al borde del área.",
            "Entras al interior con algo de ventaja. El disparo o pase es posible.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El lateral anticipa el recorte y te cierra la entrada interior.",
            "Entras al interior pero ya hay demasiados defensas.",
          ],
          [ResultadoDecision.FALLO]: [
            "El lateral te roba el balón al intentar el regate interior.",
            "El recorte es lento. El lateral se sitúa bien y bloca.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El balón se te va largo al intentar el recorte. El lateral lo recupera.",
            "El lateral te roba y sale en contraataque. Situación peligrosa.",
          ],
        },
      },
      {
        id: "pase_atras_reiniciar",
        texto: "Descargar atrás y reiniciar el ataque",
        tipo: "SEGURO",
        statPrincipal: "vision",
        pesoStat: 1.0,
        riesgo: 0.05,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Descargas al compañero que llega por detrás. El rival está fuera de posición.",
            "Pase atrás preciso que cambia el lado del ataque. El rival tiene que reorganizarse.",
          ],
          [ResultadoDecision.EXITO]: [
            "La descarga atrás mantiene el balón. El equipo reorganiza el ataque.",
            "Pase atrás que da tiempo a los compañeros para buscar una posición mejor.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El pase atrás es impreciso. El compañero tiene que frenar para controlarlo.",
            "Descargas pero el rival presiona rápido. No hay espacio para reiniciar.",
          ],
          [ResultadoDecision.FALLO]: [
            "El pase atrás sale mal. El rival lo presiona antes de que el compañero llegue.",
            "La descarga va a un rival. Pierde el balón.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El pase atrás es un regalo para el rival. Sale el contraataque.",
            "Impensable. El pase atrás sin mirar va directo al rival.",
          ],
        },
      },
    ],
  },
  {
    id: "pase_filtrado_lineas",
    descripcion: "Ves el hueco perfecto entre la línea defensiva y el mediocampo rival. Un compañero corre.",
    minuto: 0,
    contexto: { dificultadBase: 50, presionSituacional: 15, bonusContexto: 10 },
    esOportunidadGol: false,
    opciones: [
      {
        id: "pase_filtrado",
        texto: "Lanzar el pase al espacio entre líneas",
        tipo: "TECNICO",
        statPrincipal: "vision",
        pesoStat: 1.1,
        riesgo: 0.2,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "El pase es una obra de arte. Tu compañero recibe en carrera solo frente al portero.",
            "La pelota muere exactamente donde el compañero llega en sprint. Situación clarísima de gol.",
          ],
          [ResultadoDecision.EXITO]: [
            "El pase filtrado funciona. El compañero recibe con tiempo, aunque el defensa le sigue.",
            "El balón llega al espacio. El compañero tiene opciones.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El pase llega algo pasado. El compañero llega pero el defensa también.",
            "El timing es casi perfecto. El defensa llega a despejar aunque por poco.",
          ],
          [ResultadoDecision.FALLO]: [
            "El pase llega directo al defensa que no tuvo que moverse.",
            "El pase está mal dirigido. Sale por línea de fondo.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El pase es interceptado y el rival sale en contraataque con ventaja.",
            "El balón va al portero directamente. El gol cantado se convierte en saque de puerta.",
          ],
        },
      },
      {
        id: "conducir_y_filtrar",
        texto: "Conducir unos metros y elegir mejor el momento",
        tipo: "EQUILIBRADO",
        statPrincipal: "decisiones",
        pesoStat: 1.0,
        riesgo: 0.15,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Conduces tres pasos para abrir aún más el hueco. El pase sale perfecto.",
            "El momento que esperas es el ideal. El defensa ha avanzado. El pase entra.",
          ],
          [ResultadoDecision.EXITO]: [
            "Conduces, el espacio se abre algo más y el pase llega al compañero.",
            "La pausa te da el momento de pase correcto. El compañero recibe.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "Al conducir, el defensa reacciona y cierra el espacio. El pase llega forzado.",
            "Los defensas se repliegan mientras conduces. El hueco se cierra.",
          ],
          [ResultadoDecision.FALLO]: [
            "Al dudar, el rival presiona y te roba mientras conduces.",
            "La espera es demasiada. El compañero ya no tiene el timing para el pase.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Mientras conduces te rodean. Pierdes el balón en zona peligrosa.",
            "Al dudar, el rival te roba y queda en contraataque.",
          ],
        },
      },
      {
        id: "disparo_directo",
        texto: "Disparar tú mismo si el espacio lo permite",
        tipo: "AGRESIVO",
        statPrincipal: "tiro",
        pesoStat: 0.85,
        riesgo: 0.3,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "No das el pase, disparas. El portero no espera esa decisión. Gol.",
            "El defensa espera el pase. Disparas. El balón entra antes de que reaccione.",
          ],
          [ResultadoDecision.EXITO]: [
            "El disparo va con suficiente potencia para sorprender al portero.",
            "El portero adivina pero no llega. Gol.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El disparo va al portero directamente. Para sin problema.",
            "El defensa bloca el tiro antes de que puedas disparar limpiamente.",
          ],
          [ResultadoDecision.FALLO]: [
            "La distancia es demasiada. El disparo no llega con peligro.",
            "El defensa se interpone y bloca fácilmente.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El disparo sale completamente desviado. El compañero que estaba libre te mira sin creerlo.",
            "Tiro sin control. El balón va a la tribuna.",
          ],
        },
      },
    ],
  },
  {
    id: "robo_entrada_mediocamp",
    descripcion: "El mediocampista rival conduce solo en el centro del campo. Puedes entrarle.",
    minuto: 0,
    contexto: { dificultadBase: 42, presionSituacional: 5, bonusContexto: 0 },
    esOportunidadGol: false,
    opciones: [
      {
        id: "entrada_limpia",
        texto: "Entrada limpia por el balón",
        tipo: "TACTICO",
        statPrincipal: "posicionamiento",
        pesoStat: 1.1,
        riesgo: 0.15,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Entrada perfecta. Tocas el balón primero y tu equipo sale al contraataque.",
            "Timing perfecto. El balón es tuyo antes de que el rival pueda reaccionar.",
          ],
          [ResultadoDecision.EXITO]: [
            "Entrada algo brusca pero va al balón. El árbitro deja seguir.",
            "El robo es limpio. El equipo recupera.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El rival adelanta el balón justo antes de tu entrada. Sale el lateral.",
            "Llegas a tocar el balón pero el rival llega antes a la división.",
          ],
          [ResultadoDecision.FALLO]: [
            "El rival ve la entrada venir y pasa antes de que llegues. Te quedas en el suelo.",
            "Llegas tarde. El árbitro pita falta.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "La entrada llega tarde y con malos modos. Tarjeta amarilla directa.",
            "El rival pasa el balón y tu entrada vacía le desequilibra. Falta y posición peligrosa.",
          ],
        },
      },
      {
        id: "presion_doble",
        texto: "Presionar en equipo para forzar el error",
        tipo: "EQUILIBRADO",
        statPrincipal: "resistencia",
        pesoStat: 1.0,
        riesgo: 0.1,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "La presión en equipo es asfixiante. El rival comete el error y el balón es vuestro.",
            "Presionas sin perder posición. El rival se desespera y comete el error.",
          ],
          [ResultadoDecision.EXITO]: [
            "La presión fuerza un pase atrás. Vuestra posición mejora.",
            "El rival cede terreno bajo la presión. Ganas posición.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El rival aguanta la presión y logra salir con el balón.",
            "La presión no es suficientemente intensa. El rival circula.",
          ],
          [ResultadoDecision.FALLO]: [
            "El rival supera la presión con un pase preciso. Quedo expuesto.",
            "Al presionar sin organización, el rival te pasa y hay espacio detrás.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "La presión desorganizada deja un hueco enorme. El rival aprovecha para atacar.",
            "El rival supera la presión y hay ventaja numérica en el contragolpe.",
          ],
        },
      },
      {
        id: "anticipar_pase",
        texto: "Anticipar el pase y salir al corte",
        tipo: "TACTICO",
        statPrincipal: "decisiones",
        pesoStat: 0.9,
        riesgo: 0.25,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Lees el pase antes de que lo dé. Interceptas y sales solo.",
            "Anticipación de clase. El balón es tuyo y el rival no puede reaccionar.",
          ],
          [ResultadoDecision.EXITO]: [
            "Interceptas el pase aunque no en la mejor posición. El balón es del equipo.",
            "El corte funciona. El equipo mantiene el balón.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El rival cambia el pase en el último momento. No llegas a interceptar.",
            "Saliste al corte pero el rival ya había dado el pase.",
          ],
          [ResultadoDecision.FALLO]: [
            "Al salir al corte dejas un hueco que el rival aprovecha.",
            "El rival ve tu movimiento y pasa por detrás. Espacio.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Al anticipar mal el pase, dejas solo a un rival en posición de gol.",
            "El movimiento equivocado te deja fuera de posición. El rival lo explota.",
          ],
        },
      },
    ],
  },
  {
    id: "ultimo_minuto",
    descripcion: "Minuto 88. Tu equipo pierde por uno. El lateral te la da en banda. Todo el mundo atacando.",
    minuto: 88,
    contexto: { dificultadBase: 55, presionSituacional: 60, bonusContexto: 0 },
    esOportunidadGol: false,
    opciones: [
      {
        id: "centro_rapido",
        texto: "Centro rápido al área sin mirar",
        tipo: "AGRESIVO",
        statPrincipal: "pase",
        pesoStat: 0.9,
        riesgo: 0.3,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "El centro va exacto a donde el delantero llega en carrera. Cabezazo y gol. ¡El empate en el último minuto!",
            "Centro sin mirar pero preciso. El delantero aparece solo y empuja. Locura.",
          ],
          [ResultadoDecision.EXITO]: [
            "El centro es peligroso. Hay pelea en el área y el balón entra.",
            "El centro llega al área y en el caos se cuela. El equipo enloquece.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El centro llega pero el defensa despeja en el último momento. Córner.",
            "El centro es peligroso pero el portero atrapa.",
          ],
          [ResultadoDecision.FALLO]: [
            "El centro sale muy flojo. El portero lo recoge cómodamente.",
            "El centro va a la primera línea defensiva. La despeja.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El centro sale al córner rival. Con el equipo volcado, el rival puede contraatacar.",
            "El balón sale al lateral. El rival puede mantener el balón y perder el tiempo.",
          ],
        },
      },
      {
        id: "regate_desesperado",
        texto: "Regatear al lateral y llegar al área",
        tipo: "TECNICO",
        statPrincipal: "regate",
        pesoStat: 1.0,
        riesgo: 0.4,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "El regate es perfecto. Llegas al área solo. La situación de gol que el equipo necesita.",
            "El lateral cae en la finta. Entras al área. El portero sale. Decisión tuya.",
          ],
          [ResultadoDecision.EXITO]: [
            "Desbordas con algo de fortuna. El centro llega al área y hay peligro.",
            "El lateral no puede seguirte. Llegas al área aunque sea con el defensa encima.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El lateral te cierra bien. El pase que das llega forzado.",
            "El regate no funciona del todo. El lateral bloca tu avance.",
          ],
          [ResultadoDecision.FALLO]: [
            "El lateral te roba el balón. La oportunidad de igualar se complica.",
            "El regate llega demasiado tarde. El lateral recupera.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El lateral te roba. Con la defensa subida, el rival puede hacer el 2-0.",
            "Pierdes el balón en banda. El rival puede perder tiempo aquí.",
          ],
        },
      },
      {
        id: "buscar_penalti",
        texto: "Provocar el contacto dentro del área",
        tipo: "EQUILIBRADO",
        statPrincipal: "decisiones",
        pesoStat: 0.85,
        riesgo: 0.35,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "El contacto es real. El árbitro no duda. ¡Penalti! El estadio explota.",
            "El defensa mete la pierna. El árbitro señala el punto de penalti.",
          ],
          [ResultadoDecision.EXITO]: [
            "El contacto es claro. Penalti señalado entre protestas del rival.",
            "El árbitro considera que es penalti. La controversia es tu salvación.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "Hay contacto pero el árbitro no considera que sea penalti. El juego sigue.",
            "El árbitro consulta y decide que no es suficiente. Saque de falta fuera.",
          ],
          [ResultadoDecision.FALLO]: [
            "El árbitro ve la simulación. Falta en contra por pérdida de tiempo.",
            "El defensa está bien colocado. No hay contacto. Saque de puerta.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "El árbitro lo considera simulación. Tarjeta amarilla. El equipo pierde la inercia.",
            "Caes sin contacto. El árbitro te amonesta. El rival celebra.",
          ],
        },
      },
    ],
  },
  {
    id: "transicion_defensiva",
    descripcion: "Has perdido el balón en campo contrario. El rival corre al espacio. Debes frenar.",
    minuto: 0,
    contexto: { dificultadBase: 48, presionSituacional: 30, bonusContexto: 0 },
    esOportunidadGol: false,
    opciones: [
      {
        id: "sprint_recuperar",
        texto: "Sprinting para recuperar posición",
        tipo: "FISICO",
        statPrincipal: "aceleracion",
        pesoStat: 1.1,
        riesgo: 0.1,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Sprint de vuelta magistral. Llegas antes que el rival a la posición. El contragolpe está neutralizado.",
            "Tu velocidad de recuperación sorprende al rival. Vuelves antes de que llegue al área.",
          ],
          [ResultadoDecision.EXITO]: [
            "Recuperas posición justo a tiempo. El rival no puede avanzar con libertad.",
            "Llegas a neutralizar el contragolpe. El equipo se reorganiza.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "Llegas tarde pero aún puedes presionar. El rival llega al área.",
            "Recuperas posición pero el rival ya tiene ventaja numérica.",
          ],
          [ResultadoDecision.FALLO]: [
            "No llegas a tiempo. El rival avanza sin oposición.",
            "El sprint no es suficientemente rápido. El contragolpe es peligroso.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Al intentar el sprint te lesionas ligeramente. El rival aprovecha el espacio.",
            "Resbalas en el esfuerzo. El rival avanza libre.",
          ],
        },
      },
      {
        id: "falta_tactica",
        texto: "Falta táctica para frenar el contragolpe",
        tipo: "TACTICO",
        statPrincipal: "posicionamiento",
        pesoStat: 1.0,
        riesgo: 0.2,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Falta táctica ejecutada con maestría. Detienes el contragolpe sin tarjeta amarilla.",
            "El timing de la falta es perfecto. El árbitro la señala y el equipo se reorganiza.",
          ],
          [ResultadoDecision.EXITO]: [
            "La falta frena el contragolpe. El árbitro saca amarilla pero el peligro está neutralizado.",
            "Paras el contragolpe. La falta es necesaria aunque costosa.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "La falta no es en el momento ideal. El rival lanza rápido antes de que el equipo se organice.",
            "El árbitro tarda en pitarla. El rival saca rápido y el peligro continúa.",
          ],
          [ResultadoDecision.FALLO]: [
            "Llegas tarde a la falta. El rival ya ha pasado. Sin tarjeta pero sin efecto.",
            "El árbitro no pita. El rival sigue en velocidad.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Roja directa por falta de último hombre. El equipo con diez el resto del partido.",
            "La falta es peligrosa y el árbitro saca roja. Un desastre.",
          ],
        },
      },
      {
        id: "organizar_defensa",
        texto: "Organizas la defensa con gestos y gritos",
        tipo: "EQUILIBRADO",
        statPrincipal: "decisiones",
        pesoStat: 0.9,
        riesgo: 0.15,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Tu organización es perfecta. Los compañeros tapan todos los huecos. El rival no encuentra salida.",
            "Con gestos y gritos recolocas al equipo. El contragolpe se frustra.",
          ],
          [ResultadoDecision.EXITO]: [
            "Organizas bien la defensa. El rival llega pero sin ventaja numérica.",
            "Tu liderazgo defensivo contiene el peligro.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "Los compañeros tardan en reaccionar. El rival llega con cierta ventaja.",
            "La organización llega un poco tarde. El rival aprovecha el desorden inicial.",
          ],
          [ResultadoDecision.FALLO]: [
            "Nadie te escucha o llega tarde. El contragolpe sigue con ventaja.",
            "Tu organización no es suficientemente rápida. El rival explota el espacio.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Los compañeros se confunden con tus instrucciones. El rival llega con ventaja numérica clara.",
            "Al gritar instrucciones erradas, el equipo se desordena aún más.",
          ],
        },
      },
    ],
  },

  // ── PORTERO (peligro sobre la propia portería) ──────────────────────
  {
    id: "parada_reflejos",
    descripcion: "Disparo raso y potente desde la frontal del área. Apenas tienes una fracción de segundo para reaccionar.",
    minuto: 0,
    contexto: { dificultadBase: 50, presionSituacional: 45, bonusContexto: 0 },
    esOportunidadGol: false,
    peligroPropio: true,
    opciones: [
      {
        id: "estirada_mano_fuerte",
        texto: "Estirarte al palo con la mano fuerte",
        tipo: "TECNICO",
        statPrincipal: "reflejos",
        pesoStat: 1.1,
        riesgo: 0.15,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Reflejos felinos. Llegas a un balón que parecía imposible y lo desvías a córner. ¡Paradón!",
            "Estirada perfecta. La mano fuerte llega justo a tiempo para sacar el balón del ángulo.",
          ],
          [ResultadoDecision.EXITO]: [
            "Llegas al balón con lo justo. Buena parada, aunque sale algo de rebote.",
            "La estirada es a tiempo. El balón se estrella en tus guantes.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "Tocas el balón pero no puedes controlarlo. Rebota peligrosamente cerca del área pequeña.",
            "Llegas tarde a la estirada completa, pero rozas lo suficiente para desviar a córner.",
          ],
          [ResultadoDecision.FALLO]: [
            "Calculas mal la trayectoria. El balón pasa cerca de tu mano sin que puedas hacer nada más.",
            "La estirada llega tarde. El balón se te escapa hacia el fondo de la red.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Te tiras al lado equivocado. El balón entra por donde tú ya no estás. Desastre.",
            "Un fallo de bulto: ni siquiera llegas a rozarlo. Gol evitable donde los haya.",
          ],
        },
      },
      {
        id: "cerrar_angulo_cuerpo",
        texto: "Cerrar el ángulo y bloquear con el cuerpo",
        tipo: "SEGURO",
        statPrincipal: "colocacion",
        pesoStat: 1.15,
        riesgo: 0.1,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Tu colocación deja al rematador sin ángulo. El disparo se estrella en tu pecho sin que ni te muevas.",
            "Achicas tan bien el espacio que el disparo va directo a tu cuerpo. Parada de manual.",
          ],
          [ResultadoDecision.EXITO]: [
            "Bien plantado. El balón te da en el cuerpo y cae controlado a tus pies.",
            "La posición es buena. El disparo no encuentra hueco y lo bloqueas.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "Bloqueas el disparo pero el rechace queda suelto en el área. Momento de peligro.",
            "El cuerpo detiene el balón, pero se te escapa hacia el lateral sin control.",
          ],
          [ResultadoDecision.FALLO]: [
            "Te colocas mal y dejas hueco al primer palo. El balón pasa junto a ti.",
            "Achicas tarde. El disparo encuentra el ángulo que habías dejado libre.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Te quedas completamente descolocado. El disparo entra por donde debía estar tu cuerpo.",
            "Un error de posición flagrante. El delantero no podía pedir un ángulo más fácil.",
          ],
        },
      },
      {
        id: "volar_palo_contrario",
        texto: "Volar al palo contrario a puños",
        tipo: "AGRESIVO",
        statPrincipal: "agilidad",
        pesoStat: 0.95,
        riesgo: 0.35,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Vuelo espectacular. Alcanzas un balón que iba a la escuadra contraria y lo mandas a córner. ¡Aplausos del estadio!",
            "Salto felino al palo contrario. Sacas el balón con los puños en el último instante.",
          ],
          [ResultadoDecision.EXITO]: [
            "Llegas volando y despejas, aunque el aterrizaje es incómodo.",
            "El vuelo es arriesgado pero efectivo. Sacas el balón fuera.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "Llegas a tocar el balón en el aire pero no consigues despejarlo del todo. Rebote peligroso.",
            "El vuelo te deja fuera de posición tras el toque. El balón queda suelto.",
          ],
          [ResultadoDecision.FALLO]: [
            "Calculas mal el salto. El balón pasa por debajo de tu vuelo.",
            "Te lanzas demasiado tarde. El disparo ya ha entrado cuando llegas.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Un vuelo desastroso: saltas al lado equivocado y el balón entra por el hueco que dejaste.",
            "Te resbalas en el salto. Ni siquiera llegas a intentar el desvío. Gol evitable.",
          ],
        },
      },
    ],
  },
  {
    id: "salida_al_centro",
    descripcion: "Centro bombeado desde la banda hacia tu área. Tienes que decidir en un instante: salir o quedarte en la línea.",
    minuto: 0,
    contexto: { dificultadBase: 46, presionSituacional: 30, bonusContexto: 0 },
    esOportunidadGol: false,
    peligroPropio: true,
    opciones: [
      {
        id: "salir_a_punos",
        texto: "Salir a puños entre los delanteros",
        tipo: "TACTICO",
        statPrincipal: "decisiones",
        pesoStat: 1.0,
        riesgo: 0.3,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Sales en el momento exacto y despejas de puños por encima de todos. Autoridad total en tu área.",
            "Lectura perfecta del centro. Sales, despejas y el peligro desaparece por completo.",
          ],
          [ResultadoDecision.EXITO]: [
            "Sales a tiempo y despejas, aunque el rechace no llega muy lejos.",
            "Buena decisión de salida. El puño despeja lo peor del peligro.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "Sales pero llegas justo. El despeje queda corto, cerca de un rival.",
            "El puño solo roza el balón. Queda suelto dentro del área.",
          ],
          [ResultadoDecision.FALLO]: [
            "Sales tarde. El delantero te gana la posición en el aire antes de que llegues.",
            "Calculas mal la trayectoria del centro. Sales al vacío.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Sales sin necesidad y no llegas al balón. Dejas la portería vacía. Catástrofe.",
            "Chocas con tu propio defensa al salir. El balón queda libre para el rival, sin nadie en la portería.",
          ],
        },
      },
      {
        id: "quedarse_linea",
        texto: "Quedarte en la línea y ordenar al defensa",
        tipo: "SEGURO",
        statPrincipal: "posicionamiento",
        pesoStat: 1.1,
        riesgo: 0.1,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Tu colocación en la línea es perfecta. El defensa despeja de cabeza con toda tranquilidad, cubierto por ti.",
            "Ordenas la marca con precisión. El centro se resuelve sin ningún sobresalto.",
          ],
          [ResultadoDecision.EXITO]: [
            "Bien plantado. El defensa despeja y tú cubres cualquier rechace.",
            "La posición es correcta. El centro no genera peligro real.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "El defensa despeja mal y el rechace queda cerca del área pequeña. Tensión.",
            "Te quedas bien colocado pero el balón pica de forma extraña frente a ti.",
          ],
          [ResultadoDecision.FALLO]: [
            "Te quedas corto en la línea. El defensa se confunde esperando tu salida que no llega.",
            "Mala lectura de la posición. El remate encuentra un hueco que no cubriste.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Te quedas completamente estático, ni sales ni cubres el palo. El remate entra sin oposición.",
            "Un error de bulto de colocación. El defensa no sabe qué hacer y el rival remata solo.",
          ],
        },
      },
      {
        id: "atrapar_por_alto",
        texto: "Salir a atrapar el balón por alto",
        tipo: "TECNICO",
        statPrincipal: "salto",
        pesoStat: 1.0,
        riesgo: 0.25,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Saltas por encima de todos y atrapas el balón limpio en el aire. Dominio absoluto del área.",
            "Vuelo perfecto: atrapas el centro con las dos manos sin que nadie más lo toque.",
          ],
          [ResultadoDecision.EXITO]: [
            "Atrapas el balón, aunque con algo de apuro entre varios jugadores.",
            "El salto llega a tiempo. Controlas el centro con las manos.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "Tocas el balón en el salto pero no consigues atraparlo. Cae suelto en el área.",
            "El salto es correcto pero el balón se te escurre de las manos.",
          ],
          [ResultadoDecision.FALLO]: [
            "Saltas tarde. Un rival te gana la posición en el aire antes de que llegues.",
            "Calculas mal el salto. El balón pasa por encima de tus manos.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Un salto desastroso: ni rozas el balón y dejas el área completamente descubierta.",
            "Chocas con un rival al saltar. El balón queda suelto sin oposición alguna.",
          ],
        },
      },
    ],
  },
  {
    id: "mano_a_mano_portero",
    descripcion: "El delantero rival se planta solo ante ti tras superar a la defensa. Mano a mano. Todo depende de este instante.",
    minuto: 0,
    contexto: { dificultadBase: 55, presionSituacional: 50, bonusContexto: 0 },
    esOportunidadGol: false,
    peligroPropio: true,
    opciones: [
      {
        id: "achicar_angulo",
        texto: "Achicar espacio y cerrar el ángulo de tiro",
        tipo: "TACTICO",
        statPrincipal: "posicionamiento",
        pesoStat: 1.1,
        riesgo: 0.2,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Achicas el ángulo a la perfección. El delantero no encuentra hueco y dispara directo a tu cuerpo.",
            "Tu salida deja al rematador sin espacio. El disparo muere en tus manos.",
          ],
          [ResultadoDecision.EXITO]: [
            "Buena salida. El ángulo se reduce lo suficiente para que el disparo no encuentre hueco.",
            "Te plantas bien. El delantero dispara con poco margen y bloqueas.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "Achicas el ángulo pero el disparo se cuela por donde no esperabas. Rechace en el área.",
            "La salida es correcta pero el delantero encuentra un hueco pequeño. El balón roza el poste.",
          ],
          [ResultadoDecision.FALLO]: [
            "Sales con el ángulo equivocado. El delantero dispara al hueco que dejaste libre.",
            "Calculas mal la distancia. El rematador tiene todo el ángulo para definir.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Sales de forma completamente errática. Dejas la portería abierta de par en par.",
            "Un cálculo desastroso de la salida. El delantero define a placer.",
          ],
        },
      },
      {
        id: "aguantar_de_pie",
        texto: "Aguantar de pie sin anticiparte",
        tipo: "SEGURO",
        statPrincipal: "concentracion",
        pesoStat: 1.0,
        riesgo: 0.15,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Aguantas de pie con una calma absoluta. El delantero se precipita y dispara directo a ti.",
            "Tu concentración es total. Esperas hasta el último instante y el rematador se equivoca de decisión.",
          ],
          [ResultadoDecision.EXITO]: [
            "Aguantas bien la posición. El delantero duda y el disparo no es tan peligroso.",
            "Tu paciencia da resultado. El disparo llega con menos precisión de la esperada.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "Aguantas pero el delantero encuentra un hueco pequeño. El balón roza el palo al salir.",
            "La espera es correcta pero el rematador te sorprende con un cambio de ritmo.",
          ],
          [ResultadoDecision.FALLO]: [
            "Te quedas quieto demasiado tiempo. El delantero define con comodidad.",
            "Pierdes la concentración un instante. El disparo te sorprende mal colocado.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Un despiste total. Ni siquiera reaccionas al disparo. Gol sin oposición.",
            "Pierdes la referencia del delantero por completo. Define sin ninguna dificultad.",
          ],
        },
      },
      {
        id: "lanzarse_a_los_pies",
        texto: "Lanzarte a los pies para robar el balón",
        tipo: "AGRESIVO",
        statPrincipal: "reflejos",
        pesoStat: 0.9,
        riesgo: 0.45,
        narrativos: {
          [ResultadoDecision.PERFECTO]: [
            "Te lanzas con un timing perfecto y te llevas el balón limpio, sin tocar al delantero. Salida de manual.",
            "Anticipas el control rival y te tiras a sus pies. Robo perfecto, sin falta.",
          ],
          [ResultadoDecision.EXITO]: [
            "Te lanzas a tiempo y sacas el balón, aunque con algo de contacto.",
            "El desesperado se convierte en efectivo: te llevas el balón antes del disparo.",
          ],
          [ResultadoDecision.PARCIAL]: [
            "Llegas al balón pero se queda suelto entre los dos. Momento de máxima tensión.",
            "Tocas el balón en la salida pero no lo controlas. Rebote incierto.",
          ],
          [ResultadoDecision.FALLO]: [
            "Te lanzas demasiado pronto. El delantero te supera y define a placer.",
            "Calculas mal el momento. Te quedas tendido mientras el rival remata.",
          ],
          [ResultadoDecision.CRITICO_FALLO]: [
            "Te lanzas tarde y encima cometes penalti. El árbitro no duda en señalarlo.",
            "Un error grosero: te tiras al aire sin tocar el balón. El delantero define a portería vacía.",
          ],
        },
      },
    ],
  },
]

const getTargetDifficulty = (turno: number): number => {
  const rand = Math.random()
  if (turno <= 2) return rand < 0.7 ? 35 + Math.random() * 10 : 46 + Math.random() * 9
  if (turno <= 4) {
    if (rand < 0.4) return 35 + Math.random() * 10
    if (rand < 0.8) return 46 + Math.random() * 14
    return 61 + Math.random() * 9
  }
  if (rand < 0.2) return 40 + Math.random() * 5
  if (rand < 0.7) return 50 + Math.random() * 10
  return 65 + Math.random() * 10
}

export const getSituacionForTurn = (turno: number, player: Player): Situacion => {
  let baseDC = getTargetDifficulty(turno)
  if (player.estado.fatiga > 50) baseDC += 5
  baseDC = Math.round(Math.max(30, Math.min(80, baseDC)))

  const esPortero = player.posicionPrincipal === Posicion.PORTERO
  let pool: Situacion[]
  if (esPortero) {
    // El portero nunca ataca — solo defiende su propia portería.
    pool = SITUACIONES.filter((s) => s.peligroPropio)
  } else {
    const situacionesDeCampo = SITUACIONES.filter((s) => !s.peligroPropio)
    pool = baseDC > 65
      ? situacionesDeCampo.filter((s) => s.esOportunidadGol)
      : situacionesDeCampo
  }

  const template = pool[Math.floor(Math.random() * pool.length)]
  const minuto = Math.round((turno / 5) * 90)

  return {
    ...template,
    minuto,
    contexto: { ...template.contexto, dificultadBase: baseDC },
  }
}

export const resolveDecisionWithDice = (
  opcion: DecisionOption,
  player: Player,
  situacion: Situacion,
  diceRoll: number,
  currentMarcador: { local: number; visitante: number }
): TurnResult => {
  const context = situacion.contexto
  const statValue = resolveStatValue(opcion.statPrincipal, player)
  const statContribution = statValue * opcion.pesoStat
  const difficultyPenalty = context.dificultadBase
  const skillDifference = statContribution - difficultyPenalty
  const formMod = (player.estado.forma - 50) * 0.2
  const fatigueMod = player.estado.fatiga * 0.2
  const confidenceMod = (player.mentales.confianza - 50) * 0.15
  const pressureResistance = player.mentales.presion / 100
  const effectivePressure = context.presionSituacional * (1 - pressureResistance * 0.6)
  const randomFactor = Math.round((diceRoll - 10) * 0.65)

  const rawScore =
    50 + skillDifference + formMod - fatigueMod + confidenceMod - effectivePressure +
    context.bonusContexto + randomFactor

  const score = Math.max(0, Math.min(100, Math.round(rawScore)))

  let resultado: ResultadoDecision
  if (score >= 85) resultado = ResultadoDecision.PERFECTO
  else if (score >= 65) resultado = ResultadoDecision.EXITO
  else if (score >= 41) resultado = ResultadoDecision.PARCIAL
  else if (score >= 16) resultado = ResultadoDecision.FALLO
  else {
    resultado = isCriticoFalloCondition(score, opcion, player, context)
      ? ResultadoDecision.CRITICO_FALLO
      : ResultadoDecision.FALLO
  }

  const pool = opcion.narrativos?.[resultado]?.length
    ? opcion.narrativos[resultado]!
    : NARRATIVOS[resultado]
  const narrativo = pool[Math.floor(Math.random() * pool.length)]

  let gol = false
  let asistencia = false
  let valoracionDelta = 0
  const marcador = { ...currentMarcador }

  if (situacion.esOportunidadGol) {
    const golChances: Record<ResultadoDecision, number> = {
      [ResultadoDecision.PERFECTO]: 0.80,
      [ResultadoDecision.EXITO]: 0.35,
      [ResultadoDecision.PARCIAL]: 0.08,
      [ResultadoDecision.FALLO]: 0,
      [ResultadoDecision.CRITICO_FALLO]: 0,
    }
    const penaltyAlwaysScores = situacion.id === "penalti" && player.traits.includes("penalty_expert")
    if (penaltyAlwaysScores || Math.random() < golChances[resultado]) {
      gol = true
      marcador.local++
      valoracionDelta += resultado === ResultadoDecision.PERFECTO ? 1.5 : 1.2
    } else {
      valoracionDelta += resultado === ResultadoDecision.PERFECTO ? 0.5 : 0.2
    }
    if (resultado === ResultadoDecision.FALLO || resultado === ResultadoDecision.CRITICO_FALLO) {
      valoracionDelta -= 0.5
    }
  } else if (situacion.peligroPropio) {
    // Situación defensiva sobre la propia portería: no hay "asistencia" que valga,
    // fallar aquí significa encajar un gol real. Mucho más severo que cualquier otro fallo.
    const concederChances: Record<ResultadoDecision, number> = {
      [ResultadoDecision.PERFECTO]: 0,
      [ResultadoDecision.EXITO]: 0,
      [ResultadoDecision.PARCIAL]: 0.05,
      [ResultadoDecision.FALLO]: 0.45,
      [ResultadoDecision.CRITICO_FALLO]: 0.85,
    }
    if (Math.random() < concederChances[resultado]) {
      marcador.visitante++
      valoracionDelta -= resultado === ResultadoDecision.CRITICO_FALLO ? 1.5 : 1.0
    } else {
      valoracionDelta += resultado === ResultadoDecision.PERFECTO ? 1.2
        : resultado === ResultadoDecision.EXITO ? 0.6
        : resultado === ResultadoDecision.PARCIAL ? 0.1
        : 0
    }
  } else {
    if (resultado === ResultadoDecision.PERFECTO) {
      asistencia = true
      marcador.local++
      valoracionDelta += 1.0
    } else if (resultado === ResultadoDecision.EXITO) {
      valoracionDelta += 0.4
    } else if (resultado === ResultadoDecision.FALLO || resultado === ResultadoDecision.CRITICO_FALLO) {
      if (Math.random() < 0.15) marcador.visitante++
      valoracionDelta -= 0.3
    }
  }

  return { opcion, resultado, score, diceRoll, narrativo, gol, asistencia, valoracionDelta, marcador }
}

export const getStatLabel = (statKey: string): string => {
  const labels: Record<string, string> = {
    tiro: "TIR", pase: "PAS", control: "CTR", regate: "REG", cabeceo: "CAB",
    velocidad: "VEL", aceleracion: "ACE", resistencia: "RES", fuerza: "FUE",
    posicionamiento: "POS", vision: "VIS", decisiones: "DEC",
    disciplina: "DIS", confianza: "CON", presion: "PRE",
    reflejos: "REF", colocacion: "COL", agilidad: "AGI", salto: "SAL", concentracion: "CNT",
  }
  return labels[statKey] ?? statKey.toUpperCase().slice(0, 3)
}

export const initMatchState = (): InteractiveMatchState => ({
  turno: 1,
  totalTurnos: 5,
  marcador: { local: 0, visitante: 0 },
  valoracion: 6.0,
  goles: 0,
  asistencias: 0,
  tiros: 0,
  fatiga: 0,
  moral: 85,
  log: [],
})

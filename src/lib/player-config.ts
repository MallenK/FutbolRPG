// ─── Stat definitions ────────────────────────────────────────────────────────

export type StatGroup = "tecnicos" | "fisicos" | "tacticos" | "mentales"

export type StatKey =
  // Técnicos (8)
  | "control" | "pase" | "tiro" | "regate" | "cabeceo"
  | "centros" | "entradas" | "reflejos"
  // Físicos (6)
  | "resistencia" | "velocidad" | "aceleracion" | "fuerza" | "salto" | "agilidad"
  // Tácticos (5)
  | "posicionamiento" | "vision" | "decisiones" | "presion_alta" | "colocacion"
  // Mentales (6)
  | "disciplina" | "confianza" | "presion" | "liderazgo" | "concentracion" | "ambicion"

export type StatDefinition = {
  key: StatKey
  label: string
  group: StatGroup
  description: string
}

export const ALL_STATS: StatDefinition[] = [
  // Técnicos
  { key: "control",        group: "tecnicos", label: "Control",         description: "Dominio del balón en recepción y conducción" },
  { key: "pase",           group: "tecnicos", label: "Pase",            description: "Precisión y calidad en el pase corto y largo" },
  { key: "tiro",           group: "tecnicos", label: "Tiro",            description: "Potencia y precisión del disparo a portería" },
  { key: "regate",         group: "tecnicos", label: "Regate",          description: "Capacidad de superar rivales en 1v1" },
  { key: "cabeceo",        group: "tecnicos", label: "Cabeceo",         description: "Eficacia en duelos aéreos y remates de cabeza" },
  { key: "centros",        group: "tecnicos", label: "Centros",         description: "Calidad del centro y el pase en profundidad" },
  { key: "entradas",       group: "tecnicos", label: "Entradas",        description: "Eficacia en el marcaje y la entrada a destiempo" },
  { key: "reflejos",       group: "tecnicos", label: "Reflejos",        description: "Capacidad de reacción ante disparos (porteros)" },
  // Físicos
  { key: "resistencia",    group: "fisicos",  label: "Resistencia",     description: "Capacidad de mantener el nivel 90 minutos" },
  { key: "velocidad",      group: "fisicos",  label: "Velocidad",       description: "Velocidad máxima en carrera" },
  { key: "aceleracion",    group: "fisicos",  label: "Aceleración",     description: "Explosividad en el primer metro" },
  { key: "fuerza",         group: "fisicos",  label: "Fuerza",          description: "Potencia física en duelos y disputas" },
  { key: "salto",          group: "fisicos",  label: "Salto",           description: "Capacidad en duelos aéreos" },
  { key: "agilidad",       group: "fisicos",  label: "Agilidad",        description: "Cambios de dirección y fluidez de movimiento" },
  // Tácticos
  { key: "posicionamiento",group: "tacticos", label: "Posicionamiento", description: "Lectura del espacio y ubicación en el campo" },
  { key: "vision",         group: "tacticos", label: "Visión",          description: "Capacidad de ver jugadas antes de que ocurran" },
  { key: "decisiones",     group: "tacticos", label: "Decisiones",      description: "Acierto en la elección de la acción correcta" },
  { key: "presion_alta",   group: "tacticos", label: "Presión alta",    description: "Efectividad en el pressing y recuperación de balón" },
  { key: "colocacion",     group: "tacticos", label: "Colocación",      description: "Posición entre los palos y en el área (porteros)" },
  // Mentales
  { key: "disciplina",     group: "mentales", label: "Disciplina",      description: "Cumplimiento táctico y control emocional" },
  { key: "confianza",      group: "mentales", label: "Confianza",       description: "Seguridad en uno mismo y en sus acciones" },
  { key: "presion",        group: "mentales", label: "Concentración",   description: "Rendimiento en momentos de máxima presión" },
  { key: "liderazgo",      group: "mentales", label: "Liderazgo",       description: "Influencia en el vestuario y el campo" },
  { key: "concentracion",  group: "mentales", label: "Atención",        description: "Capacidad de mantener el foco durante el partido" },
  { key: "ambicion",       group: "mentales", label: "Ambición",        description: "Hambre de victoria y superación constante" },
]

export const STAT_BY_KEY = Object.fromEntries(ALL_STATS.map((s) => [s.key, s])) as Record<StatKey, StatDefinition>

// ─── Position stat profiles ───────────────────────────────────────────────────

export type Position = "GK" | "CB" | "FB" | "CM" | "AM" | "W" | "ST"

export type PositionStatProfile = {
  primary: StatKey[]     // shown first, higher base, more impactful
  secondary: StatKey[]   // shown below, still relevant
}

export const POSITION_STAT_PROFILES: Record<Position, PositionStatProfile> = {
  GK: {
    primary:   ["reflejos", "colocacion", "posicionamiento", "concentracion", "salto", "decisiones"],
    secondary: ["pase", "fuerza", "vision", "resistencia", "liderazgo", "presion", "agilidad", "disciplina"],
  },
  CB: {
    primary:   ["entradas", "cabeceo", "posicionamiento", "fuerza", "liderazgo", "concentracion"],
    secondary: ["velocidad", "resistencia", "pase", "vision", "decisiones", "salto", "disciplina", "presion"],
  },
  FB: {
    primary:   ["velocidad", "centros", "aceleracion", "resistencia", "regate", "pase"],
    secondary: ["control", "entradas", "posicionamiento", "decisiones", "disciplina", "agilidad", "confianza", "presion_alta"],
  },
  CM: {
    primary:   ["pase", "resistencia", "vision", "decisiones", "presion_alta", "control"],
    secondary: ["velocidad", "disciplina", "concentracion", "tiro", "entradas", "liderazgo", "confianza", "aceleracion"],
  },
  AM: {
    primary:   ["vision", "pase", "control", "regate", "decisiones", "tiro"],
    secondary: ["velocidad", "aceleracion", "agilidad", "confianza", "presion", "concentracion", "ambicion", "resistencia"],
  },
  W: {
    primary:   ["velocidad", "regate", "aceleracion", "agilidad", "centros", "tiro"],
    secondary: ["control", "pase", "presion_alta", "confianza", "concentracion", "resistencia", "ambicion", "disciplina"],
  },
  ST: {
    primary:   ["tiro", "posicionamiento", "velocidad", "confianza", "cabeceo", "ambicion"],
    secondary: ["control", "regate", "fuerza", "salto", "presion", "concentracion", "aceleracion", "decisiones"],
  },
}

// ─── Base stats per position ──────────────────────────────────────────────────

export type FullStats = Record<StatKey, number>

export const BASE_STATS: Record<Position, FullStats> = {
  GK: {
    control: 45, pase: 50, tiro: 25, regate: 30, cabeceo: 40, centros: 30, entradas: 30, reflejos: 70,
    resistencia: 60, velocidad: 45, aceleracion: 40, fuerza: 65, salto: 65, agilidad: 45,
    posicionamiento: 70, vision: 55, decisiones: 65, presion_alta: 30, colocacion: 70,
    disciplina: 65, confianza: 50, presion: 65, liderazgo: 55, concentracion: 70, ambicion: 50,
  },
  CB: {
    control: 55, pase: 55, tiro: 35, regate: 40, cabeceo: 65, centros: 35, entradas: 65, reflejos: 30,
    resistencia: 65, velocidad: 55, aceleracion: 50, fuerza: 70, salto: 65, agilidad: 45,
    posicionamiento: 70, vision: 55, decisiones: 60, presion_alta: 50, colocacion: 35,
    disciplina: 70, confianza: 50, presion: 60, liderazgo: 60, concentracion: 65, ambicion: 50,
  },
  FB: {
    control: 60, pase: 60, tiro: 45, regate: 60, cabeceo: 50, centros: 65, entradas: 55, reflejos: 25,
    resistencia: 70, velocidad: 65, aceleracion: 65, fuerza: 55, salto: 50, agilidad: 60,
    posicionamiento: 60, vision: 55, decisiones: 55, presion_alta: 55, colocacion: 30,
    disciplina: 60, confianza: 50, presion: 55, liderazgo: 45, concentracion: 55, ambicion: 55,
  },
  CM: {
    control: 65, pase: 70, tiro: 55, regate: 55, cabeceo: 55, centros: 50, entradas: 55, reflejos: 25,
    resistencia: 75, velocidad: 55, aceleracion: 55, fuerza: 55, salto: 50, agilidad: 55,
    posicionamiento: 65, vision: 65, decisiones: 70, presion_alta: 65, colocacion: 30,
    disciplina: 65, confianza: 50, presion: 60, liderazgo: 55, concentracion: 60, ambicion: 60,
  },
  AM: {
    control: 70, pase: 70, tiro: 60, regate: 65, cabeceo: 50, centros: 50, entradas: 40, reflejos: 25,
    resistencia: 60, velocidad: 60, aceleracion: 60, fuerza: 50, salto: 50, agilidad: 65,
    posicionamiento: 60, vision: 70, decisiones: 65, presion_alta: 55, colocacion: 30,
    disciplina: 60, confianza: 55, presion: 55, liderazgo: 50, concentracion: 60, ambicion: 65,
  },
  W: {
    control: 70, pase: 60, tiro: 65, regate: 75, cabeceo: 50, centros: 65, entradas: 35, reflejos: 25,
    resistencia: 65, velocidad: 75, aceleracion: 72, fuerza: 50, salto: 50, agilidad: 70,
    posicionamiento: 60, vision: 60, decisiones: 60, presion_alta: 60, colocacion: 25,
    disciplina: 55, confianza: 55, presion: 50, liderazgo: 45, concentracion: 55, ambicion: 60,
  },
  ST: {
    control: 65, pase: 55, tiro: 75, regate: 65, cabeceo: 65, centros: 45, entradas: 35, reflejos: 25,
    resistencia: 65, velocidad: 68, aceleracion: 65, fuerza: 65, salto: 60, agilidad: 55,
    posicionamiento: 70, vision: 60, decisiones: 65, presion_alta: 55, colocacion: 25,
    disciplina: 60, confianza: 60, presion: 55, liderazgo: 50, concentracion: 60, ambicion: 70,
  },
}

// ─── Origins ──────────────────────────────────────────────────────────────────

export type OriginId = "academia" | "calle" | "atletico" | "tactico"

export type Origin = {
  id: OriginId
  nombre: string
  descripcion: string
  historia: string
  bonuses: Partial<Record<StatKey, number>>
  traitId: string   // trait that comes with this origin
  potencial: 1 | 2 | 3 | 4 | 5  // growth speed
}

export const ORIGINS: Origin[] = [
  {
    id: "academia",
    nombre: "Academia de Club",
    descripcion: "Formado desde joven en las inferiores de un club profesional.",
    historia: "Pasaste tu infancia y adolescencia en el campo de entrenamiento. Técnica depurada, mentalidad de profesional desde los 8 años.",
    bonuses: { control: 6, pase: 6, tiro: 4, regate: 4, cabeceo: 4, posicionamiento: 5, vision: 4, decisiones: 5 },
    traitId: "alto_potencial",
    potencial: 5,
  },
  {
    id: "calle",
    nombre: "Fútbol de Barrio",
    descripcion: "Aprendiste jugando en asfalto, sin entrenamientos reglados.",
    historia: "El fútbol de calle te forjó. Creatividad sin límites, instinto puro. Lo que te falta en táctica lo suplicas con genialidad.",
    bonuses: { regate: 10, confianza: 8, tiro: 6, agilidad: 6, presion: 5 },
    traitId: "improvisador",
    potencial: 3,
  },
  {
    id: "atletico",
    nombre: "Atleta Reconvertido",
    descripcion: "Venías de otro deporte. Físicamente superior a tus compañeros.",
    historia: "Atletismo, natación, artes marciales... tu cuerpo es una máquina. El fútbol llegó tarde pero tu físico marca la diferencia.",
    bonuses: { resistencia: 10, velocidad: 6, fuerza: 7, salto: 6, aceleracion: 5 },
    traitId: "fisico_excepcional",
    potencial: 2,
  },
  {
    id: "tactico",
    nombre: "Escuela Táctica",
    descripcion: "Entrenado por un técnico metódico. Cerebro antes que piernas.",
    historia: "Tu entrenador fue un táctico obsesivo. Cuadernos llenos de esquemas, vídeo-análisis desde los 12 años. Lees el juego como nadie.",
    bonuses: { vision: 8, decisiones: 7, concentracion: 7, posicionamiento: 6, liderazgo: 5, disciplina: 5 },
    traitId: "lector_del_juego",
    potencial: 4,
  },
]

// ─── Personalities ────────────────────────────────────────────────────────────

export type PersonalityId = "lider" | "profesional" | "rebelde" | "silencioso"

export type Personality = {
  id: PersonalityId
  nombre: string
  descripcion: string
  efecto: string
  matchBonus: {
    type: "flat" | "variance" | "pressure_bonus" | "consistent"
    value: number
  }
}

export const PERSONALITIES: Personality[] = [
  {
    id: "lider",
    nombre: "Líder",
    descripcion: "Naces para capitanear. Tu presencia eleva al equipo.",
    efecto: "Bonus en eventos de vestuario. En partidos con el equipo perdiendo: +2 al dado.",
    matchBonus: { type: "pressure_bonus", value: 2 },
  },
  {
    id: "profesional",
    nombre: "Profesional",
    descripcion: "Constante, metódico, sin altibajos.",
    efecto: "Menos volatilidad en el dado. El resultado mínimo sube (+3 al piso).",
    matchBonus: { type: "consistent", value: 3 },
  },
  {
    id: "rebelde",
    nombre: "Rebelde",
    descripcion: "Impredecible. Cuando te enciendes, nadie te para.",
    efecto: "Alta varianza: en cada turno el dado tiene ±5 adicional aleatorio.",
    matchBonus: { type: "variance", value: 5 },
  },
  {
    id: "silencioso",
    nombre: "Silencioso",
    descripcion: "Hablas con los pies. Bajo presión eres el más frío.",
    efecto: "En momentos de alta presión (equipo perdiendo, último turno): +3 al dado.",
    matchBonus: { type: "pressure_bonus", value: 3 },
  },
]

// ─── Play styles ──────────────────────────────────────────────────────────────

export type PlayStyle = {
  id: string
  label: string
  description: string
}

export const PLAY_STYLES: Record<Position, PlayStyle[]> = {
  GK: [
    { id: "shot_stopper",     label: "Shot Stopper",         description: "Especialista en paradas bajo los palos. Reflejos extraordinarios." },
    { id: "sweeper_keeper",   label: "Sweeper Keeper",        description: "Sales del área para cortar jugadas. Moderno y arriesgado." },
    { id: "distribuidor",     label: "Portero Distribuidor",  description: "Tu juego de pies inicia el ataque. Clave en la salida del equipo." },
  ],
  CB: [
    { id: "defensa_duro",     label: "Defensor Contundente",  description: "Físico, agresivo en las entradas. El rival te teme." },
    { id: "defensa_tecnico",  label: "Defensor Técnico",      description: "Anticipación y lectura del juego. Rara vez te superan en velocidad." },
    { id: "lider_defensivo",  label: "Líder Defensivo",       description: "El cerebro de la defensa. Organiza a los tuyos en cada acción." },
  ],
  FB: [
    { id: "lateral_ofensivo", label: "Lateral Ofensivo",      description: "Tu sitio está en el área rival. Centros y llegadas al área." },
    { id: "lateral_defensivo",label: "Lateral Defensivo",     description: "Primero defender. Sólido, seguro, sin riesgos innecesarios." },
    { id: "carrilero",        label: "Carrilero Total",        description: "Recorres la banda completa. Unes defensa y ataque sin descanso." },
  ],
  CM: [
    { id: "box_to_box",       label: "Box-to-Box",            description: "De área a área sin parar. El motor del equipo." },
    { id: "pivote",           label: "Mediocentro Defensivo", description: "Corta, recupera y protege la defensa. El filtro del equipo." },
    { id: "enganche",         label: "Enganche",              description: "Distribuyes el juego con visión. El director de orquesta." },
  ],
  AM: [
    { id: "mediapunta",       label: "Mediapunta Clásico",    description: "Entre líneas, buscas el espacio para hacer daño." },
    { id: "segunda_punta",    label: "Segunda Punta",         description: "Apareces en el área cuando el rival no espera. Gols y asistencias." },
    { id: "organizador",      label: "Organizador",           description: "El nexo entre medio y ataque. Visión y criterio." },
  ],
  W: [
    { id: "desbordador",      label: "Extremo Desbordador",   description: "El 1v1 es tu especialidad. Velocidad y regate puro." },
    { id: "interior",         label: "Extremo Interior",      description: "Recortas al centro y disparas. Peligroso con la pierna contraria." },
    { id: "extremo_trabajador",label: "Extremo Trabajador",   description: "Presionas, corres y centras. Menos goles, pero imprescindible." },
  ],
  ST: [
    { id: "nueve_clasico",    label: "Nueve Clásico",         description: "Vives del gol. Posicionamiento y remate son tu razón de ser." },
    { id: "falso_9",          label: "Falso 9",               description: "Bajas a recibir y creas más de lo que marcas. Impredecible." },
    { id: "ariete",           label: "Ariete",                description: "Potente, fuerte, aéreo. El delantero que los defensas odian." },
  ],
}

// ─── Traits ───────────────────────────────────────────────────────────────────

export type Trait = {
  id: string
  nombre: string
  descripcion: string
  efecto: string          // description for UI
  sourceable: boolean     // can be selected at creation
}

export const TRAITS: Trait[] = [
  // From origins (not selectable, given automatically)
  { id: "alto_potencial",      nombre: "Alto Potencial",        descripcion: "Creciste en una academia. Tu techo es más alto.",                     efecto: "+20% XP ganado por partido",                    sourceable: false },
  { id: "improvisador",        nombre: "Improvisador",          descripcion: "Aprendiste en la calle. La creatividad es tu arma.",                    efecto: "+3 al dado en situaciones de regate/1v1",       sourceable: false },
  { id: "fisico_excepcional",  nombre: "Físico Excepcional",    descripcion: "Tu cuerpo es tu mayor arma.",                                           efecto: "Fatiga acumula un 25% más lento",               sourceable: false },
  { id: "lector_del_juego",    nombre: "Lector del Juego",      descripcion: "Anticipas jugadas antes de que ocurran.",                               efecto: "+3 al dado en decisiones tácticas",             sourceable: false },
  // Selectable at creation (choose 1)
  { id: "goleador_nato",       nombre: "Goleador Nato",         descripcion: "El gol es tu lenguaje materno.",                                        efecto: "+4 al dado en situaciones de gol",              sourceable: true },
  { id: "killer_pass",         nombre: "Killer Pass",           descripcion: "Ves el pase que nadie más ve.",                                         efecto: "+4 al dado en asistencias y pases de último tercio", sourceable: true },
  { id: "jugador_de_presion",  nombre: "Jugador de Presión",    descripcion: "Cuando más aprieta el partido, más creces.",                            efecto: "+3 al dado cuando el equipo va perdiendo",      sourceable: true },
  { id: "velocista",           nombre: "Velocista",             descripcion: "Nadie te pilla cuando arrancas.",                                       efecto: "+5 velocidad efectiva en situaciones de sprint", sourceable: true },
  { id: "penalty_expert",      nombre: "Especialista en Penaltis", descripcion: "Los penaltis son tuyos.",                                             efecto: "Penaltis siempre resultan en gol",              sourceable: true },
  { id: "lider_vestuario",     nombre: "Líder del Vestuario",   descripcion: "Tu presencia cambia la energía del grupo.",                             efecto: "+8 moral del equipo tras cada victoria",        sourceable: true },
  { id: "polivalente",         nombre: "Polivalente",           descripcion: "Puedes jugar en varias posiciones sin perder nivel.",                   efecto: "Puedes actuar en una posición secundaria sin penalización", sourceable: true },
  { id: "mentalidad_acero",    nombre: "Mentalidad de Acero",   descripcion: "Las críticas te resbalan. Tu cabeza es tu mejor arma.",                 efecto: "Eventos de prensa no afectan negativamente a la moral", sourceable: true },
]

export const SELECTABLE_TRAITS = TRAITS.filter((t) => t.sourceable)

// ─── Foot dominance ───────────────────────────────────────────────────────────

export type DominantFoot = "derecho" | "izquierdo" | "ambidiestro"

export const FOOT_OPTIONS: { id: DominantFoot; label: string; bonus: Partial<Record<StatKey, number>> }[] = [
  { id: "derecho",      label: "Derecho",       bonus: {} },
  { id: "izquierdo",    label: "Izquierdo",     bonus: { regate: 3 } },       // left-footed rarity bonus
  { id: "ambidiestro",  label: "Ambidiestro",   bonus: { control: 4, regate: 2 } }, // harder to defend
]

// ─── Build full stat block from parts ────────────────────────────────────────

export function buildAttributes(
  position: Position,
  origin: OriginId,
  extraPoints: Partial<Record<StatKey, number>>,
  foot: DominantFoot,
): { tecnicos: Record<string, number>; fisicos: Record<string, number>; tacticos: Record<string, number>; mentales: Record<string, number> } {
  const base = BASE_STATS[position]
  const originDef = ORIGINS.find((o) => o.id === origin)!
  const footDef = FOOT_OPTIONS.find((f) => f.id === foot)!

  const merged: Record<StatKey, number> = {} as Record<StatKey, number>
  for (const s of ALL_STATS) {
    const val =
      (base[s.key] ?? 50) +
      (originDef.bonuses[s.key] ?? 0) +
      (footDef.bonus[s.key] ?? 0) +
      (extraPoints[s.key] ?? 0)
    merged[s.key] = Math.max(1, Math.min(99, val))
  }

  const tecnicos: Record<string, number> = {}
  const fisicos: Record<string, number> = {}
  const tacticos: Record<string, number> = {}
  const mentales: Record<string, number> = {}

  for (const s of ALL_STATS) {
    if (s.group === "tecnicos") tecnicos[s.key] = merged[s.key]
    else if (s.group === "fisicos") fisicos[s.key] = merged[s.key]
    else if (s.group === "tacticos") tacticos[s.key] = merged[s.key]
    else mentales[s.key] = merged[s.key]
  }

  return { tecnicos, fisicos, tacticos, mentales }
}

// ─── Position labels ──────────────────────────────────────────────────────────

export const POSITION_LABELS: Record<Position, string> = {
  GK: "Portero", CB: "Def. Central", FB: "Lateral",
  CM: "Mediocentro", AM: "Mediapunta", W: "Extremo", ST: "Delantero",
}

export const POSITIONS: { id: Position; label: string }[] = Object.entries(POSITION_LABELS).map(
  ([id, label]) => ({ id: id as Position, label })
)

export const NATIONALITIES = [
  "España", "Argentina", "Brasil", "Francia", "Alemania", "Italia", "Portugal",
  "Inglaterra", "México", "Colombia", "Uruguay", "Países Bajos", "Bélgica",
  "Croacia", "Senegal", "Marruecos", "Nigeria", "Costa Rica", "Chile", "Ecuador",
]

// ─── Stat display helpers ──────────────────────────────────────────────────────

export function getStatGroupedByPosition(position: Position): {
  primary: StatDefinition[]
  secondary: StatDefinition[]
} {
  const profile = POSITION_STAT_PROFILES[position]
  return {
    primary: profile.primary.map((k) => STAT_BY_KEY[k]),
    secondary: profile.secondary.map((k) => STAT_BY_KEY[k]),
  }
}

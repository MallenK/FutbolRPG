import {
  ALL_STATS,
  EXTRA_POINTS,
  FOOT_OPTIONS,
  MAX_PER_STAT,
  NATIONALITIES,
  ORIGINS,
  PERSONALITIES,
  PLAY_STYLES,
  POSITIONS,
  buildAttributes,
  getSelectableTraits,
  type DominantFoot,
  type OriginId,
  type Position,
  type StatKey,
} from "@/lib/player-config"

// Validación del alta de personaje (POST /api/player). Antes el servidor
// guardaba tal cual los `attributes` y hasta un `state` completo enviados por
// el cliente: con un POST a mano se creaba un jugador con 99 en todo o con
// historial de temporadas inventado. Ahora el cliente manda las elecciones
// del asistente y el servidor reconstruye los atributos con las mismas reglas.

export type RpgCreacion = {
  apellido?: string
  apodo?: string
  dorsal: number
  piernaDominante: DominantFoot
  altura: number
  peso: number
  age: number
  origen: OriginId
  personalidad: string
  estiloJuego: string
  traits: string[]
  potencial: number
  clubElegido?: string
  posicionesSecundarias: Position[]
}

export type CreacionValida = {
  name: string
  position: Position
  nationality: string
  divisionInicial: number
  attributes: ReturnType<typeof buildAttributes>
  rpg: RpgCreacion
  modoJuego: unknown
}

const str = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined

const intEntre = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : fallback

const esPosicion = (p: unknown): p is Position => POSITIONS.some((x) => x.id === p)

export function validarReparto(extra: unknown): Partial<Record<StatKey, number>> | { error: string } {
  if (extra === undefined || extra === null) return {}
  if (typeof extra !== "object" || Array.isArray(extra)) return { error: "extraPoints inválido" }
  const validKeys = new Set<string>(ALL_STATS.map((s) => s.key))
  const out: Partial<Record<StatKey, number>> = {}
  let total = 0
  for (const [key, value] of Object.entries(extra as Record<string, unknown>)) {
    if (!validKeys.has(key)) return { error: `Stat desconocido: ${key}` }
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_PER_STAT) {
      return { error: `Puntos fuera de rango en ${key}` }
    }
    total += value
    if (value > 0) out[key as StatKey] = value
  }
  if (total > EXTRA_POINTS) return { error: `Solo hay ${EXTRA_POINTS} puntos para repartir` }
  return out
}

export function validarCreacion(body: Record<string, unknown>): CreacionValida | { error: string } {
  const name = str(body.name, 60)
  if (!name) return { error: "Faltan campos obligatorios" }

  const position = body.position
  if (!esPosicion(position)) return { error: "Posición inválida" }

  const reparto = validarReparto(body.extraPoints)
  if ("error" in reparto) return reparto

  const rpg = (typeof body.rpg === "object" && body.rpg !== null ? body.rpg : {}) as Record<string, unknown>

  const origin = ORIGINS.find((o) => o.id === rpg.origen) ?? ORIGINS[0]
  const foot = (FOOT_OPTIONS.find((f) => f.id === rpg.piernaDominante) ?? FOOT_OPTIONS[0]).id

  // Rasgos: el del origen siempre, más uno elegible para la posición.
  const elegibles = getSelectableTraits(position).map((t) => t.id)
  const pedidos = Array.isArray(rpg.traits) ? rpg.traits.filter((t) => typeof t === "string") as string[] : []
  const elegido = pedidos.find((t) => elegibles.includes(t)) ?? elegibles[0]

  const estilos = PLAY_STYLES[position].map((e) => e.id)
  const secundarias = Array.isArray(rpg.posicionesSecundarias)
    ? (rpg.posicionesSecundarias.filter((p) => esPosicion(p) && p !== position) as Position[]).slice(0, 1)
    : []

  const nacionalidadPedida = typeof body.nationality === "string" ? body.nationality : ""
  const nationality = NATIONALITIES.includes(nacionalidadPedida) ? nacionalidadPedida : "España"

  const personalidad = typeof rpg.personalidad === "string" && PERSONALITIES.some((p) => p.id === rpg.personalidad)
    ? rpg.personalidad
    : "profesional"
  const estiloJuego = typeof rpg.estiloJuego === "string" && estilos.includes(rpg.estiloJuego) ? rpg.estiloJuego : ""

  return {
    name,
    position,
    nationality,
    divisionInicial: intEntre(body.divisionInicial, 1, 5, 3),
    attributes: buildAttributes(position, origin.id, reparto, foot),
    modoJuego: body.modoJuego,
    rpg: {
      apellido: str(rpg.apellido, 30),
      apodo: str(rpg.apodo, 30),
      dorsal: intEntre(rpg.dorsal, 1, 99, 10),
      piernaDominante: foot,
      altura: intEntre(rpg.altura, 150, 215, 180),
      peso: intEntre(rpg.peso, 50, 110, 75),
      age: intEntre(rpg.age, 16, 40, 18),
      origen: origin.id,
      personalidad,
      estiloJuego,
      traits: [origin.traitId, elegido].filter(Boolean),
      potencial: origin.potencial,
      clubElegido: str(rpg.clubElegido, 60),
      posicionesSecundarias: secundarias,
    },
  }
}

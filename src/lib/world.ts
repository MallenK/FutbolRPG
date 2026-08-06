export type Division = 1 | 2 | 3 | 4 | 5

export type DivisionInfo = {
  nivel: Division
  nombre: string       // display name
  nombreCorto: string  // short label
  clubes: string[]     // 10 clubs
}

export const MUNDO: Record<Division, DivisionInfo> = {
  1: {
    nivel: 1,
    nombre: "Tercera Federación",
    nombreCorto: "3ª Fed.",
    clubes: [
      "CD Comarca",
      "UD San Marcos",
      "CF Valle Verde",
      "AD Portillera",
      "SD Norteña",
      "CF Los Pinos",
      "CD Ribera",
      "UD Montaña",
      "CF Sureste",
      "AD Campiña",
    ],
  },
  2: {
    nivel: 2,
    nombre: "Primera Federación",
    nombreCorto: "1ª Fed.",
    clubes: [
      "SD Ponferradina",
      "Real Zaragoza",
      "CD Castellón",
      "CF Extremadura",
      "UD Las Palmas B",
      "Racing de Santander",
      "CD Numancia",
      "CF Talavera",
      "UD Logroñés",
      "Linares Deportivo",
    ],
  },
  3: {
    nivel: 3,
    nombre: "Segunda División",
    nombreCorto: "2ª Div.",
    clubes: [
      "Rayo Vallecano",
      "Getafe CF",
      "UD Almería",
      "CD Leganés",
      "Deportivo Alavés",
      "Girona FC",
      "Real Valladolid",
      "Levante UD",
      "CD Tenerife",
      "Málaga CF",
    ],
  },
  4: {
    nivel: 4,
    nombre: "Primera División",
    nombreCorto: "1ª Div.",
    clubes: [
      "Real Madrid",
      "FC Barcelona",
      "Atlético de Madrid",
      "Sevilla FC",
      "Valencia CF",
      "Villarreal CF",
      "Real Betis",
      "Athletic Club",
      "Real Sociedad",
      "Celta de Vigo",
    ],
  },
  5: {
    nivel: 5,
    nombre: "Champions League",
    nombreCorto: "UCL",
    clubes: [
      "Manchester City",
      "Bayern München",
      "Paris Saint-Germain",
      "Liverpool FC",
      "Inter de Milán",
      "Borussia Dortmund",
      "Chelsea FC",
      "Juventus",
      "Ajax",
      "Benfica",
    ],
  },
}

export function getDivisionInfo(nivel: number): DivisionInfo {
  const n = Math.max(1, Math.min(5, nivel)) as Division
  return MUNDO[n]
}

export function getRivales(division: number, clubActual: string): string[] {
  const info = getDivisionInfo(division)
  return info.clubes.filter((c) => c !== clubActual)
}

export function getDefaultClub(division: number): string {
  return getDivisionInfo(division).clubes[0]
}

// ─── Ascenso / descenso de división ────────────────────────────────────────────
// El resto de la liga no se simula partido a partido (los rivales no juegan entre
// sí en este motor) — para poder colocar al jugador en una clasificación final
// real, se generan resultados plausibles para los demás clubes de su división.

export type TablaEntry = { club: string; puntos: number; esJugador: boolean }

export function calcularPuntosLiga(fixtures: { jugado: boolean; resultado: string | null }[]): number {
  let puntos = 0
  for (const f of fixtures) {
    if (!f.jugado || !f.resultado) continue
    const [misGoles, golesRival] = f.resultado.split("-").map((n) => parseInt(n, 10) || 0)
    puntos += misGoles > golesRival ? 3 : misGoles === golesRival ? 1 : 0
  }
  return puntos
}

export function simularTablaFinal(division: Division, clubJugador: string, puntosJugador: number): TablaEntry[] {
  const info = getDivisionInfo(division)
  const rivales = info.clubes.filter((c) => c !== clubJugador)
  const tabla: TablaEntry[] = [{ club: clubJugador, puntos: puntosJugador, esJugador: true }]
  for (const rival of rivales) {
    // 16 partidos fantasma con probabilidades de resultado realistas (40% victoria / 30% empate / 30% derrota)
    let puntos = 0
    for (let i = 0; i < 16; i++) {
      const r = Math.random()
      puntos += r < 0.4 ? 3 : r < 0.7 ? 1 : 0
    }
    tabla.push({ club: rival, puntos, esJugador: false })
  }
  return tabla.sort((a, b) => b.puntos - a.puntos)
}

export function resolverAscensoDescenso(
  division: Division,
  posicion: number,
  totalEquipos: number,
): { nuevaDivision: Division; resultado: "ascenso" | "descenso" | "ninguno" } {
  if (posicion <= 2 && division < 5) return { nuevaDivision: (division + 1) as Division, resultado: "ascenso" }
  if (posicion > totalEquipos - 2 && division > 1) return { nuevaDivision: (division - 1) as Division, resultado: "descenso" }
  return { nuevaDivision: division, resultado: "ninguno" }
}


// ─── Copa del Rey ─────────────────────────────────────────────────────────────

export const COPA_RONDAS = ["R32", "R16", "QF", "SF", "F"] as const
export type CopaRonda = typeof COPA_RONDAS[number]

export type CopaHistorialEntry = { ronda: string; rival: string; ganado: boolean; resultado: string }

export type CopaState = {
  rondaIdx: number
  rival: string
  esLocal: boolean
  eliminado: boolean
  campeon: boolean
  historial: CopaHistorialEntry[]
}

// Opponents per round (index 0=R32 … 4=Final), escalating difficulty
const COPA_RIVAL_POOLS: string[][] = [
  ["SD Eibar", "Barakaldo CF", "CD Lugo", "CF Teruel", "SD Huesca B", "UD Logroñés", "Sestao River", "CF Talavera"],
  ["SD Ponferradina", "Real Zaragoza", "CD Numancia", "Racing de Santander", "CF Extremadura", "Linares Deportivo"],
  ["Rayo Vallecano", "Girona FC", "Levante UD", "CD Tenerife", "Real Valladolid", "Deportivo Alavés", "Getafe CF"],
  ["Sevilla FC", "Valencia CF", "Real Betis", "Athletic Club", "Celta de Vigo", "Villarreal CF", "Real Sociedad"],
  ["Real Madrid", "FC Barcelona", "Atlético de Madrid", "Bayern München", "Manchester City"],
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateCopaState(): CopaState {
  return {
    rondaIdx: 0,
    rival: pickRandom(COPA_RIVAL_POOLS[0]),
    esLocal: Math.random() < 0.5,
    eliminado: false,
    campeon: false,
    historial: [],
  }
}

export function advanceCopa(copa: CopaState, ganado: boolean, resultado: string): CopaState {
  const rondaName = COPA_RONDAS[copa.rondaIdx] ?? "R32"
  const newHistorial: CopaHistorialEntry[] = [
    ...copa.historial,
    { ronda: rondaName, rival: copa.rival, ganado, resultado },
  ]
  if (!ganado) return { ...copa, eliminado: true, historial: newHistorial }

  const nextRondaIdx = copa.rondaIdx + 1
  if (nextRondaIdx >= COPA_RONDAS.length) {
    return { ...copa, campeon: true, rondaIdx: nextRondaIdx, historial: newHistorial }
  }
  const pool = COPA_RIVAL_POOLS[nextRondaIdx] ?? COPA_RIVAL_POOLS[4]
  return {
    ...copa,
    rondaIdx: nextRondaIdx,
    rival: pickRandom(pool),
    esLocal: Math.random() < 0.5,
    historial: newHistorial,
  }
}

// ─── European competitions ────────────────────────────────────────────────────

export type EuropaCompeticion = "champions" | "europa" | "conference"

export type EuropaGrupoPartido = {
  idx: number
  rival: string
  esLocal: boolean
  jugado: boolean
  resultado?: string
  golesJugador?: number
  golesRival?: number
  valoracion?: number
  ganado?: boolean
  empate?: boolean
}

export type EuropaState = {
  competicion: EuropaCompeticion
  grupoPartidos: EuropaGrupoPartido[]
  grupoStats: { G: number; E: number; P: number; PTS: number; GF: number; GC: number }
  clasificado: boolean
  eliminatoria?: {
    rondaIdx: number
    rival: string
    esLocal: boolean
    jugado: boolean
    resultado?: string
    ganado?: boolean
    eliminado?: boolean
    campeon?: boolean
    historial: CopaHistorialEntry[]
  }
}

export const EUROPA_COMPETICION_LABELS: Record<EuropaCompeticion, string> = {
  champions: "UEFA Champions League",
  europa: "UEFA Europa League",
  conference: "UEFA Conference League",
}

// Las 3 competiciones terminan en "League" — no se puede abreviar cogiendo la
// última palabra del label largo (ver informe-fallos.md M1), hace falta un mapa explícito.
export const EUROPA_COMPETICION_ABBR: Record<EuropaCompeticion, string> = {
  champions: "UCL",
  europa: "UEL",
  conference: "UECL",
}

const EUROPA_RIVAL_POOLS: Record<EuropaCompeticion, string[]> = {
  champions: ["Manchester City", "Bayern München", "Liverpool FC", "Inter de Milán", "Borussia Dortmund", "Chelsea FC", "Juventus", "Ajax", "Benfica", "Porto"],
  europa: ["Bayer Leverkusen", "AS Roma", "Lyon", "PSV Eindhoven", "Feyenoord", "Fenerbahçe", "Braga", "Galatasaray", "Rangers FC", "Atalanta"],
  conference: ["Fiorentina", "Real Betis", "Aberdeen FC", "Slavia Praga", "Olympiakos", "Gent", "AZ Alkmaar", "FK Bodø/Glimt", "HJK Helsinki", "Djurgårdens IF"],
}

export function getEuropaCompeticion(division: Division): EuropaCompeticion | null {
  if (division >= 5) return "champions"
  if (division >= 4) return "europa"
  if (division >= 3) return "conference"
  return null
}

export function generateEuropaState(division: Division): EuropaState | null {
  const competicion = getEuropaCompeticion(division)
  if (!competicion) return null

  const pool = [...EUROPA_RIVAL_POOLS[competicion]]
  const rivals: string[] = []
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    rivals.push(pool.splice(idx, 1)[0])
  }

  // 6 matches: alternating home/away vs 3 rivals (H-A-H-A-H-A pattern)
  const grupoPartidos: EuropaGrupoPartido[] = rivals.flatMap((rival, i) => [
    { idx: i * 2,     rival, esLocal: true,  jugado: false },
    { idx: i * 2 + 1, rival, esLocal: false, jugado: false },
  ])

  return {
    competicion,
    grupoPartidos,
    grupoStats: { G: 0, E: 0, P: 0, PTS: 0, GF: 0, GC: 0 },
    clasificado: false,
  }
}

export function advanceEuropaGrupo(
  europa: EuropaState,
  idx: number,
  ganado: boolean,
  empate: boolean,
  golesEquipo: number,
  golesRival: number,
  resultado: string,
  valoracion: number,
): EuropaState {
  const newPartidos = europa.grupoPartidos.map((p) =>
    p.idx === idx
      ? { ...p, jugado: true, resultado, golesJugador: ganado ? 1 : 0, golesRival, valoracion, ganado, empate }
      : p
  )
  const s = europa.grupoStats
  const newStats = {
    G: s.G + (ganado ? 1 : 0),
    E: s.E + (empate ? 1 : 0),
    P: s.P + (!ganado && !empate ? 1 : 0),
    PTS: s.PTS + (ganado ? 3 : empate ? 1 : 0),
    GF: s.GF + golesEquipo,
    GC: s.GC + golesRival,
  }

  const allPlayed = newPartidos.every((p) => p.jugado)
  const clasificado = allPlayed && newStats.PTS >= 7

  let newEuropa: EuropaState = {
    ...europa,
    grupoPartidos: newPartidos,
    grupoStats: newStats,
    clasificado: clasificado || europa.clasificado,
  }

  if (clasificado && !europa.eliminatoria) {
    const pool = EUROPA_RIVAL_POOLS[europa.competicion]
    newEuropa = {
      ...newEuropa,
      eliminatoria: {
        rondaIdx: 0,
        rival: pickRandom(pool),
        esLocal: Math.random() < 0.5,
        jugado: false,
        historial: [],
      },
    }
  }

  return newEuropa
}

// ─── Selección Nacional ────────────────────────────────────────────────────────

export const SELECCION_MIN_REPUTACION = 35
export const SELECCION_MIN_DIVISION = 3

export type SeleccionPartido = {
  idx: number
  rival: string
  esLocal: boolean
  tipo: "amistoso" | "clasificacion" | "torneo"
  jugado: boolean
  resultado?: string
  golesJugador?: number
  ganado?: boolean
  empate?: boolean
}

export type SeleccionTorneo = {
  tipo: "eurocopa" | "mundial"
  fase: "grupos" | "eliminatoria" | "finalizado"
  grupoPartidos: SeleccionPartido[]
  grupoStats: { G: number; E: number; P: number; PTS: number }
  clasificado: boolean
  campeon: boolean
  eliminatoria?: {
    rondaIdx: number
    rival: string
    esLocal: boolean
    jugado: boolean
    ganado?: boolean
    eliminado?: boolean
    campeon?: boolean
    historial: CopaHistorialEntry[]
  }
}

export type SeleccionParon = {
  activo: boolean
  partidos: SeleccionPartido[]
  partidosJugados: number
}

export type SeleccionState = {
  convocado: boolean
  capas: number
  golesSeleccion: number
  paron?: SeleccionParon
  torneo?: SeleccionTorneo
}

const SELECCION_RIVALES_AMISTOSO = [
  "Francia", "Alemania", "Italia", "Portugal", "Países Bajos",
  "Bélgica", "Croacia", "Suiza", "Austria", "Dinamarca",
]
const SELECCION_RIVALES_CLASIFICACION = [
  "Rumanía", "Noruega", "Grecia", "Turquía", "Hungría",
  "Albania", "Suecia", "Escocia", "Irlanda", "República Checa",
]
const SELECCION_RIVALES_TORNEO = [
  "Francia", "Alemania", "Italia", "Portugal", "Países Bajos",
  "Bélgica", "Croacia", "Inglaterra", "Brasil", "Argentina",
  "Uruguay", "Colombia", "Marruecos", "Senegal",
]

export function getTorneoTipo(temporada: number): "eurocopa" | "mundial" | null {
  if (temporada % 4 === 2) return "eurocopa"
  if (temporada % 4 === 0) return "mundial"
  return null
}

export function generateSeleccionParon(temporada: number): SeleccionParon {
  const torneoTipo = getTorneoTipo(temporada)
  const tipo = torneoTipo ? "clasificacion" : "amistoso"
  const pool = tipo === "clasificacion"
    ? [...SELECCION_RIVALES_CLASIFICACION]
    : [...SELECCION_RIVALES_AMISTOSO]
  const r1idx = Math.floor(Math.random() * pool.length)
  const rival1 = pool.splice(r1idx, 1)[0]
  const rival2 = pool[Math.floor(Math.random() * pool.length)]
  return {
    activo: true,
    partidosJugados: 0,
    partidos: [
      { idx: 0, rival: rival1, esLocal: Math.random() < 0.5, tipo, jugado: false },
      { idx: 1, rival: rival2, esLocal: Math.random() < 0.5, tipo, jugado: false },
    ],
  }
}

export function advanceSeleccionParon(
  paron: SeleccionParon,
  ganado: boolean,
  empate: boolean,
  resultado: string,
  golesJugador: number,
): SeleccionParon {
  const nextIdx = paron.partidos.findIndex((p) => !p.jugado)
  if (nextIdx === -1) return { ...paron, activo: false }
  const newPartidos = paron.partidos.map((p, i) =>
    i === nextIdx ? { ...p, jugado: true, resultado, ganado, empate, golesJugador } : p
  )
  const newJugados = paron.partidosJugados + 1
  const allDone = newPartidos.every((p) => p.jugado)
  return { ...paron, partidos: newPartidos, partidosJugados: newJugados, activo: !allDone }
}

export function generateSeleccionTorneo(tipo: "eurocopa" | "mundial"): SeleccionTorneo {
  const pool = [...SELECCION_RIVALES_TORNEO]
  const rivals: string[] = []
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    rivals.push(pool.splice(idx, 1)[0])
  }
  const grupoPartidos: SeleccionPartido[] = rivals.flatMap((rival, i) => [
    { idx: i * 2,     rival, esLocal: true,  tipo: "torneo" as const, jugado: false },
    { idx: i * 2 + 1, rival, esLocal: false, tipo: "torneo" as const, jugado: false },
  ])
  return {
    tipo,
    fase: "grupos",
    grupoPartidos,
    grupoStats: { G: 0, E: 0, P: 0, PTS: 0 },
    clasificado: false,
    campeon: false,
  }
}

export function advanceSeleccionTorneoGrupo(
  torneo: SeleccionTorneo,
  idx: number,
  ganado: boolean,
  empate: boolean,
  resultado: string,
  golesJugador: number,
): SeleccionTorneo {
  const newPartidos = torneo.grupoPartidos.map((p) =>
    p.idx === idx ? { ...p, jugado: true, resultado, ganado, empate, golesJugador } : p
  )
  const s = torneo.grupoStats
  const newStats = {
    G: s.G + (ganado ? 1 : 0),
    E: s.E + (empate ? 1 : 0),
    P: s.P + (!ganado && !empate ? 1 : 0),
    PTS: s.PTS + (ganado ? 3 : empate ? 1 : 0),
  }
  const allPlayed = newPartidos.every((p) => p.jugado)
  const clasificado = allPlayed && newStats.PTS >= 5
  let newTorneo: SeleccionTorneo = {
    ...torneo, grupoPartidos: newPartidos, grupoStats: newStats,
    clasificado: clasificado || torneo.clasificado,
  }
  if (allPlayed && clasificado && !torneo.eliminatoria) {
    newTorneo = {
      ...newTorneo, fase: "eliminatoria",
      eliminatoria: {
        rondaIdx: 0, rival: pickRandom(SELECCION_RIVALES_TORNEO),
        esLocal: false, jugado: false, historial: [],
      },
    }
  } else if (allPlayed && !clasificado) {
    newTorneo = { ...newTorneo, fase: "finalizado" }
  }
  return newTorneo
}

export function advanceSeleccionTorneoEliminatoria(
  torneo: SeleccionTorneo,
  ganado: boolean,
  resultado: string,
): SeleccionTorneo {
  if (!torneo.eliminatoria) return torneo
  const el = torneo.eliminatoria
  const rondaNames = ["QF", "SF", "F"]
  const rondaName = rondaNames[el.rondaIdx] ?? "QF"
  const newHistorial: CopaHistorialEntry[] = [
    ...el.historial,
    { ronda: rondaName, rival: el.rival, ganado, resultado },
  ]
  if (!ganado) {
    return { ...torneo, fase: "finalizado", campeon: false, eliminatoria: { ...el, jugado: true, ganado: false, eliminado: true, historial: newHistorial } }
  }
  const nextRondaIdx = el.rondaIdx + 1
  if (nextRondaIdx >= rondaNames.length) {
    return { ...torneo, fase: "finalizado", campeon: true, eliminatoria: { ...el, jugado: true, ganado: true, campeon: true, historial: newHistorial } }
  }
  return {
    ...torneo,
    eliminatoria: {
      ...el, rondaIdx: nextRondaIdx,
      rival: pickRandom(SELECCION_RIVALES_TORNEO.filter((r) => r !== el.rival)),
      esLocal: false, jugado: false, ganado: undefined,
      historial: newHistorial,
    },
  }
}

// ─── Transfer Market ──────────────────────────────────────────────────────────

export type TransferOffer = {
  id: string
  club: string
  liga: string
  division: number
  rolOfrecido: string
  expiraJornada: number
}

export type MercadoState = {
  enLista: boolean
  ofertasActivas: TransferOffer[]
  ultimaActualizacion: number
}

export function generateTransferOffers(
  reputacion: number,
  divisionActual: number,
  currentClub: string,
  jornadaActual: number,
): TransferOffer[] {
  const offers: TransferOffer[] = []
  const ts = Date.now()

  if (reputacion >= 20) {
    const sameDiv = getDivisionInfo(divisionActual)
    const clubs = sameDiv.clubes.filter((c) => c !== currentClub)
    offers.push({
      id: `offer_${ts}_1`,
      club: pickRandom(clubs),
      liga: sameDiv.nombre,
      division: divisionActual,
      rolOfrecido: reputacion >= 50 ? "Titular" : "Rotación",
      expiraJornada: jornadaActual + 4,
    })
  }

  if (reputacion >= 40 && divisionActual < 5) {
    const higherDiv = getDivisionInfo((divisionActual + 1) as Division)
    offers.push({
      id: `offer_${ts}_2`,
      club: pickRandom(higherDiv.clubes),
      liga: higherDiv.nombre,
      division: divisionActual + 1,
      rolOfrecido: "Rotación",
      expiraJornada: jornadaActual + 4,
    })
  }

  if (reputacion >= 70) {
    const topDiv = getDivisionInfo(5)
    offers.push({
      id: `offer_${ts}_3`,
      club: pickRandom(topDiv.clubes),
      liga: topDiv.nombre,
      division: 5,
      rolOfrecido: "Reserva",
      expiraJornada: jornadaActual + 3,
    })
  }

  return offers
}

// ─── Contrato ─────────────────────────────────────────────────────────────────

export type ContratoState = {
  temporadasRestantes: number
  salarioRelativo: number
}

export function generateContrato(division: number): ContratoState {
  return {
    temporadasRestantes: 2,
    salarioRelativo: Math.max(1, Math.min(5, division - 1)),
  }
}

export function advanceEuropaEliminatoria(
  europa: EuropaState,
  ganado: boolean,
  resultado: string,
): EuropaState {
  if (!europa.eliminatoria) return europa
  const el = europa.eliminatoria
  const rondaNames = ["R16", "QF", "SF", "F"]
  const rondaName = rondaNames[el.rondaIdx] ?? "R16"
  const newHistorial: CopaHistorialEntry[] = [
    ...el.historial,
    { ronda: rondaName, rival: el.rival, ganado, resultado },
  ]

  if (!ganado) {
    return { ...europa, eliminatoria: { ...el, jugado: true, ganado: false, eliminado: true, historial: newHistorial } }
  }

  const nextRondaIdx = el.rondaIdx + 1
  if (nextRondaIdx >= rondaNames.length) {
    return { ...europa, eliminatoria: { ...el, jugado: true, ganado: true, campeon: true, historial: newHistorial } }
  }

  const pool = EUROPA_RIVAL_POOLS[europa.competicion]
  return {
    ...europa,
    eliminatoria: {
      ...el,
      rondaIdx: nextRondaIdx,
      rival: pickRandom(pool.filter((r) => r !== el.rival)),
      esLocal: Math.random() < 0.5,
      jugado: false,
      resultado: undefined,
      ganado: undefined,
      historial: newHistorial,
    },
  }
}

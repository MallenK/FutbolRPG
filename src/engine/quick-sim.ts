// Simulador de partido "rápido": resuelve un partido entero de un tirón a
// partir de la media de atributos del jugador (sin jugarlo turno a turno),
// para el modo de juego "decisivos"/"simulado" -- ver ROADMAP, control de
// velocidad de la partida. Es deliberadamente aproximado: no reemplaza al
// motor interactivo, solo da un resultado plausible e instantáneo.

export type Attributes = {
  tecnicos: Record<string, number>
  fisicos: Record<string, number>
  tacticos: Record<string, number>
  mentales: Record<string, number>
}

export type QuickSimResult = {
  matchStats: {
    goles: number
    asistencias: number
    valoracion: number
    marcador: string
    tarjetasAmarillas: number
    tarjetasRojas: number
  }
  ganado: boolean
  golesRival: number
  expulsado: boolean
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

const overallDe = (attrs: Attributes): number => {
  const valores = [
    ...Object.values(attrs.tecnicos ?? {}),
    ...Object.values(attrs.fisicos ?? {}),
    ...Object.values(attrs.tacticos ?? {}),
    ...Object.values(attrs.mentales ?? {}),
  ]
  if (valores.length === 0) return 50
  return valores.reduce((a, b) => a + b, 0) / valores.length
}

const ATACANTES = new Set(["ST", "W", "AM"])

export const simularResultadoPartido = (
  position: string,
  attrs: Attributes,
  forma: number,
  fatiga: number,
): QuickSimResult => {
  const overall = overallDe(attrs)

  const skillFactor = (overall - 60) / 8
  const formaFactor = (forma - 50) / 25
  const fatigaFactor = -fatiga / 100
  const random = (Math.random() - 0.5) * 3

  const valoracion = clamp(6.0 + skillFactor + formaFactor + fatigaFactor + random, 3.0, 10.0)

  const esAtacante = ATACANTES.has(position)
  const esPortero = position === "GK"

  const probGol = esPortero ? 0 : clamp((valoracion - (esAtacante ? 5.5 : 7)) * (esAtacante ? 0.18 : 0.07), 0, 0.65)
  const golesJugador = Math.random() < probGol ? (Math.random() < 0.12 ? 2 : 1) : 0
  const probAsistencia = esPortero ? 0 : clamp((valoracion - 6.5) * 0.1, 0, 0.3)
  const asistencias = golesJugador === 0 && Math.random() < probAsistencia ? 1 : 0

  const probVictoria = clamp(0.32 + (valoracion - 6.0) * 0.13, 0.08, 0.82)
  const probEmpate = 0.22
  const roll = Math.random()
  const ganado = roll < probVictoria
  const empate = !ganado && roll < probVictoria + probEmpate

  const golesCompaneros = Math.floor(Math.random() * 2)
  // Al menos 1 gol propio si se gana -- de lo contrario un "0-0 ganado" sería incoherente.
  const golesEquipo = ganado ? Math.max(1, golesJugador + golesCompaneros) : golesJugador + golesCompaneros
  const golesRival = ganado
    ? Math.max(0, golesEquipo - 1 - Math.floor(Math.random() * 2))
    : empate
      ? golesEquipo
      : golesEquipo + 1 + Math.floor(Math.random() * 2)

  const probAmarilla = clamp(0.16 - (valoracion - 6) * 0.02, 0.04, 0.25)
  const tarjetasAmarillas = Math.random() < probAmarilla ? 1 : 0
  const probRoja = valoracion < 4.5 ? 0.08 : 0.015
  const tarjetasRojas = Math.random() < probRoja ? 1 : 0

  return {
    matchStats: {
      goles: golesJugador,
      asistencias,
      valoracion: Math.round(valoracion * 10) / 10,
      marcador: `${golesEquipo}-${golesRival}`,
      tarjetasAmarillas,
      tarjetasRojas,
    },
    ganado,
    golesRival,
    expulsado: tarjetasRojas > 0,
  }
}

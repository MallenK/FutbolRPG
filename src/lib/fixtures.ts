// Calendario de liga: 8 rivales × ida y vuelta = 16 jornadas. Antes el tipo y
// el generador estaban copiados en season/init, season/end, match-save,
// resolve-sancion y auto-advance.

export type Fixture = {
  jornada: number
  rival: string
  esLocal: boolean
  jugado: boolean
  resultado: string | null
  golesJugador: number
  valoracion: number | null
}

export const JORNADAS_LIGA = 16

// Fisher-Yates. El `sort(() => Math.random() - 0.5)` anterior no produce un
// orden uniforme: depende del algoritmo de ordenación del motor JS y tiende a
// dejar los elementos cerca de su posición original (ida y vuelta seguidas).
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function generateFixtures(rivals: string[], random: () => number = Math.random): Fixture[] {
  const opponents = rivals.slice(0, JORNADAS_LIGA / 2)
  const raw: Omit<Fixture, "jornada">[] = []
  for (const rival of opponents) {
    raw.push({ rival, esLocal: true, jugado: false, resultado: null, golesJugador: 0, valoracion: null })
    raw.push({ rival, esLocal: false, jugado: false, resultado: null, golesJugador: 0, valoracion: null })
  }
  return shuffle(raw, random).map((f, i) => ({ ...f, jornada: i + 1 }))
}

// La liga está terminada cuando hay calendario y no queda ningún partido sin
// jugar. Copa y Europa pueden quedar a medias: cerrarlas es decisión del
// usuario (informe-fallos.md, Ronda 1, A1).
export function ligaTerminada(fixtures: Pick<Fixture, "jugado">[] | undefined): boolean {
  return !!fixtures && fixtures.length > 0 && fixtures.every((f) => f.jugado)
}

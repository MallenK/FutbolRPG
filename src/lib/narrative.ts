type MatchNarrativeParams = {
  playerName: string
  playerPosition: string
  minuto: number
  situacion: string
  accion: string
  dado: number
  resultado: string
  narrativoBase: string
  gol: boolean
}

type EventNarrativeParams = {
  playerName: string
  playerPosition: string
  club: string
  rol: string
  eventTipo: string
  eventDesc: string
  opcionTexto: string
  narrativoBase: string
}

type SeasonNarrativeParams = {
  playerName: string
  playerPosition: string
  club: string
  rol: string
  temporada: number
  age: number
  goles: number
  asistencias: number
  valoracionMedia: number
  premios: string[]
  subioRol: boolean
  torneoSeleccion?: string | null
  campeonSeleccion?: boolean
}

async function fetchNarrative(body: object): Promise<string | null> {
  try {
    const res = await fetch("/api/ai/narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const { narrative } = await res.json()
    return narrative ?? null
  } catch {
    return null
  }
}

export function getMatchNarrative(params: MatchNarrativeParams): Promise<string | null> {
  return fetchNarrative({ type: "match", ...params })
}

export function getEventNarrative(params: EventNarrativeParams): Promise<string | null> {
  return fetchNarrative({ type: "event", ...params })
}

export function getSeasonNarrative(params: SeasonNarrativeParams): Promise<string | null> {
  return fetchNarrative({ type: "season", ...params })
}

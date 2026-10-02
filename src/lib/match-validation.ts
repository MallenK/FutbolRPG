import type { Fixture } from "@/lib/fixtures"
import type { CopaState, EuropaState, SeleccionState } from "@/lib/world"

// Validación de lo que llega a /api/match/save. El motor de partido
// interactivo corre en el navegador, así que el servidor no puede recalcular
// el resultado; lo que sí puede es (1) recortar cada valor a un rango posible
// en un partido real, (2) ignorar cualquier campo de estado que no sea la
// fatiga y (3) negarse a guardar un partido que no está pendiente. Antes el
// body se mezclaba tal cual sobre player.state: bastaba un POST a mano con
// `updatedState.carrera.historialTemporadas` para encabezar el ranking.

export const TIPOS_PARTIDO = ["liga", "copa", "europa", "seleccion", "seleccion_torneo"] as const
export type TipoPartido = (typeof TIPOS_PARTIDO)[number]

export type MatchStatsSaneadas = {
  goles: number
  asistencias: number
  valoracion: number
  marcador: string
  tarjetasAmarillas: number
  tarjetasRojas: number
}

export type MatchSaveSaneado = {
  tipo: TipoPartido
  matchStats: MatchStatsSaneadas
  ganado: boolean
  expulsado: boolean
  fatiga: number | undefined
  matchId: string | undefined
}

// Máximos generosos pero posibles: un partido de 90 minutos del motor no
// produce más de ~6 goles del jugador; 15 deja margen sin permitir 999.
const MAX_GOLES_JUGADOR = 15
const MAX_GOLES_EQUIPO = 20

const num = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback

const intEntre = (v: unknown, min: number, max: number, fallback = min): number =>
  Math.max(min, Math.min(max, Math.round(num(v, fallback))))

export function sanearMarcador(v: unknown): { marcador: string; propios: number; rival: number } {
  const m = typeof v === "string" ? /^(\d{1,2})-(\d{1,2})$/.exec(v.trim()) : null
  const propios = m ? Math.min(MAX_GOLES_EQUIPO, Number(m[1])) : 0
  const rival = m ? Math.min(MAX_GOLES_EQUIPO, Number(m[2])) : 0
  return { marcador: `${propios}-${rival}`, propios, rival }
}

export function sanearMatchSave(body: Record<string, unknown>): MatchSaveSaneado | { error: string } {
  const tipo = (body.tipo ?? "liga") as TipoPartido
  if (!TIPOS_PARTIDO.includes(tipo)) return { error: "Invalid match type" }

  const raw = body.matchStats
  if (typeof raw !== "object" || raw === null) return { error: "Missing matchStats" }
  const stats = raw as Record<string, unknown>

  const { marcador, propios, rival } = sanearMarcador(stats.marcador)
  // Un jugador no puede marcar más goles que su propio equipo.
  const goles = Math.min(intEntre(stats.goles, 0, MAX_GOLES_JUGADOR), propios)
  const asistencias = Math.min(intEntre(stats.asistencias, 0, MAX_GOLES_JUGADOR), propios - goles)
  const valoracion = Math.round(Math.max(1, Math.min(10, num(stats.valoracion, 6))) * 10) / 10
  const tarjetasAmarillas = intEntre(stats.tarjetasAmarillas, 0, 1)
  const tarjetasRojas = intEntre(stats.tarjetasRojas, 0, 1)

  const updated = (typeof body.updatedState === "object" && body.updatedState !== null)
    ? body.updatedState as Record<string, unknown>
    : {}
  const fatiga = typeof updated.fatiga === "number" && Number.isFinite(updated.fatiga)
    ? Math.max(0, Math.min(100, updated.fatiga))
    : undefined

  const matchId = typeof body.matchId === "string" && /^[\w-]{8,64}$/.test(body.matchId)
    ? body.matchId
    : undefined

  return {
    tipo,
    matchStats: { goles, asistencias, valoracion, marcador, tarjetasAmarillas, tarjetasRojas },
    // "ganado" se deduce del marcador en vez de fiarse del flag del cliente:
    // el propio cliente lo calcula igual (ver match/page.tsx y quick-sim.ts).
    ganado: propios > rival,
    expulsado: body.expulsado === true || tarjetasRojas > 0,
    fatiga,
    matchId,
  }
}

// ¿Hay de verdad un partido de este tipo esperando a jugarse? Mismas
// condiciones que usan season/page.tsx y /api/season/auto-advance para
// ofrecer el partido. Sin esto se podían sumar partidos, XP y niveles
// llamando a la API en bucle con la temporada ya terminada.
export function hayPartidoPendiente(tipo: TipoPartido, carrera: Record<string, unknown>): boolean {
  switch (tipo) {
    case "liga": {
      const jornada = (carrera.jornadaActual as number) ?? 0
      const fixtures = (carrera.fixtures as Fixture[] | undefined) ?? []
      return fixtures.some((f) => f.jornada === jornada && !f.jugado)
    }
    case "copa": {
      const copa = carrera.copa as CopaState | undefined
      return !!copa && !copa.eliminado && !copa.campeon
    }
    case "europa": {
      const europa = carrera.europa as EuropaState | undefined
      if (!europa) return false
      if (europa.grupoPartidos.some((p) => !p.jugado)) return true
      const el = europa.eliminatoria
      return !!el && !el.jugado && !el.eliminado && !el.campeon
    }
    case "seleccion": {
      const sel = carrera.seleccion as SeleccionState | undefined
      return !!sel?.paron?.activo
    }
    case "seleccion_torneo": {
      const sel = carrera.seleccion as SeleccionState | undefined
      const torneo = sel?.torneo
      if (!torneo || torneo.fase === "finalizado") return false
      if (torneo.fase === "grupos") return torneo.grupoPartidos.some((p) => !p.jugado)
      return !!torneo.eliminatoria && !torneo.eliminatoria.jugado
    }
  }
}

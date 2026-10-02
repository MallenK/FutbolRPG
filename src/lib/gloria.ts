import { calcularGloria, type SeasonHistoryEntry } from "@/lib/world"

// Gloria de un jugador a partir de su player.state. Se guarda precalculada en
// `state.gloria` en cada escritura (ver lib/player-store.ts) para que el
// ranking pueda ordenar en SQL con un índice, en vez de traer cientos de
// filas y ordenarlas en memoria.
export function gloriaDeEstado(state: unknown): number {
  const s = (state ?? {}) as Record<string, unknown>
  const carrera = (s.carrera ?? {}) as Record<string, unknown>
  const seleccion = carrera.seleccion as { capas?: number; golesSeleccion?: number } | undefined
  return calcularGloria({
    historialTemporadas: (carrera.historialTemporadas ?? []) as SeasonHistoryEntry[],
    reputacion: (carrera.reputacion as number) ?? 0,
    seleccionCapas: seleccion?.capas ?? 0,
    seleccionGoles: seleccion?.golesSeleccion ?? 0,
  })
}

// Devuelve el estado con `gloria` recalculada. Nunca se confía en una
// `gloria` que venga de fuera: siempre se deriva del propio estado.
export function conGloria<T extends Record<string, unknown>>(state: T): T & { gloria: number } {
  return { ...state, gloria: gloriaDeEstado(state) }
}

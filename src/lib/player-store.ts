import { eq } from "drizzle-orm"
import { txDb, type Tx } from "@/lib/db"
import { player } from "@/lib/schema"
import { conGloria } from "@/lib/gloria"

export type PlayerRow = typeof player.$inferSelect

// Lo que devuelve el callback de mutatePlayer:
// - `state` y/o `attributes`: se escriben (state siempre con gloria recalculada).
// - solo `result`: no se escribe nada (validación fallida, nada que hacer…).
export type Mutation<R> = {
  state?: Record<string, unknown>
  attributes?: Record<string, unknown>
  // Otras columnas de `player` (hoy solo la edad, al cerrar temporada).
  columns?: Pick<Partial<PlayerRow>, "age">
  result: R
}

export class NoPlayerError extends Error {
  constructor() {
    super("No player found")
  }
}

// Único punto por el que se modifica una fila de `player`.
//
// Todas las rutas del juego leen el jsonb entero, lo recalculan y lo
// escriben entero. Sin transacción, dos peticiones a la vez del mismo
// jugador (doble clic, dos pestañas, el bucle del modo "Simulado") leían el
// mismo estado y la segunda escritura borraba la primera. Aquí la fila se
// bloquea con SELECT … FOR UPDATE hasta el COMMIT: la segunda petición
// espera y lee ya el estado nuevo.
//
// `fn` recibe también la transacción para escrituras relacionadas
// (activityLog, transferOffer…), que así son atómicas con el jugador.
// Atajo: si el callback devuelve directamente un Response, no se escribe nada
// y ese Response es el resultado (útil para los errores de validación).
type Salida<R> = Mutation<R> | Response

export async function mutatePlayer<R>(
  userId: string,
  fn: (row: PlayerRow, tx: Tx) => Promise<Salida<R>> | Salida<R>,
): Promise<R | Response> {
  return txDb().transaction(async (tx) => {
    const rows = await tx.select().from(player).where(eq(player.userId, userId)).for("update")
    const row = rows[0]
    if (!row) throw new NoPlayerError()

    const out = await fn(row, tx)
    if (out instanceof Response) return out
    if (out.state === undefined && out.attributes === undefined && out.columns === undefined) return out.result

    await tx
      .update(player)
      .set({
        ...(out.state !== undefined ? { state: conGloria(out.state) } : {}),
        ...(out.attributes !== undefined ? { attributes: out.attributes } : {}),
        ...out.columns,
        updatedAt: new Date(),
      })
      .where(eq(player.id, row.id))
    return out.result
  })
}

// Versión para route handlers: "no hay jugador" se convierte en un 404.
export async function mutatePlayerOr404<R>(
  userId: string,
  fn: (row: PlayerRow, tx: Tx) => Promise<Salida<R>> | Salida<R>,
): Promise<R | Response> {
  try {
    return await mutatePlayer(userId, fn)
  } catch (err) {
    if (err instanceof NoPlayerError) return Response.json({ error: "No player found" }, { status: 404 })
    throw err
  }
}

import { neon, Pool } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless"
import * as schema from "./schema"

const url = process.env.DATABASE_URL!

// Lecturas y escrituras sueltas: HTTP, sin conexión persistente (lo más
// barato en serverless).
export const db = drizzle(neon(url), { schema })

// Escrituras que leen-modifican-escriben player.state: necesitan una
// transacción con bloqueo de fila, que el driver HTTP no ofrece. El Pool va
// por WebSocket (nativo en Node 22+) y se reutiliza entre peticiones de la
// misma instancia. Pocas conexiones: Neon free tiene un límite bajo.
// El pool se guarda en globalThis: en `next dev` cada recompilación reevalúa
// este módulo, y sin esto cada recarga dejaba un pool huérfano con sus
// conexiones abiertas.
const globalForPool = globalThis as unknown as { __futbolrpgPool?: Pool }

export function txDb() {
  globalForPool.__futbolrpgPool ??= new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 30_000,
  })
  return drizzlePool(globalForPool.__futbolrpgPool, { schema })
}

export type TxDb = ReturnType<typeof txDb>
export type Tx = Parameters<Parameters<TxDb["transaction"]>[0]>[0]

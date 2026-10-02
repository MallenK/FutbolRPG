// Rellena player.state.gloria en los jugadores que ya existían antes de que
// la gloria se guardara precalculada, y crea los índices del ranking.
//
//   pnpm db:backfill-gloria            → solo muestra lo que cambiaría
//   pnpm db:backfill-gloria --apply    → escribe
//
// Idempotente: se puede ejecutar las veces que haga falta. Solo toca la clave
// `gloria` (jsonb_set), nunca reescribe el resto del estado, así que no pisa
// partidas en curso.
import { neon } from "@neondatabase/serverless"
import { gloriaDeEstado } from "../src/lib/gloria"

process.loadEnvFile(".env.local")
const sql = neon(process.env.DATABASE_URL!)
const apply = process.argv.includes("--apply")

const INDICES = [
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS player_gloria_idx ON player (((state->>'gloria')::int))`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS player_reputacion_idx ON player (((state->'carrera'->>'reputacion')::int))`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS player_temporada_idx ON player (((state->'carrera'->>'temporada')::int))`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS player_level_idx ON player (((state->>'level')::int))`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_log_created_idx ON activity_log (created_at)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_log_user_idx ON activity_log (user_id)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS legado_user_idx ON legado (user_id)`,
]

async function main() {
  const rows = (await sql`select id, name, state from player`) as { id: string; name: string; state: Record<string, unknown> }[]
  const cambios = rows
    .map((r) => ({ id: r.id, name: r.name, antes: r.state?.gloria, despues: gloriaDeEstado(r.state) }))
    .filter((c) => c.antes !== c.despues)

  console.log(`Jugadores: ${rows.length}. Con gloria por rellenar o desactualizada: ${cambios.length}.`)
  for (const c of cambios.slice(0, 20)) console.log(`  ${c.name}: ${c.antes ?? "—"} → ${c.despues}`)
  if (cambios.length > 20) console.log(`  … y ${cambios.length - 20} más`)

  if (!apply) {
    console.log("\nModo simulación. Ejecuta con --apply para escribir y crear los índices.")
    return
  }

  for (const c of cambios) {
    await sql`update player set state = jsonb_set(state, '{gloria}', to_jsonb(${c.despues}::int)) where id = ${c.id}`
  }
  console.log(`Gloria escrita en ${cambios.length} jugadores.`)

  for (const q of INDICES) {
    // Con @neondatabase/serverless 0.10 una consulta sin parámetros se pasa como string.
    await (sql as unknown as (q: string) => Promise<unknown>)(q)
    console.log(`OK  ${q.split(" ON ")[0].replace("CREATE INDEX CONCURRENTLY IF NOT EXISTS ", "índice ")}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

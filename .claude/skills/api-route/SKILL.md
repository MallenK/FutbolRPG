---
name: api-route
description: Checklist para crear o modificar una ruta de API de FutbolRPG (src/app/api/**/route.ts) que lee o escribe player.state. Usar siempre que se toque un route handler, sobre todo si muta el estado del jugador, el mercado o el ranking.
---

# Rutas de API en FutbolRPG

El juego tiene ranking público, así que cada ruta que escribe estado es una
superficie de trampas. Repasa esta lista antes de dar la ruta por buena.

## Plantilla

```ts
import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { readJson } from "@/lib/http"
import { mutatePlayerOr404 } from "@/lib/player-store"

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()   // o requireRealAccount()
  if (error) return error

  const body = await readJson<{ campo: unknown }>(req)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })

  // Fila bloqueada (SELECT … FOR UPDATE) hasta el COMMIT.
  return mutatePlayerOr404<Response>(session.user.id, async (row, tx) => {
    const state = row.state as Record<string, unknown>
    if (/* precondición falla */ false) {
      return NextResponse.json({ error: "..." }, { status: 409 })   // no escribe nada
    }
    const newState = { ...state /* cálculo puro de src/lib */ }
    // Escrituras relacionadas (activityLog…) con `tx`, dentro de la misma transacción.
    return { state: newState, result: NextResponse.json({ success: true }) }
  })
}
```

Para solo leer, `getPlayerByUserId` por HTTP es más barato. Nunca escribas en `player`
con `db.update(player)` directamente.

## Checklist

- [ ] **Sesión**: `requireSession()`; `requireRealAccount()` si es social (ranking, actividad).
      Una ruta que gasta cuota de un tercero (Gemini, Resend, Stripe) nunca va sin sesión.
- [ ] **Body**: se lee con `readJson`. JSON inválido responde 400, no 500.
- [ ] **La escritura va por `mutatePlayerOr404`**, nunca `db.update(player)` suelto.
- [ ] **Nada del cliente se mezcla en `player.state` sin filtrar.** Lista blanca de
      campos, tipos comprobados y valores recortados a su rango (`clamp`).
- [ ] **Precondiciones del juego**: comprueba que la acción tiene sentido en el estado
      actual (hay un partido pendiente, la liga terminó, la oferta no caducó…). Si no,
      responde 409. Esto además frena los dobles clics y los reintentos.
- [ ] **Idempotencia**: si el cliente puede reintentar (red caída tras guardar), la
      segunda llamada no debe aplicar el efecto dos veces.
- [ ] **Premium**: las reglas salen de `src/lib/premium.ts`.
- [ ] **Lógica pura fuera del handler**: el cálculo va a `src/lib/*` con su test en
      Vitest. El handler solo orquesta lectura, validación y escritura.
- [ ] **Test e2e o de API** en `e2e/` si la ruta forma parte de un flujo de usuario.

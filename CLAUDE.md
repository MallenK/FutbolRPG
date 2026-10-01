# FutbolRPG — guía para Claude Code

Simulador de carrera futbolística (estilo FIFA Career Mode) + RPG de decisiones con dados.
Multijugador asíncrono: ranking, actividad, mercado entre usuarios. Todo en capa gratuita
(Vercel hobby, Neon free, Gemini free). Versión en `package.json` y `src/lib/version.ts`.

## Comandos

| Qué | Comando |
|---|---|
| Dev server | `pnpm dev` (puerto 3000) |
| Typecheck | `npx tsc --noEmit` |
| Tests unitarios (Vitest, `src/**/*.test.ts`) | `pnpm test` |
| Tests e2e (Playwright, `e2e/`) | `pnpm test:e2e` — hace `next build` y sirve en el **3100** |
| Grafo de conocimiento | `graphify update .` tras cambiar código |
| Schema a la BD | `pnpm db:push` (Drizzle → Neon). No lo ejecutes sin que el usuario lo pida |
| Rellenar gloria e índices | `pnpm db:backfill-gloria` (simulación) / `--apply` (escribe). Idempotente |

Antes de dar un cambio por terminado: `npx tsc --noEmit && pnpm test`, y `pnpm test:e2e`
si se tocó una ruta de API, un flujo de pantalla o el motor de temporada. La skill
`/verify` hace las tres cosas en orden.

## Arquitectura (resumen del grafo, ver `graphify-out/GRAPH_REPORT.md`)

```
src/app/<pantalla>/page.tsx   Client components ("use client") que hacen fetch a /api/*
src/app/api/**/route.ts       Route handlers: requireSession → getPlayerByUserId → lógica → db.update
src/lib/                      Lógica de dominio y acceso a datos (world, calendar, match-save, players…)
src/engine/                   Motor puro (sin BD): partido interactivo, eventos de carrera, decisiones, quick-sim
src/components/               UI compartida + escenas three.js (FieldScene, Dice3D, TrophyScene)
remotion/                     Loaders narrativos animados
```

Nodos centrales (más conectados): `requireSession()`, `getPlayerByUserId()`, `db`,
`getDivisionInfo()`, `performMatchSave()`. Si cambias su firma, cambias medio proyecto.

### Estado del juego

- **Todo el estado de la partida vive en `player.state` (jsonb)**, sobre todo en
  `player.state.carrera`. Las tablas `career` y `seasonHistory` están huérfanas (no se leen).
- **Toda escritura sobre `player` pasa por `mutatePlayer` / `mutatePlayerOr404`**
  (`src/lib/player-store.ts`): transacción con `SELECT … FOR UPDATE` (driver WebSocket de
  Neon, `txDb()` en `src/lib/db.ts`). El callback devuelve `{ state, attributes, columns,
  result }` o directamente un `Response` si no hay nada que escribir. Nunca uses
  `db.update(player)` suelto: dos peticiones simultáneas se pisarían.
- `mutatePlayer` recalcula `state.gloria` en cada escritura (`src/lib/gloria.ts`). El ranking
  ordena en SQL por esa clave con índice. No calcules la gloria en otro sitio.
- Las lecturas sueltas siguen por HTTP (`db` en `src/lib/db.ts`), que es más barato.
- **El servidor manda.** Nunca hagas spread de un objeto del body sobre `player.state`.
  Valida y recorta todo lo que llega del cliente (ver `src/lib/match-validation.ts` y
  `src/lib/player-creation.ts`). El ranking es público: un campo sin validar es una trampa.
- **El partido interactivo se resuelve en el servidor** (`src/lib/match-server.ts`).
  `POST /api/match/start` crea o retoma `carrera.partidoEnCurso`; `POST /api/match/turn`
  recibe solo `{ matchId, turno, opcionId }`, tira el dado y, en el último turno, guarda el
  partido con `calcularGuardadoPartido`. El cliente nunca envía estadísticas. `turno` hace
  la petición idempotente (`carrera.ultimoTurno`).
- **Invitados** (`user.isAnonymous`): juegan su carrera, pero ranking, actividad y mercado
  entre usuarios usan `requireRealAccount()` y los excluyen en SQL. Al registrarse,
  `src/lib/guest-migration.ts` traspasa su jugador a la cuenta nueva.
- Los efectos de una opción de evento se aplican en un único sitio,
  `src/lib/career-event-apply.ts`, que usan tanto `/api/season/event` como
  `/api/season/auto-advance`. No dupliques esa lógica.

### Convenciones

- Código, UI, comentarios y commits en **español**. Los comentarios explican el *porqué*
  y suelen citar el hallazgo del informe de fallos (`../.claude/informe-fallos.md`).
- Alias de import `@/` → `src/`.
- Rutas de API: `requireSession()` (o `requireRealAccount()` para ranking/actividad),
  luego `readJson(req)` de `src/lib/http.ts` para leer el body sin reventar con JSON inválido.
- Features de pago: reglas en `src/lib/premium.ts`, nunca repartidas por las rutas.
- Emails (Resend) y Gemini son opcionales: sin su variable de entorno se desactivan solos.

## Tests e2e — lo que hay que saber

- Corren contra la **base de datos real** de `DATABASE_URL`. Cada test crea sus cuentas
  (`e2e-…@example.com`) y las borra al final desde Ajustes. Mantén esa limpieza en tests nuevos.
- `BETTER_AUTH_URL` y `NEXT_PUBLIC_BETTER_AUTH_URL` deben apuntar al mismo puerto que el
  servidor o Better Auth falla por CORS. `playwright.config.ts` ya lo fija al 3100.
- Con `E2E_TEST_MODE=1` (lo pone la config de Playwright) no se envían emails (Resend
  rechaza los dominios `example.com`) y se desactiva el límite de peticiones de Better
  Auth, que si no corta los registros seguidos de la suite.
- Usa los helpers de `e2e/helpers.ts`: `registrar`, `crearJugador`, `jugarPartidoPorApi`,
  `borrarCuenta` y `borrarInvitado` (siempre en un `finally`).
- Corren contra un **build de producción**, no `next dev`: bajo dev la compilación al
  vuelo de cada ruta (7s solo `/season`) hacía fallar aserciones por timeout. Ese build
  fija `NEXT_PUBLIC_BETTER_AUTH_URL` al puerto 3100, así que **no reutilices `.next` para
  desplegar**; el deploy de Vercel hace su propio build. Al iterar en local,
  `E2E_SKIP_BUILD=1 pnpm test:e2e` reutiliza el build anterior.

## Documentos del proyecto

- `ROADMAP.md` — fases y estado. `CHANGELOG.md` — versiones.
- `../.claude/informe-fallos.md` — informe vivo de fallos por rondas (fuera de este repo).
- `../.claude/context.md` — historial de decisiones de sesiones anteriores.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

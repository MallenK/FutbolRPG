---
name: verify
description: Verifica FutbolRPG de punta a punta antes de dar un cambio por terminado - typecheck, tests unitarios (Vitest), tests e2e (Playwright contra la BD real) y refresco del grafo. Usar tras cualquier cambio de código, o cuando el usuario pida "pruébalo todo", "verifica", "pasa los tests".
---

# Verificar FutbolRPG

Ejecuta los pasos en este orden y para en el primero que falle. Un paso rojo se
arregla antes de seguir: no tiene sentido lanzar 4 minutos de e2e sobre un
typecheck roto.

1. **Typecheck** — `npx tsc --noEmit`. Debe salir sin ninguna línea de error.
2. **Unitarios** — `pnpm test`. Todos en verde. Si añadiste lógica pura en
   `src/lib` o `src/engine`, añade también su `*.test.ts` al lado.
3. **End-to-end** — `pnpm test:e2e` (tarda 3-6 min). Lánzalo en segundo plano
   y sigue con otra cosa mientras corre.
   - Levanta su propio `next dev` en el puerto 3100; si ya hay uno ahí lo reutiliza.
   - Escribe en la base de datos real. Cada spec crea y borra sus propias cuentas.
   - Si un test falla, abre la traza: `npx playwright show-report` o el
     `trace.zip` de `test-results/`. No lo reintentes a ciegas.
4. **Grafo** — `graphify update .` para que `graphify-out/` refleje el código nuevo.

Al terminar, informa del resultado de cada paso con sus números (tests pasados,
fallidos, duración). Si te saltaste un paso, dilo y explica por qué.

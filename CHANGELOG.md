# Changelog

Todos los cambios notables de FutbolRPG se documentan en este archivo. El formato sigue a grandes rasgos [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/), y el versionado, [SemVer](https://semver.org/lang/es/) (`MAYOR.MENOR.PARCHE`, mientras el proyecto no llegue a `1.0.0` cualquier versión puede incluir cambios de comportamiento).

Este archivo resume **qué cambió y por qué le importa a quien juega**. El detalle técnico de cada hallazgo (diagnóstico, archivos tocados, cómo se verificó en vivo) vive en [`.claude/informe-fallos.md`](.claude/informe-fallos.md); el estado de cada fase del proyecto, en [`ROADMAP.md`](ROADMAP.md).

## [0.2.0] — 2026-09-15

Sesión centrada en cerrar huecos reales de sistemas ya existentes (Selección, mercado, contrato) y en dar visibilidad a los logros de una carrera, más que en construir features nuevas desde cero. Incluye además la primera pasada de auditoría específica sobre la liga española de cara a la futura expansión a más países.

### Añadido
- **Score de "gloria" unificado** — nueva pestaña por defecto en `/leaderboard`, visible también en `/comparar/[id]` y como badge en `/dashboard`. Pondera títulos por el tamaño del club con el que se ganaron (un título en Tercera Federación vale más que el mismo título ya arriba del todo), ascensos, posición final en liga, y prestigio de selección — antes el ranking solo ordenaba por nivel/reputación/temporadas, categorías que premian sobre todo jugar mucho.
- **Testing end-to-end con Playwright** (`pnpm test:e2e`) — cubre el ciclo de vida completo de una cuenta (registro → crear personaje → jugar una temporada → borrar cuenta) y un smoke test del ranking. Corre contra su propio `next dev` y la base de datos real; las cuentas de prueba se crean y se borran solas.
- **Versionado de la app** — este archivo, el campo `version` de `package.json` como fuente de verdad (`src/lib/version.ts`), y un pie de página con la versión en Ajustes.

### Corregido
- La **Selección Nacional** ahora refleja la nacionalidad elegida al crear el personaje — antes, sin importar qué nacionalidad se eligiera, la Selección, la Eurocopa y el Mundial siempre eran "España".
- El **mercado real** (`/mercado`, fichajes entre usuarios) actualizaba solo el club al aceptar una oferta, dejando la liga y la división del jugador desincronizadas del club nuevo (rivales, elegibilidad europea y perfil público, todos mal calculados hasta la siguiente temporada).
- El evento de **contrato expirado / último año de contrato** ahora tiene consecuencia mecánica real: firmar pronto da una temporada extra, y "explorar el mercado" pone de verdad al jugador en el mercado NPC con ofertas reales — antes cualquier opción llevaba exactamente al mismo resultado.
- "**Solicitar traspaso**" pasó de vivir como destino del menú de navegación global a ser una acción dentro de la propia carrera en curso, en `/season`.
- El número de **goles** del leaderboard se calculaba correctamente pero nunca llegaba a mostrarse en la interfaz.

### Documentación
- `ROADMAP.md` sincronizado con el estado real del proyecto (Fase 4 — multijugador asíncrono — estaba completa desde hacía tiempo pero seguía marcada como pendiente; lo mismo con Selección Nacional y ascenso/descenso en Fase 3).
- Primera auditoría de completitud de la liga española (`informe-fallos.md`, Ronda 6), con la vista puesta en abrir más países/ligas más adelante: 2 hallazgos corregidos esta ronda (mercado y contrato, arriba), 4 pendientes de baja prioridad (código muerto, datos calculados que nunca se muestran).

## [0.1.0] — 2026-01 a 2026-09-14

Todo el trabajo previo a este changelog, agrupado como el MVP inicial: creación de personaje (wizard de 7 pasos con avatar 3D), motor de partido interactivo con dados, sistema de temporadas con eventos de carrera, Copa del Rey y competiciones europeas, Selección Nacional, ascenso/descenso de división, dos sistemas de mercado de fichajes, leaderboard, feed de actividad, perfiles públicos compartibles, rivalidades y comparativas, sistema de premios y vitrina de trofeos, Legado (Hall of Fame), cuenta Premium vía Stripe, PWA instalable, efectos de sonido, y varias fases de integración de three.js (dado 3D, escena de partido, avatar de personaje, celebraciones de gol).

No se reconstruye aquí el detalle línea a línea de esta fase — está todo en el historial de `git log` y en las Rondas 1-5 de `informe-fallos.md`.

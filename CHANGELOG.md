# Changelog

Todos los cambios notables de FutbolRPG se documentan en este archivo. El formato sigue a grandes rasgos [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/), y el versionado, [SemVer](https://semver.org/lang/es/) (`MAYOR.MENOR.PARCHE`, mientras el proyecto no llegue a `1.0.0` cualquier versión puede incluir cambios de comportamiento).

Este archivo resume **qué cambió y por qué le importa a quien juega**. El detalle técnico de cada hallazgo (diagnóstico, archivos tocados, cómo se verificó en vivo) vive en [`.claude/informe-fallos.md`](.claude/informe-fallos.md); el estado de cada fase del proyecto, en [`ROADMAP.md`](ROADMAP.md).

## [Sin publicar]

### Juego limpio y seguridad
- **El partido ya se juega en el servidor.** La tirada del dado y el resultado de cada jugada se calculan en el servidor; el navegador solo elige la acción. Antes todo se calculaba en tu navegador, así que un ranking público se podía falsear. De paso: recargar la página ya no reinicia el partido (lo retomas en el mismo turno) y salir a mitad ya no pierde el progreso.
- **Dos acciones a la vez ya no se pisan.** Un doble clic, dos pestañas abiertas o el modo "Simulado" podían hacer que un partido no se guardara aunque la pantalla dijera que sí.
- **Límite de intentos** en registro, inicio de sesión y recuperación de contraseña.

### Añadido
- **Los invitados conservan su carrera al crear la cuenta.** Antes se perdía entera justo al registrarse.
- **El salario del contrato se ve** en Temporada y en Perfil, con su nivel ("Alto (4/5)"). Antes se calculaba, nunca se mostraba y nunca llegaba al máximo.

### Cambiado
- **Ranking solo para cuentas registradas.** Los invitados ya no aparecen en el ranking ni en la actividad, y el mercado entre usuarios les pide crear cuenta, explicando por qué.
- **El ranking aguanta cualquier número de jugadores.** Antes, pasando de 500, el top 50 habría salido mal.

### Interno
- Toda escritura del jugador pasa por una única función con transacción y bloqueo de fila.
- Partido del servidor en `src/lib/match-server.ts`; `/api/match/save` sustituido por `/api/match/start` y `/api/match/turn`.
- Siete índices nuevos y `pnpm db:backfill-gloria` para rellenar la gloria de partidas antiguas.
- Fuera el motor legado, la tabla `career` y los campos que no se leían.
- Tests: 172 unitarios y 13 end-to-end, ahora contra un build de producción (3,2 min en vez de 15,7).

### Ronda anterior (integridad del servidor)

Revisión de arquitectura y código a partir del grafo de conocimiento (`graphify-out/`). El foco: que el servidor sea la fuente de verdad del progreso, porque el ranking es público. Detalle técnico en `informe-fallos.md`, Ronda 9.

### Seguridad y juego limpio
- **Guardar un partido ya no acepta cualquier cosa.** Goles, asistencias, valoración y tarjetas se recortan a lo posible según el marcador, y del estado enviado solo se acepta la fatiga. Antes, una petición hecha a mano podía reescribir el historial de temporadas o los rasgos del jugador.
- **Solo se guarda un partido si de verdad había uno pendiente**, y un reintento del mismo partido no se cuenta dos veces.
- **Cerrar la temporada exige haber terminado la liga.** Un doble clic ya no cierra dos temporadas seguidas.
- **Crear el personaje valida el reparto de puntos en el servidor**, que recalcula los atributos. Ya no se puede crear un jugador con 99 en todo.
- Eliminada una ruta sin uso que permitía sobrescribir el estado completo del jugador.
- La **narrativa con IA exige sesión** y recorta lo que se le envía: antes cualquiera podía gastar la cuota de Gemini del proyecto.
- Aceptar una oferta del mercado entre usuarios es atómico: dos clics seguidos ya no aplican el fichaje dos veces.

### Corregido
- En modo **"Simulado"**, las decisiones automáticas de los eventos aplican ahora todos sus efectos, igual que en modo manual. Antes se perdían los puntos de atributo, los rasgos, la confianza, los traspasos, las renovaciones y la entrada al mercado.
- Ya no se puede aceptar una **oferta de club caducada**.
- "**Actualizar ofertas**" del mercado de club da una tanda por jornada, con un aviso en pantalla. Antes se podía pulsar sin límite hasta que saliera una oferta de primera.
- `/mercado` sin sesión mostraba "Application error". Ahora redirige al login como el resto de pantallas.
- La narrativa IA usaba un modelo de Gemini ya retirado. Ahora usa `gemini-2.5-flash`, configurable con `GEMINI_MODEL`.
- El calendario de liga se baraja de forma uniforme.

### Interno
- Configuración de Claude Code del proyecto: `CLAUDE.md`, permisos, skills `/verify` y `/api-route`, y agente `game-state-reviewer`.
- Lógica compartida extraída a `src/lib`: aplicación de efectos de eventos, calendario de liga, validación de partidos y de creación de personaje, y lectura segura del body JSON.
- Tests: 27 unitarios nuevos y 3 specs de Playwright nuevos (integridad de la API, recorrido de pantallas y partido interactivo completo). Los tests e2e ya no intentan enviar emails reales.

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

# FutbolRPG — Roadmap de Desarrollo

## Visión del Producto

Simulador completo de carrera futbolística estilo FIFA Career Mode combinado con un juego de rol (RPG). El jugador toma decisiones durante y fuera de los partidos mediante un sistema de dados y cartas de decisión que afectan el desarrollo de su carrera. Debe ser lo más realista y completo posible, cubriendo todos los niveles del fútbol profesional.

---

## Stack Tecnológico

| Capa | Tecnología | Coste |
|---|---|---|
| **Frontend/Backend** | Next.js 15 + TypeScript | Gratis |
| **Estilos** | Tailwind CSS | Gratis |
| **Autenticación** | Better Auth | Gratis |
| **Base de datos** | PostgreSQL en Neon (free tier) | Gratis |
| **ORM** | Drizzle ORM | Gratis |
| **3D** | react-three-fiber / three.js | Gratis |
| **Loaders narrativos** | Remotion | Gratis |
| **IA narrativa** | Google Gemini Flash (free tier) | Gratis |
| **Deploy** | Vercel (hobby plan) | Gratis |

**Todo el proyecto debe mantenerse en capa gratuita.**

---

## Decisiones de Arquitectura

- **Next.js + Drizzle + Neon + Better Auth**: ya migrado, es la base actual del proyecto.
- **Multijugador asíncrono** (no tiempo real): Leaderboards, mercado de fichajes entre usuarios, feed global.
- **Narrativa pregenerada** como base + Gemini Flash como complemento opcional para variedad dinámica.

---

## Estado Actual (actualizado)

El proyecto está muy por delante de lo que reflejaba este documento anteriormente. Fases 1 y 2 completas; Fase 3 y 4 parcialmente implementadas.

### Fase 1 — Fundación ✅ COMPLETA
- [x] Next.js 15 + TypeScript
- [x] Better Auth (registro, login, sesiones, ajustes de cuenta)
- [x] Drizzle ORM + Neon PostgreSQL
- [x] Schema: user, player, career, seasonHistory, transferListing, transferOffer, activityLog
- [x] Layout principal y dashboard de jugador

### Fase 2 — Core Gameplay ✅ COMPLETA
- [x] Creación de jugador (`/create-player`)
- [x] Motor de partidos interactivo (`src/engine/match-interactive.ts`, `match.ts`)
- [x] Sistema de decisiones (`src/engine/decision.ts`)
- [x] Sistema de eventos de carrera con traits/rasgos (`career-events.ts`, `events.ts`)
- [x] Escena 3D del partido (campo, jugador animado — react-three-fiber)
- [x] Dado 3D (`Dice3D`)

### Fase 3 — Modo Carrera Completo 🟡 EN CURSO
- [x] Sistema de temporadas (init/event/end) — `/season`, API `season/*`
- [x] Sistema de transferencias con ofertas y negociación — `/mercado`, `/transfer`, API `market/*`, `transfer/*`
- [x] Banco de eventos narrativos con traits (rasgos dormidos, polivalencia, físico excepcional, etc.)
- [x] Narrativa IA vía Gemini (`api/ai/narrative`) con loaders Remotion contextuales
- [x] Sistema de sanciones (`season/resolve-sancion`)
- [ ] **Selección nacional**: convocatorias, torneos internacionales (Eurocopa, Mundial) — no iniciado
- [x] **Sistema de galardones**: Balón de Oro/MVP/Bota de Oro/campeonatos ya se calculaban cada temporada (`calcularPremios` en `api/season/end`) y se guardaban en `historialTemporadas`, pero nunca se mostraban — añadida vitrina de trofeos en `/dashboard` que lista todos los premios ganados por temporada. Pendiente: un "Balón de Oro" global cruzando jugadores de todos los usuarios (requiere lógica de comparación asíncrona entre carreras).
- [ ] Ascensos y descensos entre ligas (pirámide de ligas por país) — no confirmado en el engine actual
- [ ] Sistema de reputación/popularidad (local → nacional → mundial) — no confirmado

### Fase 4 — Multijugador Asíncrono 🟡 EN CURSO
- [x] Leaderboard global (`/leaderboard`, API `leaderboard`)
- [x] Mercado de fichajes entre usuarios reales
- [x] Feed global de actividad (`/feed`, `activityLog`)
- [ ] Perfil público de jugador compartible
- [ ] Rivalidades y comparativas directas entre jugadores

### Fase 5 — Contenido y Pulido Final ⬜ NO INICIADA
- [x] Integración Gemini Flash (ya en uso, no solo pendiente)
- [ ] Animaciones de partidos: goles, celebraciones, tarjetas (más allá del engine textual actual)
- [ ] Efectos de sonido y música de fondo
- [ ] PWA instalable en móvil
- [ ] Optimización de rendimiento y SEO
- [x] Vitest configurado (`pnpm test`) con primeros tests sobre funciones puras (`src/lib/world.ts`: ascenso/descenso, puntos de liga; `src/engine/decision.ts`: motor de resolución de decisiones). Pendiente ampliar cobertura (career.ts, competition.ts, match-interactive.ts) y añadir Playwright para flujos end-to-end.
- [ ] Perfil público compartible + Open Graph

---

## Modelo de Datos (actual, `src/lib/schema.ts`)

```
user, session, account, verification   → Better Auth
player                                  → datos del futbolista
career                                  → carrera activa del jugador
season_history                          → historial de temporadas
transfer_listing / transfer_offer       → mercado de fichajes
activity_log                            → feed global
```

Pendiente de añadir cuando se aborden las features correspondientes:
```
national_call_up   → convocatorias de selección
tournament          → torneos internacionales
award                → galardones (Balón de Oro, MVP, Bota de Oro...)
```

---

## Próximos pasos (por prioridad sugerida)

1. **Sistema de galardones** — cierre natural de cada temporada, reutiliza `seasonHistory` y `activityLog` ya existentes. Bajo esfuerzo, alto impacto narrativo.
2. **Selección nacional / torneos internacionales** — mayor esfuerzo (nuevo ciclo de temporada paralelo), pero es contenido central del roadmap original.
3. **Perfil público compartible** — aprovecha el mercado/leaderboard ya sociales.
4. **Testing automatizado** — para poder seguir añadiendo features sin regresiones (no hay tests hoy).
5. **PWA + pulido visual/sonido** — última fase, cuando el contenido esté cerrado.

---

## Cuentas y Servicios Necesarios (todos gratuitos)

| Servicio | Para qué | URL |
|---|---|---|
| **Neon** | Base de datos PostgreSQL | neon.tech |
| **Google AI Studio** | API key de Gemini Flash | aistudio.google.com |
| **Vercel** | Deploy | vercel.com |
| **GitHub** | Repositorio remoto | github.com |

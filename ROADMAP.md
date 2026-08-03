# FutbolRPG — Roadmap de Desarrollo

## Visión del Producto

Simulador completo de carrera futbolística estilo FIFA Career Mode combinado con un juego de rol (RPG). El jugador toma decisiones durante y fuera de los partidos mediante un sistema de dados y cartas de decisión que afectan el desarrollo de su carrera. Debe ser lo más realista y completo posible, cubriendo todos los niveles del fútbol profesional.

---

## Stack Tecnológico

| Capa | Tecnología | Coste |
|---|---|---|
| **Frontend/Backend** | Next.js 15 + TypeScript | Gratis |
| **Estilos** | Tailwind CSS + Framer Motion | Gratis |
| **Autenticación** | Better Auth | Gratis |
| **Base de datos** | PostgreSQL en Neon (free tier) | Gratis |
| **ORM** | Drizzle ORM | Gratis |
| **IA narrativa** | Google Gemini Flash (free tier) | Gratis |
| **Deploy** | Vercel (hobby plan) | Gratis |

**Todo el proyecto debe mantenerse en capa gratuita.**

---

## Decisiones de Arquitectura

- **Migración de Vite a Next.js**: Necesario para Better Auth + Vercel deployment limpio. El engine actual (`engine/`) se reutiliza íntegro.
- **Multijugador asíncrono** (no tiempo real): Leaderboards, mercado de fichajes entre usuarios, feed global. El multijugador en tiempo real queda fuera de scope por complejidad de infraestructura.
- **Narrativa pregenerada** como base + Gemini Flash como complemento opcional para variedad dinámica.
- **Local primero, deploy después**: Desarrollo completo en local, despliegue a Vercel cuando cada fase esté estable.

---

## Roadmap por Fases

### Fase 1 — Fundación (Base técnica) ✅ EN CURSO
- [ ] Migrar proyecto a Next.js 15
- [ ] Configurar Better Auth (registro, login, sesiones, OAuth opcional)
- [ ] Configurar Drizzle ORM + Neon PostgreSQL
- [ ] Schema de datos: usuarios, jugadores, carreras, temporadas, historial, estadísticas
- [ ] Design system base: paleta arcade/moderna, tipografía, componentes UI reutilizables
- [ ] Layout principal: navbar, sidebar, dashboard de jugador

### Fase 2 — Core Gameplay (El juego en sí)
- [ ] Pantalla de creación de jugador (nombre, posición, atributos iniciales, país)
- [ ] Sistema de dados visual (animación de lanzamiento + resultado)
- [ ] Sistema de decisiones con cartas visuales (dentro y fuera del partido)
- [ ] Rediseño completo del simulador de partidos: narrativa por turnos con visuales
- [ ] Panel de estadísticas del jugador con gráficas (Chart.js o Recharts)
- [ ] Sistema de desarrollo de habilidades (XP, niveles, árbol de habilidades)

### Fase 3 — Modo Carrera Completo
- [ ] Calendario de temporada visual con fixtures
- [ ] Sistema de transferencias: ofertas entrantes/salientes, negociaciones, cláusulas
- [ ] Selección nacional: convocatorias, torneos internacionales (Eurocopa, Mundial)
- [ ] Banco de eventos narrativos (objetivo: 100+ eventos únicos)
  - Prensa y ruedas de prensa
  - Lesiones con recuperación progresiva
  - Conflictos internos (entrenador, compañeros)
  - Patrocinadores y vida personal
  - Ofertas de renovación y rumores de mercado
- [ ] Sistema de galardones: Balón de Oro, MVP, Bota de Oro, etc.
- [ ] Ascensos y descensos entre ligas (pirámide de ligas por país)
- [ ] Sistema de reputación y popularidad (local → nacional → mundial)

### Fase 4 — Multijugador Asíncrono
- [ ] Leaderboards globales (goles, títulos, valoración media, carrera más larga)
- [ ] Mercado de transferencias entre usuarios reales
- [ ] Perfil público de jugador (compartible)
- [ ] Feed global de noticias ("MallenK18 fichó por el Real Madrid por 80M")
- [ ] Sistema de rivalidades y comparativas entre jugadores

### Fase 5 — Contenido y Pulido Final
- [ ] Integración Gemini Flash para narraciones dinámicas opcionales (free tier)
- [ ] Animaciones de partidos: goles, celebraciones, tarjetas
- [ ] Efectos de sonido y música de fondo (opcional, assets gratuitos)
- [ ] PWA: instalable en móvil
- [ ] Optimización de rendimiento y SEO
- [ ] Testing automatizado (Vitest + Playwright)

---

## Modelo de Datos (Esquema inicial)

```
users           → id, email, username, avatar, created_at
players         → id, user_id, name, position, nationality, age, attributes, created_at
careers         → id, player_id, current_club, current_league, season, status
seasons         → id, career_id, year, club, stats_aggregated, trophies
matches         → id, season_id, opponent, result, player_stats, decisions_log
events          → id, career_id, type, description, outcome, date
transfers       → id, player_id, from_club, to_club, fee, date
awards          → id, player_id, type, season, description
```

---

## Cuentas y Servicios Necesarios (todos gratuitos)

| Servicio | Para qué | URL |
|---|---|---|
| **Neon** | Base de datos PostgreSQL | neon.tech |
| **Google AI Studio** | API key de Gemini Flash | aistudio.google.com |
| **Vercel** | Deploy (más adelante) | vercel.com |
| **GitHub** | Repositorio remoto | github.com |

---

## Estado Actual

- **Fase activa:** Fase 1
- **Último avance:** Plan definido, inicio de migración a Next.js
- **Prioridad inmediata:** Migración de Vite → Next.js + setup de auth y base de datos

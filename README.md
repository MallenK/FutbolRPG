# FutbolRPG

Simulador de carrera futbolística estilo FIFA Career Mode combinado con un RPG narrativo por decisiones y dados. El jugador crea un futbolista, gestiona su carrera a lo largo de temporadas (partidos, mercado de fichajes, eventos narrativos) y compite de forma asíncrona con otros usuarios (leaderboard, feed, mercado).

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS**
- **Drizzle ORM** sobre **PostgreSQL (Neon)**
- **Better Auth** (registro, login, sesiones)
- **react-three-fiber / three.js** — escenas 3D (campo, jugador, trofeo, dado)
- **Remotion** — loaders narrativos animados
- **Google Gemini** — narrativa IA complementaria

## Estructura

```
src/app/            rutas (App Router): dashboard, create-player, match, season, mercado, transfer, leaderboard, feed, settings, api/*
src/engine/         motor de juego: partidos, eventos de temporada, competiciones, decisiones, traits
src/lib/            schema de Drizzle, auth, utilidades
src/components/     componentes UI y escenas 3D
remotion/           composiciones de Remotion (loaders)
```

## Run Locally

**Requisitos:** Node.js, pnpm

1. Instalar dependencias:
   `pnpm install`
2. Configurar variables en `.env.local` (ver `.env.local.example` o pedir al equipo): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`, `GEMINI_API_KEY`, `RESEND_API_KEY` (emails), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (login con Google), `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` (pagos). Todas opcionales salvo las 4 primeras — sin ellas esas features concretas se desactivan solas sin romper el resto.
3. Aplicar el schema a la base de datos:
   `pnpm db:push`
4. Arrancar el entorno de desarrollo:
   `pnpm dev`

App disponible en http://localhost:3000

## Otros comandos

- `pnpm test` — ejecuta los tests (Vitest)
- `pnpm test:watch` — tests en modo watch
- `pnpm db:studio` — explorador visual de la base de datos (Drizzle Studio)
- `pnpm db:generate` / `pnpm db:migrate` — migraciones
- `pnpm remotion` — abrir Remotion Studio para editar los loaders

Ver [ROADMAP.md](ROADMAP.md) para el estado y plan de desarrollo.

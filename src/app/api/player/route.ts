import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player, career } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"
import { createId } from "@/lib/id"
import { getDivisionInfo, type Division } from "@/lib/world"

type RpgFields = {
  apellido?: string
  apodo?: string
  dorsal?: number
  piernaDominante?: string
  altura?: number
  peso?: number
  age?: number
  origen?: string
  personalidad?: string
  estiloJuego?: string
  traits?: string[]
  potencial?: number
  clubElegido?: string
}

function buildInitialState(division: Division, rpg?: RpgFields) {
  const divInfo = getDivisionInfo(division)
  const club = rpg?.clubElegido && divInfo.clubes.includes(rpg.clubElegido)
    ? rpg.clubElegido
    : divInfo.clubes[0]
  const dorsal = Math.max(1, Math.min(99, Math.round(rpg?.dorsal ?? 10)))
  return {
    fatiga: 0, forma: 80, moral: 85, riesgoLesion: 5,
    confianza: { entrenador: 60, vestuario: 50, reputacion: 40 },
    // RPG fields stored at root of state
    apodo: rpg?.apodo?.trim() || undefined,
    dorsal,
    origen: rpg?.origen ?? "academia",
    personalidad: rpg?.personalidad ?? "profesional",
    estiloJuego: rpg?.estiloJuego ?? "",
    traits: rpg?.traits ?? [],
    potencial: rpg?.potencial ?? 3,
    piernaDominante: rpg?.piernaDominante ?? "derecho",
    altura: rpg?.altura ?? 180,
    peso: rpg?.peso ?? 75,
    xp: 0,
    level: 1,
    attributePoints: 0,
    carrera: {
      club,
      liga: divInfo.nombre,
      divisionActual: division,
      rol: "Rotación",
      temporada: 1,
      reputacion: 10,
      jornadaActual: 0,
      fixtures: [],
      eventoActual: null,
      premios: [],
      etiquetas: ["Joven Promesa"],
      estadisticasTemporada: { partidosJugados: 0, goles: 0, asistencias: 0, valoracionMedia: 6.0, tarjetasAmarillas: 0, tarjetasRojas: 0 },
      estadisticasCarrera: { partidosJugados: 0, goles: 0, asistencias: 0, tarjetasAmarillas: 0, tarjetasRojas: 0 },
      sancion: { partidosRestantes: 0 },
      historialTemporadas: [],
      ultimosPartidos: [],
      historial: {
        historialPartidos: [], resumenesTemporadas: [],
        lesionesSufridas: 0, semanasLesionado: 0, eventosImportantes: [],
      },
    },
  }
}

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === "object" && err !== null &&
  "code" in err && (err as { code: string }).code === "23505"

export async function GET() {
  const { session, error } = await requireSession()
  if (error) return error

  const found = await getPlayerByUserId(session.user.id)
  return NextResponse.json({ player: found })
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await req.json()
  const { name, position, nationality, attributes, divisionInicial, rpg, state } = body

  if (!name || !position || !attributes) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
  }

  const division = (Math.max(1, Math.min(5, divisionInicial ?? 3))) as Division
  const initialState = buildInitialState(division, rpg)
  const divInfo = getDivisionInfo(division)
  const age = rpg?.age ?? 18

  const playerId = createId()

  try {
    await db.insert(player).values({
      id: playerId,
      userId: session.user.id,
      name,
      position,
      nationality: nationality ?? "España",
      age,
      attributes,
      state: state ?? initialState,
    })

    await db.insert(career).values({
      id: createId(),
      playerId,
      currentClub: initialState.carrera.club,
      currentLeague: divInfo.nombre,
      currentSeason: 1,
      status: "active",
      stats: { goals: 0, assists: 0, matches: 0, rating: 6.0 },
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "Ya tienes un jugador creado" }, { status: 409 })
    }
    throw err
  }

  return NextResponse.json({ success: true, playerId })
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await req.json()
  const { state, attributes } = body

  const updates: Partial<typeof player.$inferInsert> = { updatedAt: new Date() }
  if (state !== undefined) updates.state = state
  if (attributes !== undefined) updates.attributes = attributes

  const updated = await db.update(player)
    .set(updates)
    .where(eq(player.userId, session.user.id))
    .returning({ id: player.id })

  if (updated.length === 0) {
    return NextResponse.json({ error: "No player found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

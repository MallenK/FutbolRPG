import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player } from "@/lib/schema"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"
import { createId } from "@/lib/id"
import { mutatePlayerOr404 } from "@/lib/player-store"
import { conGloria } from "@/lib/gloria"
import { readJson } from "@/lib/http"
import { validarCreacion } from "@/lib/player-creation"
import { getDivisionInfo, type Division } from "@/lib/world"
import { updateRacha, type RachaState } from "@/lib/streak"

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
  posicionesSecundarias?: string[]
}

export type ModoJuego = "completo" | "decisivos" | "simulado"
const MODOS_JUEGO: ModoJuego[] = ["completo", "decisivos", "simulado"]

function buildInitialState(division: Division, rpg?: RpgFields, modoJuego?: string) {
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
    posicionesSecundarias: rpg?.posicionesSecundarias ?? [],
    xp: 0,
    level: 1,
    attributePoints: 0,
    carrera: {
      club,
      liga: divInfo.nombre,
      divisionActual: division,
      modoJuego: MODOS_JUEGO.includes(modoJuego as ModoJuego) ? modoJuego : "completo",
      rol: "Rotación",
      temporada: 1,
      reputacion: 10,
      jornadaActual: 0,
      fixtures: [],
      eventoActual: null,
      eventosPendientes: [],
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
  if (!found) return NextResponse.json({ player: null })

  // Racha diaria: solo se escribe la primera vez que se abre la app en un día
  // natural (UTC). La lectura rápida por HTTP decide si hace falta; la
  // escritura se repite dentro de la transacción por si otra petición ya la
  // hizo entre medias (dos pestañas abriendo la app a la vez).
  if (!updateRacha((found.state as Record<string, unknown>).racha as RachaState | undefined).isNewDay) {
    return NextResponse.json({ player: found })
  }

  return mutatePlayerOr404<Response>(session.user.id, (row) => {
    const state = row.state as Record<string, unknown>
    const { racha, isNewDay } = updateRacha(state.racha as RachaState | undefined)
    if (!isNewDay) return NextResponse.json({ player: row })
    const newState = { ...state, racha, moral: Math.min(100, ((state.moral as number) ?? 85) + 2) }
    return { state: newState, result: NextResponse.json({ player: { ...row, state: conGloria(newState) } }) }
  })
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await readJson(req)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })

  // Atributos, rasgos y potencial se reconstruyen en el servidor a partir de
  // las elecciones del asistente; nunca se acepta un `state` ni unos
  // `attributes` ya calculados por el cliente (ver lib/player-creation.ts).
  const valid = validarCreacion(body)
  if ("error" in valid) return NextResponse.json({ error: valid.error }, { status: 400 })
  const { name, position, nationality, attributes, rpg, modoJuego } = valid

  const division = valid.divisionInicial as Division
  const initialState = buildInitialState(division, rpg, typeof modoJuego === "string" ? modoJuego : undefined)

  const playerId = createId()

  try {
    await db.insert(player).values({
      id: playerId,
      userId: session.user.id,
      name,
      position,
      nationality,
      age: rpg.age,
      attributes,
      state: conGloria(initialState),
    })
    // La tabla `career` ya no se escribe: nunca se leía, todo el estado de la
    // carrera vive en player.state.carrera (informe-fallos.md, Ronda 6, B4).
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "Ya tienes un jugador creado" }, { status: 409 })
    }
    throw err
  }

  return NextResponse.json({ success: true, playerId })
}

// El antiguo PUT /api/player (sobrescribir `state` y `attributes` enteros con
// lo que mandara el cliente) se eliminó: ninguna pantalla lo usaba y permitía
// editarse el personaje a voluntad. Cada cambio legítimo tiene su propia ruta
// validada (profile, upgrade, match/save, season/*).

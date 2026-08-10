import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player, activityLog } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"
import { createId } from "@/lib/id"
import {
  getRivales,
  getDivisionInfo,
  generateCopaState,
  generateEuropaState,
  calcularPuntosLiga,
  simularTablaFinal,
  resolverAscensoDescenso,
  type CopaState,
  type EuropaState,
  type Division,
  type SeleccionState,
  type ContratoState,
} from "@/lib/world"

type Fixture = {
  jornada: number; rival: string; esLocal: boolean; jugado: boolean
  resultado: string | null; golesJugador: number; valoracion: number | null
}

const ROL_ORDEN = ["Reserva", "Rotación", "Titular", "Estrella"] as const
type Rol = typeof ROL_ORDEN[number]

function nextRol(rol: Rol, up: boolean): Rol {
  const idx = ROL_ORDEN.indexOf(rol)
  if (up) return ROL_ORDEN[Math.min(idx + 1, ROL_ORDEN.length - 1)]
  return ROL_ORDEN[Math.max(idx - 1, 0)]
}

function generateFixtures(rivals: string[]): Fixture[] {
  const opponents = rivals.slice(0, 8)
  const raw: Omit<Fixture, "jornada">[] = []
  for (const rival of opponents) {
    raw.push({ rival, esLocal: true,  jugado: false, resultado: null, golesJugador: 0, valoracion: null })
    raw.push({ rival, esLocal: false, jugado: false, resultado: null, golesJugador: 0, valoracion: null })
  }
  raw.sort(() => Math.random() - 0.5)
  return raw.map((f, i) => ({ ...f, jornada: i + 1 }))
}

function calcularPremios(
  stats: Record<string, number>,
  valoracionMedia: number,
  copa: CopaState | undefined,
  europa: EuropaState | undefined,
  seleccion: SeleccionState | undefined,
): string[] {
  const premios: string[] = []
  if (stats.goles >= 10) premios.push("Bota de Oro del Club")
  if (valoracionMedia >= 8.0) premios.push("MVP de la Temporada")
  else if (valoracionMedia >= 7.5) premios.push("Mejor Once")
  if (stats.asistencias >= 8) premios.push("Mejor Asistidor")
  if (stats.goles >= 5 && stats.asistencias >= 5) premios.push("Mejor Jugador Completo")
  if (copa?.campeon) premios.push("Campeón de Copa del Rey")
  if (europa?.eliminatoria?.campeon) {
    const labels: Record<string, string> = {
      champions: "Campeón de la Champions League",
      europa: "Campeón de la Europa League",
      conference: "Campeón de la Conference League",
    }
    premios.push(labels[europa.competicion] ?? "Campeón de Europa")
  }
  if (seleccion?.torneo?.campeon) {
    const labels: Record<string, string> = {
      eurocopa: "Campeón de la Eurocopa",
      mundial: "Campeón del Mundo",
    }
    premios.push(labels[seleccion.torneo.tipo] ?? "Campeón Internacional")
  }
  return premios
}

export async function POST() {
  const { session, error } = await requireSession()
  if (error) return error

  const found = await getPlayerByUserId(session.user.id)
  if (!found) return NextResponse.json({ error: "No player found" }, { status: 404 })

  const state = found.state as Record<string, unknown>
  const carrera = state.carrera as Record<string, unknown>

  const statsTemporada = carrera.estadisticasTemporada as Record<string, number>
  const valoracionMedia = statsTemporada?.valoracionMedia ?? 6.0
  const copaState = (carrera.copa as CopaState | undefined)
  const europaState = (carrera.europa as EuropaState | undefined)
  const seleccionState = (carrera.seleccion as SeleccionState | undefined)
  const contratoState = (carrera.contrato as ContratoState | undefined)

  const premios = calcularPremios(statsTemporada ?? {}, valoracionMedia, copaState, europaState, seleccionState)

  // Acumulado de carrera (ver informe-fallos.md B1): estadisticasTemporada se
  // resetea a 0 más abajo, así que hay que sumar lo de esta temporada antes de
  // perderlo — si no, el leaderboard "de carrera" volvería a 0 cada temporada.
  const statsCarreraPrevias = (carrera.estadisticasCarrera as Record<string, number> | undefined)
    ?? { partidosJugados: 0, goles: 0, asistencias: 0, tarjetasAmarillas: 0, tarjetasRojas: 0 }
  const newEstadisticasCarrera = {
    partidosJugados: statsCarreraPrevias.partidosJugados + (statsTemporada?.partidosJugados ?? 0),
    goles: statsCarreraPrevias.goles + (statsTemporada?.goles ?? 0),
    asistencias: statsCarreraPrevias.asistencias + (statsTemporada?.asistencias ?? 0),
    tarjetasAmarillas: (statsCarreraPrevias.tarjetasAmarillas ?? 0) + (statsTemporada?.tarjetasAmarillas ?? 0),
    tarjetasRojas: (statsCarreraPrevias.tarjetasRojas ?? 0) + (statsTemporada?.tarjetasRojas ?? 0),
  }

  const currentRol = (carrera.rol as Rol) ?? "Rotación"
  const newRol = valoracionMedia >= 7.5
    ? nextRol(currentRol, true)
    : valoracionMedia < 5.5
      ? nextRol(currentRol, false)
      : currentRol

  const division = ((carrera.divisionActual as number) ?? 3) as Division
  const currentClub = (carrera.club as string) ?? ""

  // Ascenso/descenso según la clasificación final de la liga que acaba de cerrarse.
  const fixturesJugados = (carrera.fixtures as { jugado: boolean; resultado: string | null }[]) ?? []
  const puntosJugador = calcularPuntosLiga(fixturesJugados)
  const tablaFinal = simularTablaFinal(division, currentClub, puntosJugador)
  const posicionFinal = tablaFinal.findIndex((e) => e.esJugador) + 1
  const { nuevaDivision, resultado: cambioDivision } = resolverAscensoDescenso(division, posicionFinal, tablaFinal.length)

  const finalDivision = nuevaDivision
  const finalClub = cambioDivision === "ninguno"
    ? currentClub
    : getDivisionInfo(finalDivision).clubes[Math.floor(Math.random() * getDivisionInfo(finalDivision).clubes.length)]
  const finalLiga = getDivisionInfo(finalDivision).nombre

  const rivals = getRivales(finalDivision, finalClub)
  const newFixtures = generateFixtures(rivals)
  const newCopa = generateCopaState()
  const newEuropa = generateEuropaState(finalDivision)

  const newTemporada = ((carrera.temporada as number) ?? 1) + 1
  const newAge = ((found.age as number) ?? 18) + 1
  const newReputacion = (carrera.reputacion as number) ?? 10

  // Contrato: decrement, check expiry
  const contratoRestantes = (contratoState?.temporadasRestantes ?? 2) - 1
  const contratoExpirando = contratoRestantes <= 0
  const newContrato: ContratoState = contratoExpirando
    ? { temporadasRestantes: 2, salarioRelativo: contratoState?.salarioRelativo ?? 2 }
    : { ...(contratoState ?? { temporadasRestantes: 2, salarioRelativo: 2 }), temporadasRestantes: contratoRestantes }

  // Retirement check: generate retirement event at age 37+
  let retiroEvent = null
  if (newAge >= 39) {
    retiroEvent = {
      id: "retiro_forzado",
      tipo: "PERSONAL",
      titulo: "El final de una era",
      descripcion: `Tienes ${newAge} años. Las rodillas no mienten. El cuerpo ya no responde igual que antes. Ha llegado el momento de tomar la decisión más difícil de tu vida.`,
      opciones: [
        {
          id: "retirarse",
          texto: "Anunciar el retiro dignamente",
          narrativo: "Con lágrimas en los ojos y la cabeza alta, anuncias tu retirada en rueda de prensa. La ovación del estadio se quedará contigo para siempre.",
          efectos: { moral: 10, reputacion: 15 },
        },
        {
          id: "una_mas",
          texto: "Un año más, hay combustible",
          narrativo: "Firmas por una temporada más. El vestuario te respeta, pero todos saben que el final está cerca.",
          efectos: { moral: -5, fatiga: 20, forma: -15 },
        },
      ],
    }
  } else if (newAge >= 37) {
    retiroEvent = {
      id: "retiro_consideracion",
      tipo: "PERSONAL",
      titulo: "¿Cuánto tiempo queda?",
      descripcion: `${newAge} años. Llevas toda una carrera dándolo todo. Los medios empiezan a hablar de tu legado. ¿Cómo quieres que acabe tu historia?`,
      opciones: [
        {
          id: "seguir_competiendo",
          texto: "Todavía tengo mucho que dar",
          narrativo: "La motivación sigue intacta. Te entrenas con más dedicación que nunca para demostrar que el tiempo no pasa.",
          efectos: { moral: 8, forma: 5 },
        },
        {
          id: "pensar_retiro",
          texto: "Empezar a pensar en el siguiente capítulo",
          narrativo: "Empiezas a delegar, a transmitir conocimiento. El vestuario te ve como un referente que ya piensa más allá del fútbol.",
          efectos: { moral: 5, confianza_vestuario: 10, reputacion: 5 },
        },
      ],
    }
  }

  // Contract event if expiring
  let contratoEvent = null
  if (contratoExpirando) {
    contratoEvent = {
      id: "contrato_expirado",
      tipo: "TRANSFERENCIA",
      titulo: "Tu contrato ha expirado",
      descripcion: `Tu contrato con ${currentClub} ha llegado a su fin. Eres agente libre. Los clubes están atentos.`,
      opciones: [
        {
          id: "renovar_club_actual",
          texto: "Renovar con el club actual",
          narrativo: "Las negociaciones son rápidas. Sigues en casa.",
          efectos: { moral: 5, confianza_entrenador: 5 },
        },
        {
          id: "buscar_nuevo_club",
          texto: "Explorar el mercado como agente libre",
          narrativo: "Tu representante empieza a mover hilos. Hay interés de varios clubes.",
          efectos: { reputacion: 3 },
        },
      ],
    }
  } else if (contratoRestantes === 1) {
    contratoEvent = {
      id: "contrato_ultimo_ano",
      tipo: "TRANSFERENCIA",
      titulo: "Último año de contrato",
      descripcion: `Solo queda un año de contrato con ${currentClub}. El club espera una respuesta sobre tu futuro.`,
      opciones: [
        {
          id: "firmar_renovacion",
          texto: "Firmar la renovación que te ofrecen",
          narrativo: "Estabilidad asegurada. El director deportivo te da la mano satisfecho.",
          efectos: { moral: 5, confianza_entrenador: 8 },
        },
        {
          id: "esperar_mejores_ofertas",
          texto: "Esperar a ver si llegan mejores ofertas",
          narrativo: "El club no está contento con tu postura, pero respeta tu decisión. La tensión es palpable.",
          efectos: { moral: -3, confianza_entrenador: -10 },
        },
      ],
    }
  }

  // Use retiro event first if retirement age, then contrato event
  const nextEventoActual = retiroEvent ?? contratoEvent ?? null

  // Selección: reset parón for new season, keep caps/goals/torneo
  const newSeleccion: SeleccionState | undefined = seleccionState
    ? {
        ...seleccionState,
        convocado: newReputacion >= 35 && finalDivision >= 3,
        paron: undefined,
      }
    : undefined

  const newCarrera = {
    ...carrera,
    rol: newRol,
    temporada: newTemporada,
    jornadaActual: 1,
    eventoActual: nextEventoActual,
    premios: [],
    fixtures: newFixtures,
    copa: newCopa,
    europa: newEuropa,
    contrato: newContrato,
    club: finalClub,
    liga: finalLiga,
    divisionActual: finalDivision,
    estadisticasCarrera: newEstadisticasCarrera,
    ...(newSeleccion ? { seleccion: newSeleccion } : {}),
    ultimosPartidos: [],
    estadisticasTemporada: {
      partidosJugados: 0,
      goles: 0,
      asistencias: 0,
      valoracionMedia: 6.0,
      tarjetasAmarillas: 0,
      tarjetasRojas: 0,
    },
    // Las amarillas de una temporada no arrastran sanción a la siguiente —
    // mismo criterio que en el fútbol real.
    sancion: { partidosRestantes: 0 },
  }

  const newState = {
    ...state,
    fatiga: 0,
    forma: Math.min(100, ((state.forma as number) ?? 80) + 10),
    carrera: newCarrera,
  }

  await db.update(player)
    .set({ state: newState, age: newAge, updatedAt: new Date() })
    .where(eq(player.userId, session.user.id))

  const subioRol = newRol !== currentRol && ROL_ORDEN.indexOf(newRol) > ROL_ORDEN.indexOf(currentRol)

  await db.insert(activityLog).values({
    id: createId(),
    userId: session.user.id,
    playerName: found.name,
    playerPosition: found.position,
    clubName: currentClub,
    eventType: "season_end",
    data: {
      temporada: newTemporada - 1,
      goles: statsTemporada?.goles ?? 0,
      asistencias: statsTemporada?.asistencias ?? 0,
      valoracionMedia: statsTemporada?.valoracionMedia ?? 6.0,
      premios,
      rolAnterior: currentRol,
      rolNuevo: newRol,
      subioRol,
      posicionFinal,
      cambioDivision,
      capasSeleccion: seleccionState?.capas ?? 0,
      torneoGanado: seleccionState?.torneo?.campeon ?? false,
    },
  })

  return NextResponse.json({
    success: true,
    resumen: {
      temporada: newTemporada - 1,
      club: currentClub,
      stats: statsTemporada,
      premios,
      rolAnterior: currentRol,
      rolNuevo: newRol,
      subioRol,
      liga: {
        posicionFinal,
        totalEquipos: tablaFinal.length,
        cambioDivision,
        clubAnterior: currentClub,
        clubNuevo: finalClub,
        divisionAnterior: division,
        divisionNueva: finalDivision,
        ligaNueva: finalLiga,
      },
      seleccion: {
        capas: seleccionState?.capas ?? 0,
        goles: seleccionState?.golesSeleccion ?? 0,
        torneoTipo: seleccionState?.torneo?.tipo ?? null,
        torneoFase: seleccionState?.torneo?.fase ?? null,
        campeon: seleccionState?.torneo?.campeon ?? false,
      },
      contrato: {
        expiraba: contratoExpirando,
        temporadasRestantes: newContrato.temporadasRestantes,
      },
      edadRetiro: newAge >= 37,
    },
  })
}

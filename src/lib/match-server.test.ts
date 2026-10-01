import { describe, it, expect } from "vitest"
import {
  claveDePartido,
  completarAutomatico,
  cuerpoDeGuardado,
  iniciarPartido,
  mapDbPlayer,
  partidoVigente,
  resolverTurno,
} from "./match-server"
import { buildAttributes } from "./player-config"
import { generateFixtures } from "./fixtures"
import { sanearMatchSave } from "./match-validation"
import { gloriaDeEstado, conGloria } from "./gloria"

const carreraConLiga = () => ({
  temporada: 1,
  jornadaActual: 1,
  club: "Club A",
  liga: "Liga Test",
  fixtures: generateFixtures(["A", "B", "C", "D", "E", "F", "G", "H"]),
})

const fila = (carrera: Record<string, unknown> = carreraConLiga(), extraState: Record<string, unknown> = {}) => ({
  id: "p1",
  name: "Test",
  position: "ST",
  nationality: "España",
  age: 20,
  attributes: buildAttributes("ST", "academia", {}, "derecho"),
  state: { fatiga: 10, forma: 80, moral: 85, traits: [], posicionesSecundarias: ["W"], carrera, ...extraState },
})

describe("partido en servidor", () => {
  it("iniciarPartido crea el turno 1 con contexto de liga y clave de jornada", () => {
    const p = iniciarPartido(fila(), "liga", { id: "m1" })
    expect(p.matchState.turno).toBe(1)
    expect(p.situacion.opciones.length).toBeGreaterThan(0)
    expect(p.contexto.ronda).toBe("Jornada 1")
    expect(p.clave).toBe("1:liga:1")
    expect(p.posicionEfectiva).toBeUndefined()
  })

  it("jugar en la posición secundaria solo si se pide", () => {
    expect(iniciarPartido(fila(), "liga", { id: "m1", jugarSecundaria: true }).posicionEfectiva).toBe("W")
  })

  it("resolverTurno tira el dado con el random del servidor y avanza el turno", () => {
    const row = fila()
    const p = iniciarPartido(row, "liga", { id: "m1" })
    const r = resolverTurno(p, mapDbPlayer(row), p.situacion.opciones[0].id, () => 0.999)
    if ("error" in r) throw new Error(r.error)
    expect(r.respuesta.roll).toBe(20)
    expect(r.respuesta.turno).toBe(1)
    expect(r.respuesta.matchState.log).toHaveLength(1)
    if (!r.respuesta.finished) expect(r.partido.matchState.turno).toBe(2)
  })

  it("rechaza una opción que no pertenece a la situación actual", () => {
    const row = fila()
    const p = iniciarPartido(row, "liga", { id: "m1" })
    expect(resolverTurno(p, mapDbPlayer(row), "opcion_inventada")).toEqual({ error: "invalid_option" })
  })

  it("completarAutomatico juega todos los turnos y el guardado resultante es válido", () => {
    const row = fila()
    const jugador = mapDbPlayer(row)
    // Id con el formato real de createId (24 hex): sanearMatchSave descarta ids cortos.
    const terminado = completarAutomatico(iniciarPartido(row, "liga", { id: "a1b2c3d4e5f6a1b2c3d4e5f6" }), jugador)
    expect(terminado.matchState.log).toHaveLength(terminado.matchState.totalTurnos)

    const body = cuerpoDeGuardado(terminado, jugador)
    const saneado = sanearMatchSave(body as unknown as Record<string, unknown>)
    if ("error" in saneado) throw new Error(saneado.error)
    // Lo que calcula el servidor nunca debe necesitar recortes.
    expect(saneado.matchStats.goles).toBe(terminado.matchState.goles)
    expect(saneado.matchStats.asistencias).toBe(terminado.matchState.asistencias)
    expect(saneado.matchId).toBe("a1b2c3d4e5f6a1b2c3d4e5f6")
    expect(body.updatedState?.fatiga).toBe(30)
  })

  it("un partido deja de estar vigente si su jornada ya no es la pendiente", () => {
    const carrera = carreraConLiga()
    const p = iniciarPartido(fila(carrera), "liga", { id: "m1" })
    expect(partidoVigente(p, carrera)).toBe(true)
    expect(partidoVigente(p, { ...carrera, jornadaActual: 2 })).toBe(false)
    expect(partidoVigente(null, carrera)).toBe(false)
  })

  it("la clave distingue temporada y ronda", () => {
    expect(claveDePartido("liga", { temporada: 2, jornadaActual: 5 })).toBe("2:liga:5")
    expect(claveDePartido("copa", { temporada: 1, copa: { rondaIdx: 3 } })).toBe("1:copa:3")
  })
})

describe("gloria precalculada", () => {
  it("se deriva del estado y nunca se fía de un valor de fuera", () => {
    const state = { gloria: 99999, carrera: { reputacion: 40, historialTemporadas: [] } }
    expect(gloriaDeEstado(state)).toBe(20)
    expect(conGloria(state).gloria).toBe(20)
  })

  it("aguanta estados vacíos o antiguos", () => {
    expect(gloriaDeEstado(undefined)).toBe(0)
    expect(gloriaDeEstado({})).toBe(0)
  })
})

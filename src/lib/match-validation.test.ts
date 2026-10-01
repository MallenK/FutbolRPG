import { describe, it, expect } from "vitest"
import { sanearMatchSave, sanearMarcador, hayPartidoPendiente } from "./match-validation"
import { generateFixtures, ligaTerminada, shuffle } from "./fixtures"

describe("sanearMatchSave", () => {
  const base = {
    tipo: "liga",
    matchStats: { goles: 2, asistencias: 1, valoracion: 8.4, marcador: "3-1", tarjetasAmarillas: 0, tarjetasRojas: 0 },
    updatedState: { fatiga: 40 },
  }

  it("acepta un partido normal tal cual", () => {
    const r = sanearMatchSave(base)
    expect("error" in r).toBe(false)
    if ("error" in r) return
    expect(r.matchStats).toEqual({ goles: 2, asistencias: 1, valoracion: 8.4, marcador: "3-1", tarjetasAmarillas: 0, tarjetasRojas: 0 })
    expect(r.ganado).toBe(true)
    expect(r.fatiga).toBe(40)
  })

  it("recorta goles y asistencias imposibles para el marcador", () => {
    const r = sanearMatchSave({ ...base, matchStats: { goles: 999, asistencias: 50, valoracion: 99, marcador: "3-1" } })
    if ("error" in r) throw new Error(r.error)
    expect(r.matchStats.goles).toBe(3)
    expect(r.matchStats.asistencias).toBe(0)
    expect(r.matchStats.valoracion).toBe(10)
  })

  it("ignora cualquier campo de estado que no sea la fatiga", () => {
    const r = sanearMatchSave({
      ...base,
      updatedState: { fatiga: 500, carrera: { historialTemporadas: [{ premios: ["x"] }] }, traits: ["todo"] },
    })
    if ("error" in r) throw new Error(r.error)
    expect(r.fatiga).toBe(100)
    expect(Object.keys(r)).not.toContain("updatedState")
  })

  it("deduce 'ganado' del marcador, no del flag del cliente", () => {
    const r = sanearMatchSave({ ...base, ganado: true, matchStats: { ...base.matchStats, goles: 0, asistencias: 0, marcador: "0-2" } })
    if ("error" in r) throw new Error(r.error)
    expect(r.ganado).toBe(false)
  })

  it("rechaza tipos de partido desconocidos y bodies sin estadísticas", () => {
    expect(sanearMatchSave({ ...base, tipo: "mundialito" })).toHaveProperty("error")
    expect(sanearMatchSave({ tipo: "liga" })).toHaveProperty("error")
  })

  it("solo acepta matchId con formato de identificador", () => {
    const ok = sanearMatchSave({ ...base, matchId: "8f14e45f-ceea-467a-9575-1c2b3d4e5f60" })
    const ko = sanearMatchSave({ ...base, matchId: "<script>" })
    if ("error" in ok || "error" in ko) throw new Error("inesperado")
    expect(ok.matchId).toBeDefined()
    expect(ko.matchId).toBeUndefined()
  })
})

describe("sanearMarcador", () => {
  it("normaliza marcadores inválidos a 0-0", () => {
    expect(sanearMarcador("hola").marcador).toBe("0-0")
    expect(sanearMarcador(undefined).marcador).toBe("0-0")
    expect(sanearMarcador(" 2-1 ").marcador).toBe("2-1")
  })
})

describe("hayPartidoPendiente", () => {
  it("liga: solo si la jornada actual tiene partido sin jugar", () => {
    const fixtures = generateFixtures(["A", "B", "C", "D", "E", "F", "G", "H"])
    expect(hayPartidoPendiente("liga", { jornadaActual: 1, fixtures })).toBe(true)
    const jugados = fixtures.map((f) => ({ ...f, jugado: true }))
    expect(hayPartidoPendiente("liga", { jornadaActual: 17, fixtures: jugados })).toBe(false)
  })

  it("copa: no si ya estás eliminado o eres campeón", () => {
    expect(hayPartidoPendiente("copa", { copa: { eliminado: false, campeon: false } })).toBe(true)
    expect(hayPartidoPendiente("copa", { copa: { eliminado: true, campeon: false } })).toBe(false)
    expect(hayPartidoPendiente("copa", {})).toBe(false)
  })

  it("selección: solo con un parón activo", () => {
    expect(hayPartidoPendiente("seleccion", { seleccion: { paron: { activo: true } } })).toBe(true)
    expect(hayPartidoPendiente("seleccion", { seleccion: { paron: { activo: false } } })).toBe(false)
  })
})

describe("fixtures", () => {
  it("genera 16 jornadas con ida y vuelta contra 8 rivales", () => {
    const f = generateFixtures(["A", "B", "C", "D", "E", "F", "G", "H", "I"])
    expect(f).toHaveLength(16)
    expect(f.map((x) => x.jornada)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1))
    for (const rival of ["A", "B", "C", "D", "E", "F", "G", "H"]) {
      const partidos = f.filter((x) => x.rival === rival)
      expect(partidos.map((p) => p.esLocal).sort()).toEqual([false, true])
    }
  })

  it("shuffle es una permutación y no pierde elementos", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    const out = shuffle(items, () => 0.3)
    expect([...out].sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it("ligaTerminada exige calendario y todo jugado", () => {
    expect(ligaTerminada(undefined)).toBe(false)
    expect(ligaTerminada([])).toBe(false)
    expect(ligaTerminada([{ jugado: true }, { jugado: false }])).toBe(false)
    expect(ligaTerminada([{ jugado: true }, { jugado: true }])).toBe(true)
  })
})

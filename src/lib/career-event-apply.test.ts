import { describe, it, expect } from "vitest"
import { aplicarOpcionEvento, elegirOpcionAutomatica, esOpcionDeRetiro } from "./career-event-apply"
import type { CareerEvent, OpcionEvento } from "@/engine/career-events"

const opcion = (id: string, efectos: OpcionEvento["efectos"], extra: Partial<OpcionEvento> = {}): OpcionEvento => ({
  id, texto: id, narrativo: id, efectos, ...extra,
})

const evento = (opciones: OpcionEvento[], extra: Partial<CareerEvent> = {}): CareerEvent => ({
  id: "ev_test", tipo: "EQUIPO", titulo: "Test", descripcion: "", opciones, ...extra,
})

const state = () => ({
  moral: 50, forma: 50, fatiga: 10, riesgoLesion: 5, attributePoints: 0,
  traits: ["mentalidad_acero"],
  confianza: { entrenador: 60, vestuario: 50 },
  carrera: { reputacion: 20, divisionActual: 3, club: "Club A", eventosPendientes: [], eventosResueltos: [] },
})

describe("aplicarOpcionEvento", () => {
  it("aplica todos los efectos: los mismos en modo manual y simulado", () => {
    const op = opcion("a", { moral: 10, attributePoints: 2, addTrait: "lider_vestuario", confianza_entrenador: 5, riesgoLesion: 3 })
    const s = aplicarOpcionEvento(state(), evento([op]), op)
    expect(s.moral).toBe(60)
    expect(s.attributePoints).toBe(2)
    expect(s.traits).toContain("lider_vestuario")
    expect((s.confianza as Record<string, number>).entrenador).toBe(65)
    expect(s.riesgoLesion).toBe(8)
    expect((s.carrera as { eventosResueltos: string[] }).eventosResueltos).toEqual(["ev_test"])
  })

  it("recorta a 0-100 y nunca deja puntos de atributo negativos", () => {
    const op = opcion("a", { moral: 500, fatiga: -500, attributePoints: -10 })
    const s = aplicarOpcionEvento(state(), evento([op]), op)
    expect(s.moral).toBe(100)
    expect(s.fatiga).toBe(0)
    expect(s.attributePoints).toBe(0)
  })

  it("'Mentalidad de Acero' ignora la moral negativa de la prensa", () => {
    const op = opcion("a", { moral: -20 })
    const s = aplicarOpcionEvento(state(), evento([op], { tipo: "PRENSA" }), op)
    expect(s.moral).toBe(50)
  })

  it("resuelve el traspaso a 'la división siguiente'", () => {
    const op = opcion("a", { transferirA: { club: "__NEXT_DIVISION_CLUB__", liga: "__NEXT_DIVISION_NAME__", rol: "Titular", division: -1 } })
    const s = aplicarOpcionEvento(state(), evento([op]), op, () => 0)
    const carrera = s.carrera as Record<string, unknown>
    expect(carrera.divisionActual).toBe(4)
    expect(carrera.club).not.toBe("__NEXT_DIVISION_CLUB__")
    expect(carrera.rol).toBe("Titular")
  })

  it("saca el siguiente evento de la cola de pendientes", () => {
    const siguiente = evento([opcion("x", {})], { id: "ev_2" })
    const st = { ...state(), carrera: { ...state().carrera, eventosPendientes: [siguiente] } }
    const op = opcion("a", {})
    const s = aplicarOpcionEvento(st, evento([op]), op)
    const carrera = s.carrera as { eventoActual: CareerEvent | null; eventosPendientes: CareerEvent[] }
    expect(carrera.eventoActual?.id).toBe("ev_2")
    expect(carrera.eventosPendientes).toEqual([])
  })
})

describe("elegirOpcionAutomatica", () => {
  it("nunca elige retirarse", () => {
    const retiro = evento([opcion("retirarse", {}), opcion("una_mas", {})], { id: "retiro_forzado" })
    for (const r of [0, 0.49, 0.99]) {
      expect(elegirOpcionAutomatica(retiro, {}, () => r).id).toBe("una_mas")
    }
    expect(esOpcionDeRetiro(retiro, retiro.opciones[0])).toBe(true)
  })

  it("prefiere la opción cuyo requisito de stat se cumple", () => {
    const ev = evento([
      opcion("a", {}),
      opcion("b", {}, { requiereStat: { stat: "tiro", minValue: 70 } }),
    ])
    expect(elegirOpcionAutomatica(ev, { tiro: 80 }, () => 0).id).toBe("b")
    expect(elegirOpcionAutomatica(ev, { tiro: 10 }, () => 0).id).toBe("a")
  })
})

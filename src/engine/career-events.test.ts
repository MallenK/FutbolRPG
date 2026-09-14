import { describe, it, expect } from "vitest"
import { pickRandomEvent, getEventById, CAREER_EVENTS } from "./career-events"

describe("getEventById", () => {
  it("encuentra un evento existente por id", () => {
    const anyEvent = CAREER_EVENTS[0]
    expect(getEventById(anyEvent.id)).toBe(anyEvent)
  })

  it("devuelve undefined para un id inexistente", () => {
    expect(getEventById("id_que_no_existe_xyz")).toBeUndefined()
  })
})

describe("pickRandomEvent", () => {
  it("nunca devuelve un evento marcado esArco (solo aparecen como seguimiento)", () => {
    for (let i = 0; i < 300; i++) {
      const evento = pickRandomEvent(10, 3)
      expect(evento.esArco).not.toBe(true)
    }
  })

  it("respeta el filtro de posición: un evento con posiciones definidas solo sale si el contexto coincide", () => {
    // Buscamos un evento gateado SOLO por posición (sin minJornada/minDivision/minReputacion/
    // requiereStats) para aislar el efecto del filtro de posición del resto de condiciones.
    const eventoConPosicion = CAREER_EVENTS.find(
      (e) =>
        e.posiciones && e.posiciones.length > 0 && !e.esArco &&
        !e.minJornada && !e.minDivision && !e.maxDivision && !e.minReputacion && !e.requiereStats && !e.roles?.length
    )
    expect(eventoConPosicion).toBeDefined()
    const posicionValida = eventoConPosicion!.posiciones![0]

    // Excluimos todos los demás eventos para forzar que, si aparece alguno, sea el nuestro
    const excludeIds = CAREER_EVENTS.filter((e) => e.id !== eventoConPosicion!.id).map((e) => e.id)

    // Con la posición correcta en el contexto, el pool disponible puede contener el evento
    const conPosicionCorrecta = pickRandomEvent(10, 5, excludeIds, { position: posicionValida })
    expect(conPosicionCorrecta.id).toBe(eventoConPosicion!.id)

    // Con una posición que NO está en la lista permitida, el evento no debe aparecer;
    // como todos los demás están excluidos, pickRandomEvent cae al fallback general (ignora exclude)
    const posicionInvalida = (["GK", "CB", "FB", "CM", "AM", "W", "ST"] as string[]).find(
      (p) => !eventoConPosicion!.posiciones!.includes(p)
    )!
    const conPosicionIncorrecta = pickRandomEvent(10, 5, excludeIds, { position: posicionInvalida })
    // El pool filtrado queda vacío (excluidos todos + el único no excluido no aplica por posición),
    // por lo que cae al fallback de "todos los eventos no-arco" y puede devolver cualquier evento,
    // pero NUNCA debe ser el evento gateado por posición con una posición que no la cumple.
    if (conPosicionIncorrecta.id === eventoConPosicion!.id) {
      throw new Error("pickRandomEvent devolvió un evento cuya condición de posición no se cumple")
    }
  })

  it("respeta minDivision: un evento con minDivision alto no aparece en divisiones bajas cuando hay alternativas", () => {
    const eventoAltaDivision = CAREER_EVENTS.find((e) => e.minDivision && e.minDivision >= 4 && !e.esArco)
    expect(eventoAltaDivision).toBeDefined()

    for (let i = 0; i < 100; i++) {
      const evento = pickRandomEvent(10, 1) // división 1, por debajo del mínimo requerido
      expect(evento.id).not.toBe(eventoAltaDivision!.id)
    }
  })

  it("respeta minReputacion: un evento que requiere reputación alta no aparece con reputación baja", () => {
    const eventoConReputacion = CAREER_EVENTS.find((e) => e.minReputacion && e.minReputacion > 0 && !e.esArco)
    expect(eventoConReputacion).toBeDefined()

    for (let i = 0; i < 100; i++) {
      const evento = pickRandomEvent(10, 5, [], { reputacion: 0 })
      expect(evento.id).not.toBe(eventoConReputacion!.id)
    }
  })

  it("respeta excludeIds: un evento excluido no puede salir mientras existan alternativas sin restricciones", () => {
    const sinCondiciones = CAREER_EVENTS.filter(
      (e) => !e.esArco && !e.minJornada && !e.minDivision && !e.maxDivision && !e.posiciones?.length && !e.roles?.length && !e.minReputacion && !e.requiereStats
    )
    expect(sinCondiciones.length).toBeGreaterThan(1)
    const excluido = sinCondiciones[0]

    for (let i = 0; i < 50; i++) {
      const evento = pickRandomEvent(10, 3, [excluido.id], {})
      expect(evento.id).not.toBe(excluido.id)
    }
  })

  it("si el pool filtrado queda vacío, recurre al fallback de todos los eventos no-arco", () => {
    // División y jornada imposibles + excluir todo salvo un evento inaccesible fuerza el fallback
    const allIds = CAREER_EVENTS.filter((e) => !e.esArco).map((e) => e.id)
    const evento = pickRandomEvent(9999, 5, allIds, {})
    expect(evento).toBeDefined()
    expect(evento.esArco).not.toBe(true)
  })
})

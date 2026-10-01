import { describe, it, expect } from "vitest"
import { validarCreacion, validarReparto } from "./player-creation"
import { buildAttributes, EXTRA_POINTS, MAX_PER_STAT } from "./player-config"

const body = {
  name: "Carlos García",
  position: "ST",
  nationality: "Argentina",
  divisionInicial: 3,
  extraPoints: { tiro: 10, regate: 5 },
  rpg: { origen: "calle", piernaDominante: "izquierdo", traits: ["improvisador", "goleador_nato"], age: 20, dorsal: 9 },
}

describe("validarCreacion", () => {
  it("reconstruye los atributos en el servidor con las reglas del asistente", () => {
    const r = validarCreacion(body)
    if ("error" in r) throw new Error(r.error)
    expect(r.attributes).toEqual(buildAttributes("ST", "calle", { tiro: 10, regate: 5 }, "izquierdo"))
    expect(r.rpg.traits).toEqual(["improvisador", "goleador_nato"])
    expect(r.nationality).toBe("Argentina")
  })

  it("ignora atributos y estado enviados ya calculados por el cliente", () => {
    const r = validarCreacion({
      ...body,
      attributes: { tecnicos: { tiro: 99 } },
      state: { level: 99 },
    })
    if ("error" in r) throw new Error(r.error)
    expect(r.attributes.tecnicos.tiro).toBeLessThan(99)
    expect(r).not.toHaveProperty("state")
  })

  it("no deja elegir un rasgo de otra posición ni dos rasgos extra", () => {
    const r = validarCreacion({ ...body, position: "GK", rpg: { ...body.rpg, traits: ["goleador_nato", "velocista"] } })
    if ("error" in r) throw new Error(r.error)
    expect(r.rpg.traits).toHaveLength(2)
    expect(r.rpg.traits).not.toContain("goleador_nato")
  })

  it("rechaza posiciones inventadas y nombres vacíos", () => {
    expect(validarCreacion({ ...body, position: "XX" })).toHaveProperty("error")
    expect(validarCreacion({ ...body, name: "   " })).toHaveProperty("error")
  })

  it("recorta valores fuera de rango y usa defaults seguros", () => {
    const r = validarCreacion({ ...body, nationality: "Atlántida", divisionInicial: 42, rpg: { ...body.rpg, dorsal: 500, age: 3 } })
    if ("error" in r) throw new Error(r.error)
    expect(r.nationality).toBe("España")
    expect(r.divisionInicial).toBe(5)
    expect(r.rpg.dorsal).toBe(99)
    expect(r.rpg.age).toBe(16)
  })
})

describe("validarReparto", () => {
  it("acepta exactamente el presupuesto", () => {
    expect(validarReparto({ tiro: MAX_PER_STAT, regate: EXTRA_POINTS - MAX_PER_STAT })).not.toHaveProperty("error")
  })

  it("rechaza pasarse del presupuesto, del máximo por stat o stats inventados", () => {
    expect(validarReparto({ tiro: MAX_PER_STAT, regate: MAX_PER_STAT, pase: 1 })).toHaveProperty("error")
    expect(validarReparto({ tiro: MAX_PER_STAT + 1 })).toHaveProperty("error")
    expect(validarReparto({ superpoder: 1 })).toHaveProperty("error")
    expect(validarReparto({ tiro: -3 })).toHaveProperty("error")
    expect(validarReparto({ tiro: 1.5 })).toHaveProperty("error")
  })
})

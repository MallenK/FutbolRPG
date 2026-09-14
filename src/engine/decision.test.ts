import { describe, it, expect } from "vitest"
import { resolveDecision, resolveStatValue } from "./decision"
import { createDefaultPlayer } from "./player"
import { DecisionOption, DecisionContext } from "./types"

const baseContext: DecisionContext = {
  dificultadBase: 30,
  presionSituacional: 20,
  bonusContexto: 0,
}

const optionFor = (statPrincipal: string, pesoStat = 1, riesgo = 0.1): DecisionOption => ({
  id: "opt",
  texto: "opción de prueba",
  statPrincipal,
  pesoStat,
  riesgo,
} as DecisionOption)

describe("resolveStatValue", () => {
  it("encuentra el stat en el grupo correcto (técnico/físico/táctico/mental)", () => {
    const player = createDefaultPlayer()
    expect(resolveStatValue("tiro", player)).toBe(player.tecnicos.tiro)
    expect(resolveStatValue("velocidad", player)).toBe(player.fisicos.velocidad)
    expect(resolveStatValue("vision", player)).toBe(player.tacticos.vision)
    expect(resolveStatValue("confianza", player)).toBe(player.mentales.confianza)
  })

  it("devuelve 50 por defecto si el stat no existe", () => {
    const player = createDefaultPlayer()
    expect(resolveStatValue("stat_inexistente", player)).toBe(50)
  })
})

describe("resolveDecision", () => {
  it("el score siempre queda acotado entre 0 y 100", () => {
    const player = createDefaultPlayer()
    for (let i = 0; i < 200; i++) {
      const { score } = resolveDecision(optionFor("tiro"), player, baseContext)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    }
  })

  it("un jugador con stat alto rinde mejor en promedio que uno con stat bajo", () => {
    const fuerte = createDefaultPlayer()
    fuerte.tecnicos.tiro = 95

    const debil = createDefaultPlayer()
    debil.tecnicos.tiro = 20

    const N = 300
    let sumaFuerte = 0
    let sumaDebil = 0
    for (let i = 0; i < N; i++) {
      sumaFuerte += resolveDecision(optionFor("tiro"), fuerte, baseContext).score
      sumaDebil += resolveDecision(optionFor("tiro"), debil, baseContext).score
    }
    expect(sumaFuerte / N).toBeGreaterThan(sumaDebil / N)
  })

  it("mayor dificultad reduce el score medio", () => {
    const player = createDefaultPlayer()
    const facil: DecisionContext = { ...baseContext, dificultadBase: 10 }
    const dificil: DecisionContext = { ...baseContext, dificultadBase: 80 }

    const N = 300
    let sumaFacil = 0
    let sumaDificil = 0
    for (let i = 0; i < N; i++) {
      sumaFacil += resolveDecision(optionFor("tiro"), player, facil).score
      sumaDificil += resolveDecision(optionFor("tiro"), player, dificil).score
    }
    expect(sumaFacil / N).toBeGreaterThan(sumaDificil / N)
  })

  it("la fatiga alta penaliza el score medio", () => {
    const descansado = createDefaultPlayer()
    descansado.estado.fatiga = 0

    const cansado = createDefaultPlayer()
    cansado.estado.fatiga = 90

    const N = 300
    let sumaDescansado = 0
    let sumaCansado = 0
    for (let i = 0; i < N; i++) {
      sumaDescansado += resolveDecision(optionFor("tiro"), descansado, baseContext).score
      sumaCansado += resolveDecision(optionFor("tiro"), cansado, baseContext).score
    }
    expect(sumaDescansado / N).toBeGreaterThan(sumaCansado / N)
  })

  it("devuelve siempre un resultado válido del enum ResultadoDecision", () => {
    const player = createDefaultPlayer()
    const validos = ["PERFECTO", "EXITO", "PARCIAL", "FALLO", "CRITICO_FALLO"]
    for (let i = 0; i < 50; i++) {
      const { resultado } = resolveDecision(optionFor("tiro"), player, baseContext)
      expect(validos).toContain(resultado)
    }
  })
})

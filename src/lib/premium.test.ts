import { describe, it, expect } from "vitest"
import { seasonLimitReached, seleccionLocked, mercadoLocked, FREE_SEASON_LIMIT } from "./premium"

describe("seasonLimitReached", () => {
  it("no bloquea dentro del límite gratuito", () => {
    for (let t = 1; t <= FREE_SEASON_LIMIT; t++) {
      expect(seasonLimitReached(t, false)).toBe(false)
    }
  })

  it("bloquea al superar el límite gratuito", () => {
    expect(seasonLimitReached(FREE_SEASON_LIMIT + 1, false)).toBe(true)
    expect(seasonLimitReached(FREE_SEASON_LIMIT + 10, false)).toBe(true)
  })

  it("nunca bloquea a un usuario premium, sea cual sea la temporada", () => {
    expect(seasonLimitReached(1, true)).toBe(false)
    expect(seasonLimitReached(FREE_SEASON_LIMIT + 50, true)).toBe(false)
  })
})

describe("seleccionLocked / mercadoLocked", () => {
  it("bloqueadas para no premium, desbloqueadas para premium", () => {
    expect(seleccionLocked(false)).toBe(true)
    expect(seleccionLocked(true)).toBe(false)
    expect(mercadoLocked(false)).toBe(true)
    expect(mercadoLocked(true)).toBe(false)
  })
})

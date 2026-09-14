import { describe, it, expect } from "vitest"
import { updateRacha } from "./streak"

describe("updateRacha", () => {
  it("primera vez (sin racha previa): empieza en 1 día", () => {
    const { racha, isNewDay } = updateRacha(undefined, "2026-01-10")
    expect(racha).toEqual({ diasConsecutivos: 1, ultimoDia: "2026-01-10" })
    expect(isNewDay).toBe(true)
  })

  it("mismo día natural: no cambia nada y no cuenta como día nuevo", () => {
    const previa = { diasConsecutivos: 3, ultimoDia: "2026-01-10" }
    const { racha, isNewDay } = updateRacha(previa, "2026-01-10")
    expect(racha).toEqual(previa)
    expect(isNewDay).toBe(false)
  })

  it("día consecutivo (ayer -> hoy): incrementa la racha", () => {
    const previa = { diasConsecutivos: 3, ultimoDia: "2026-01-10" }
    const { racha, isNewDay } = updateRacha(previa, "2026-01-11")
    expect(racha).toEqual({ diasConsecutivos: 4, ultimoDia: "2026-01-11" })
    expect(isNewDay).toBe(true)
  })

  it("día consecutivo cruzando fin de mes/año: incrementa igual", () => {
    const previa = { diasConsecutivos: 5, ultimoDia: "2025-12-31" }
    const { racha } = updateRacha(previa, "2026-01-01")
    expect(racha).toEqual({ diasConsecutivos: 6, ultimoDia: "2026-01-01" })
  })

  it("hueco de más de un día: la racha se reinicia a 1", () => {
    const previa = { diasConsecutivos: 10, ultimoDia: "2026-01-05" }
    const { racha, isNewDay } = updateRacha(previa, "2026-01-10")
    expect(racha).toEqual({ diasConsecutivos: 1, ultimoDia: "2026-01-10" })
    expect(isNewDay).toBe(true)
  })
})

import { describe, it, expect, vi } from "vitest"
import { triggerWeeklyEvent } from "./events"
import { createDefaultPlayer } from "./player"

describe("triggerWeeklyEvent", () => {
  it("no dispara ningún evento si ninguna condición se cumple (jugador neutro)", async () => {
    const player = createDefaultPlayer()
    // Aseguramos que ninguna triggerCondition puede cumplirse:
    player.confianza.entrenador = 80 // evita conflicto_entrenador (requiere <40)
    player.carrera.estadisticasTemporada.valoracionMedia = 6.0 // evita renovacion (>7.5) y ultimatum (<5.5)
    player.carrera.estadisticasTemporada.partidosJugados = 0 // evita ultimatum (requiere >3 partidos)
    player.confianza.reputacion = 10 // evita presion_mediatica (requiere >60)

    const logger = vi.fn().mockResolvedValue(undefined)
    const result = await triggerWeeklyEvent(player, logger)

    expect(logger).not.toHaveBeenCalled()
    expect(result).toBe(player)
  })

  it("dispara conflicto_entrenador cuando confianza.entrenador < 40 (en repeticiones estadísticas)", async () => {
    const N = 60
    let triggered = 0
    for (let i = 0; i < N; i++) {
      const player = createDefaultPlayer()
      player.confianza.entrenador = 10
      player.carrera.estadisticasTemporada.valoracionMedia = 6.0
      player.carrera.estadisticasTemporada.partidosJugados = 0
      player.confianza.reputacion = 10
      const logger = vi.fn().mockResolvedValue(undefined)
      await triggerWeeklyEvent(player, logger)
      if (logger.mock.calls.some((c) => String(c[0]).includes("CONFLICTO TÁCTICO"))) triggered++
    }
    // triggerCondition tiene un roll interno de 0.3, así que no siempre dispara, pero en 60 intentos
    // con probabilidad constante 0.3 la posibilidad de que nunca dispare es prácticamente nula.
    expect(triggered).toBeGreaterThan(0)
  })

  it("nunca dispara ultima_oportunidad si el jugador no ha jugado más de 3 partidos, aunque la valoración sea baja", async () => {
    for (let i = 0; i < 40; i++) {
      const player = createDefaultPlayer()
      player.confianza.entrenador = 80
      player.confianza.reputacion = 10
      player.carrera.estadisticasTemporada.valoracionMedia = 4.0
      player.carrera.estadisticasTemporada.partidosJugados = 2
      const logger = vi.fn().mockResolvedValue(undefined)
      await triggerWeeklyEvent(player, logger)
      expect(logger.mock.calls.some((c) => String(c[0]).includes("ULTIMÁTUM"))).toBe(false)
    }
  })

  it("registra la decisión elegida en el historial de eventos importantes cuando dispara un evento", async () => {
    const player = createDefaultPlayer()
    player.confianza.entrenador = 5 // fuerza triggerCondition a solo depender del roll < 0.3
    player.carrera.estadisticasTemporada.valoracionMedia = 6.0
    player.carrera.estadisticasTemporada.partidosJugados = 0
    player.confianza.reputacion = 10

    let updatedPlayer = player
    for (let i = 0; i < 60; i++) {
      const fresh = createDefaultPlayer()
      fresh.confianza.entrenador = 5
      fresh.carrera.estadisticasTemporada.valoracionMedia = 6.0
      fresh.carrera.estadisticasTemporada.partidosJugados = 0
      fresh.confianza.reputacion = 10
      const logger = vi.fn().mockResolvedValue(undefined)
      const res = await triggerWeeklyEvent(fresh, logger)
      if (res.carrera.historial.eventosImportantes.length > 0) {
        updatedPlayer = res
        break
      }
    }
    expect(updatedPlayer.carrera.historial.eventosImportantes.length).toBeGreaterThan(0)
    expect(updatedPlayer.carrera.historial.eventosImportantes[0]).toContain("Conflicto Táctico")
  })
})

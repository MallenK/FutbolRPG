import { describe, it, expect } from "vitest"
import { generateLeagueTable, resolveCupMatch, processPromotionRelegation } from "./competition"
import { WorldState } from "./types"
import { TEAMS_PRIMERA_BASE, TEAMS_SEGUNDA_BASE } from "./database"

describe("generateLeagueTable", () => {
  it("devuelve una fila por cada equipo y las posiciones son 1..N sin huecos", () => {
    const teams = TEAMS_PRIMERA_BASE.slice(0, 10)
    const { table } = generateLeagueTable(teams, teams[0], 6.5)
    expect(table).toHaveLength(teams.length)
    const posiciones = table.map((r) => r.pos).sort((a, b) => a - b)
    expect(posiciones).toEqual(Array.from({ length: teams.length }, (_, i) => i + 1))
  })

  it("la tabla está ordenada de mayor a menor puntuación", () => {
    const teams = TEAMS_PRIMERA_BASE.slice(0, 10)
    const { table } = generateLeagueTable(teams, teams[0], 6.5)
    for (let i = 1; i < table.length; i++) {
      expect(table[i - 1].pts).toBeGreaterThanOrEqual(table[i].pts)
    }
  })

  it("el ganador es siempre el equipo en la posición 1", () => {
    const teams = TEAMS_PRIMERA_BASE.slice(0, 10)
    const { table, winner } = generateLeagueTable(teams, teams[0], 6.5)
    expect(winner).toBe(table[0].team)
  })

  it("un rendimiento (playerPerformance) alto favorece en promedio la puntuación del equipo del jugador", () => {
    const teams = TEAMS_PRIMERA_BASE.slice(0, 10)
    const playerTeam = teams[5]
    const N = 200
    let sumaAlto = 0
    let sumaBajo = 0
    for (let i = 0; i < N; i++) {
      const { table: tAlto } = generateLeagueTable(teams, playerTeam, 9.5)
      const { table: tBajo } = generateLeagueTable(teams, playerTeam, 3.0)
      sumaAlto += tAlto.find((r) => r.team === playerTeam)!.pts
      sumaBajo += tBajo.find((r) => r.team === playerTeam)!.pts
    }
    expect(sumaAlto / N).toBeGreaterThan(sumaBajo / N)
  })
})

describe("resolveCupMatch", () => {
  it("siempre devuelve un ganador que es playerTeam o rival", () => {
    for (let i = 0; i < 200; i++) {
      const res = resolveCupMatch("Rival FC", "Mi Equipo", true, 7.0)
      expect(["Mi Equipo", "Rival FC"]).toContain(res.winner)
    }
  })

  it("el método siempre es uno de Regular, Prórroga o Penaltis", () => {
    for (let i = 0; i < 200; i++) {
      const res = resolveCupMatch("Rival FC", "Mi Equipo", true, 7.0)
      expect(["Regular", "Prórroga", "Penaltis"]).toContain(res.method)
    }
  })

  it("cuando el método es Penaltis, el score incluye el marcador de penaltis entre paréntesis", () => {
    // Forzamos muchas repeticiones para encontrar al menos un caso de penaltis
    let foundPenalties = false
    for (let i = 0; i < 500 && !foundPenalties; i++) {
      const res = resolveCupMatch("Rival FC", "Mi Equipo", true, 7.0)
      if (res.method === "Penaltis") {
        foundPenalties = true
        expect(res.score).toMatch(/\(\d+-\d+ PEN\)$/)
      }
    }
    expect(foundPenalties).toBe(true)
  })

  it("un playerRating alto (jugando) favorece en promedio la victoria del playerTeam", () => {
    const N = 400
    let winsAlto = 0
    let winsBajo = 0
    for (let i = 0; i < N; i++) {
      if (resolveCupMatch("Rival FC", "Mi Equipo", true, 9.5).winner === "Mi Equipo") winsAlto++
      if (resolveCupMatch("Rival FC", "Mi Equipo", true, 3.0).winner === "Mi Equipo") winsBajo++
    }
    expect(winsAlto).toBeGreaterThan(winsBajo)
  })
})

describe("processPromotionRelegation", () => {
  const makeWorld = (): WorldState => ({
    equiposPrimera: [...TEAMS_PRIMERA_BASE],
    equiposSegunda: [...TEAMS_SEGUNDA_BASE],
    campeonesHistoricos: [],
  })

  it("desciende exactamente 3 equipos de primera y asciende 3 de segunda", () => {
    const world = makeWorld()
    const { news } = processPromotionRelegation(world)
    const descLine = news.find((n) => n.startsWith("Descendidos:"))!
    const ascLine = news.find((n) => n.startsWith("Ascendidos:"))!
    expect(descLine.replace("Descendidos: ", "").split(", ")).toHaveLength(3)
    expect(ascLine.replace("Ascendidos: ", "").split(", ")).toHaveLength(3)
  })

  it("mantiene el mismo número total de equipos en cada división", () => {
    const world = makeWorld()
    const { newWorld } = processPromotionRelegation(world)
    expect(newWorld.equiposPrimera).toHaveLength(world.equiposPrimera.length)
    expect(newWorld.equiposSegunda).toHaveLength(world.equiposSegunda.length)
  })

  it("los equipos ascendidos aparecen en primera y ya no en segunda (y viceversa)", () => {
    const world = makeWorld()
    const { newWorld, news } = processPromotionRelegation(world)
    const descendidos = news.find((n) => n.startsWith("Descendidos:"))!.replace("Descendidos: ", "").split(", ")
    const ascendidos = news.find((n) => n.startsWith("Ascendidos:"))!.replace("Ascendidos: ", "").split(", ")

    for (const club of ascendidos) {
      expect(newWorld.equiposPrimera).toContain(club)
      expect(newWorld.equiposSegunda).not.toContain(club)
    }
    for (const club of descendidos) {
      expect(newWorld.equiposSegunda).toContain(club)
      expect(newWorld.equiposPrimera).not.toContain(club)
    }
  })

  it("no duplica equipos dentro de una misma división tras el movimiento", () => {
    const world = makeWorld()
    const { newWorld } = processPromotionRelegation(world)
    expect(new Set(newWorld.equiposPrimera).size).toBe(newWorld.equiposPrimera.length)
    expect(new Set(newWorld.equiposSegunda).size).toBe(newWorld.equiposSegunda.length)
  })
})

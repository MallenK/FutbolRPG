import { describe, it, expect } from "vitest"
import {
  calcularPuntosLiga,
  resolverAscensoDescenso,
  getDivisionInfo,
  getRivales,
  getDefaultClub,
  generateCopaState,
  advanceCopa,
  COPA_RONDAS,
  generateEuropaState,
  advanceEuropaGrupo,
  advanceEuropaEliminatoria,
  getEuropaCompeticion,
  generateSeleccionTorneo,
  advanceSeleccionTorneoGrupo,
  advanceSeleccionTorneoEliminatoria,
  generateSeleccionParon,
  generateContrato,
  getTorneoTipo,
  simularPartidoSancion,
  generateTransferOffers,
} from "./world"

describe("calcularPuntosLiga", () => {
  it("suma 3 puntos por victoria, 1 por empate, 0 por derrota", () => {
    const fixtures = [
      { jugado: true, resultado: "2-1" }, // victoria
      { jugado: true, resultado: "1-1" }, // empate
      { jugado: true, resultado: "0-2" }, // derrota
    ]
    expect(calcularPuntosLiga(fixtures)).toBe(3 + 1 + 0)
  })

  it("ignora fixtures no jugados o sin resultado", () => {
    const fixtures = [
      { jugado: false, resultado: null },
      { jugado: true, resultado: null },
      { jugado: true, resultado: "3-0" },
    ]
    expect(calcularPuntosLiga(fixtures)).toBe(3)
  })

  it("devuelve 0 sin fixtures", () => {
    expect(calcularPuntosLiga([])).toBe(0)
  })
})

describe("resolverAscensoDescenso", () => {
  it("asciende si queda entre los 2 primeros y no está ya en la división máxima", () => {
    expect(resolverAscensoDescenso(2, 1, 10)).toEqual({ nuevaDivision: 3, resultado: "ascenso" })
    expect(resolverAscensoDescenso(2, 2, 10)).toEqual({ nuevaDivision: 3, resultado: "ascenso" })
  })

  it("no asciende desde la división máxima (5)", () => {
    expect(resolverAscensoDescenso(5, 1, 10)).toEqual({ nuevaDivision: 5, resultado: "ninguno" })
  })

  it("desciende si queda entre los 2 últimos y no está ya en la división mínima", () => {
    expect(resolverAscensoDescenso(3, 9, 10)).toEqual({ nuevaDivision: 2, resultado: "descenso" })
    expect(resolverAscensoDescenso(3, 10, 10)).toEqual({ nuevaDivision: 2, resultado: "descenso" })
  })

  it("no desciende desde la división mínima (1)", () => {
    expect(resolverAscensoDescenso(1, 10, 10)).toEqual({ nuevaDivision: 1, resultado: "ninguno" })
  })

  it("se mantiene en la mitad de la tabla", () => {
    expect(resolverAscensoDescenso(3, 5, 10)).toEqual({ nuevaDivision: 3, resultado: "ninguno" })
  })
})

describe("getDivisionInfo", () => {
  it("aplica clamp entre 1 y 5", () => {
    expect(getDivisionInfo(0).clubes).toEqual(getDivisionInfo(1).clubes)
    expect(getDivisionInfo(99).clubes).toEqual(getDivisionInfo(5).clubes)
  })
})

describe("getRivales / getDefaultClub", () => {
  it("getRivales excluye al club actual y solo incluye clubes de esa división", () => {
    const club = getDefaultClub(3)
    const rivales = getRivales(3, club)
    expect(rivales).not.toContain(club)
    expect(rivales.every((c) => getDivisionInfo(3).clubes.includes(c))).toBe(true)
  })

  it("getDefaultClub siempre pertenece a los clubes de esa división", () => {
    for (let d = 1; d <= 5; d++) {
      expect(getDivisionInfo(d).clubes).toContain(getDefaultClub(d))
    }
  })
})

describe("generateCopaState / advanceCopa", () => {
  it("el estado inicial empieza en R32 (rondaIdx 0), no eliminado y sin historial", () => {
    for (let i = 0; i < 30; i++) {
      const copa = generateCopaState()
      expect(copa.rondaIdx).toBe(0)
      expect(copa.eliminado).toBe(false)
      expect(copa.campeon).toBe(false)
      expect(copa.historial).toEqual([])
      expect(typeof copa.rival).toBe("string")
    }
  })

  it("perder una ronda marca eliminado=true y añade la entrada al historial", () => {
    const copa = generateCopaState()
    const rivalOriginal = copa.rival
    const next = advanceCopa(copa, false, "0-2")
    expect(next.eliminado).toBe(true)
    expect(next.historial).toHaveLength(1)
    expect(next.historial[0]).toEqual({ ronda: "R32", rival: rivalOriginal, ganado: false, resultado: "0-2" })
  })

  it("ganar avanza a la siguiente ronda y cambia de rival", () => {
    const copa = generateCopaState()
    const next = advanceCopa(copa, true, "2-0")
    expect(next.rondaIdx).toBe(1)
    expect(next.eliminado).toBe(false)
    expect(next.historial).toHaveLength(1)
    expect(COPA_RONDAS).toContain("R16")
  })

  it("ganar la Final (última ronda) marca campeon=true", () => {
    let copa = generateCopaState()
    for (let i = 0; i < COPA_RONDAS.length; i++) {
      copa = advanceCopa(copa, true, "1-0")
    }
    expect(copa.campeon).toBe(true)
    expect(copa.historial).toHaveLength(COPA_RONDAS.length)
  })

  it("el historial registra cada ronda con su nombre correcto en orden", () => {
    let copa = generateCopaState()
    for (let i = 0; i < COPA_RONDAS.length; i++) {
      copa = advanceCopa(copa, true, "1-0")
    }
    expect(copa.historial.map((h) => h.ronda)).toEqual([...COPA_RONDAS])
  })
})

describe("getEuropaCompeticion", () => {
  it("devuelve null por debajo de división 3", () => {
    expect(getEuropaCompeticion(1)).toBeNull()
    expect(getEuropaCompeticion(2)).toBeNull()
  })

  it("mapea división 3 -> conference, 4 -> europa, 5 -> champions", () => {
    expect(getEuropaCompeticion(3)).toBe("conference")
    expect(getEuropaCompeticion(4)).toBe("europa")
    expect(getEuropaCompeticion(5)).toBe("champions")
  })
})

describe("generateEuropaState / advanceEuropaGrupo / advanceEuropaEliminatoria", () => {
  it("devuelve null si la división no tiene competición europea", () => {
    expect(generateEuropaState(1)).toBeNull()
    expect(generateEuropaState(2)).toBeNull()
  })

  it("genera 6 partidos de grupo (3 rivales, ida y vuelta) sin jugar y stats en cero", () => {
    const europa = generateEuropaState(5)!
    expect(europa.grupoPartidos).toHaveLength(6)
    expect(europa.grupoPartidos.every((p) => !p.jugado)).toBe(true)
    expect(europa.grupoStats).toEqual({ G: 0, E: 0, P: 0, PTS: 0, GF: 0, GC: 0 })
    expect(europa.clasificado).toBe(false)
    const rivales = new Set(europa.grupoPartidos.map((p) => p.rival))
    expect(rivales.size).toBe(3) // 3 rivales distintos, cada uno con partido ida y vuelta
  })

  it("acumula estadísticas de grupo correctamente tras jugar un partido", () => {
    const europa = generateEuropaState(5)!
    const next = advanceEuropaGrupo(europa, 0, true, false, 2, 1, "2-1", 7.5)
    expect(next.grupoStats).toEqual({ G: 1, E: 0, P: 0, PTS: 3, GF: 2, GC: 1 })
    expect(next.grupoPartidos.find((p) => p.idx === 0)?.jugado).toBe(true)
  })

  it("clasifica solo cuando se han jugado los 6 partidos y PTS >= 7, generando la eliminatoria", () => {
    let europa = generateEuropaState(5)!
    // Jugamos 5 victorias (15 pts) y todavía no debe estar clasificado (faltan partidos)
    for (let i = 0; i < 5; i++) {
      europa = advanceEuropaGrupo(europa, i, true, false, 2, 0, "2-0", 8.0)
      expect(europa.clasificado).toBe(false)
    }
    // Sexto partido: con 15pts ya garantizado >=7, se clasifica y genera eliminatoria
    europa = advanceEuropaGrupo(europa, 5, true, false, 2, 0, "2-0", 8.0)
    expect(europa.clasificado).toBe(true)
    expect(europa.eliminatoria).toBeDefined()
    expect(europa.eliminatoria?.rondaIdx).toBe(0)
  })

  it("no clasifica si tras jugar los 6 partidos PTS < 7", () => {
    let europa = generateEuropaState(5)!
    for (let i = 0; i < 6; i++) {
      europa = advanceEuropaGrupo(europa, i, false, false, 0, 2, "0-2", 5.0) // todas derrotas
    }
    expect(europa.clasificado).toBe(false)
    expect(europa.eliminatoria).toBeUndefined()
  })

  it("advanceEuropaEliminatoria: perder marca eliminado, ganar la última ronda marca campeon", () => {
    let europa = generateEuropaState(5)!
    for (let i = 0; i < 6; i++) {
      europa = advanceEuropaGrupo(europa, i, true, false, 2, 0, "2-0", 8.0)
    }
    expect(europa.eliminatoria).toBeDefined()

    // Perder la primera ronda eliminatoria
    const perdida = advanceEuropaEliminatoria(europa, false, "0-1")
    expect(perdida.eliminatoria?.eliminado).toBe(true)

    // Ganar las 4 rondas (R16, QF, SF, F) hasta ser campeón
    let avance = europa
    for (let i = 0; i < 4; i++) {
      avance = advanceEuropaEliminatoria(avance, true, "1-0")
    }
    expect(avance.eliminatoria?.campeon).toBe(true)
  })

  it("advanceEuropaEliminatoria no hace nada si no hay eliminatoria activa", () => {
    const europa = generateEuropaState(5)!
    expect(advanceEuropaEliminatoria(europa, true, "1-0")).toBe(europa)
  })
})

describe("getTorneoTipo", () => {
  it("temporada %4===2 -> eurocopa, %4===0 -> mundial, resto -> null", () => {
    expect(getTorneoTipo(2)).toBe("eurocopa")
    expect(getTorneoTipo(6)).toBe("eurocopa")
    expect(getTorneoTipo(4)).toBe("mundial")
    expect(getTorneoTipo(8)).toBe("mundial")
    expect(getTorneoTipo(1)).toBeNull()
    expect(getTorneoTipo(3)).toBeNull()
  })
})

describe("generateSeleccionTorneo / advanceSeleccionTorneoGrupo / advanceSeleccionTorneoEliminatoria", () => {
  it("genera 6 partidos de grupo en fase 'grupos', sin clasificar ni campeón", () => {
    const torneo = generateSeleccionTorneo("mundial")
    expect(torneo.fase).toBe("grupos")
    expect(torneo.grupoPartidos).toHaveLength(6)
    expect(torneo.clasificado).toBe(false)
    expect(torneo.campeon).toBe(false)
  })

  it("clasifica con PTS >= 5 tras jugar los 6 partidos y pasa a fase eliminatoria", () => {
    let torneo = generateSeleccionTorneo("eurocopa")
    for (let i = 0; i < 5; i++) {
      torneo = advanceSeleccionTorneoGrupo(torneo, i, true, false, "1-0", 1)
    }
    expect(torneo.fase).toBe("grupos") // aún no se han jugado los 6
    torneo = advanceSeleccionTorneoGrupo(torneo, 5, true, false, "1-0", 1)
    expect(torneo.clasificado).toBe(true)
    expect(torneo.fase).toBe("eliminatoria")
    expect(torneo.eliminatoria).toBeDefined()
  })

  it("no clasifica y pasa a 'finalizado' si PTS < 5 tras los 6 partidos", () => {
    let torneo = generateSeleccionTorneo("eurocopa")
    for (let i = 0; i < 6; i++) {
      torneo = advanceSeleccionTorneoGrupo(torneo, i, false, false, "0-1", 0)
    }
    expect(torneo.clasificado).toBe(false)
    expect(torneo.fase).toBe("finalizado")
  })

  it("advanceSeleccionTorneoEliminatoria: perder marca finalizado sin campeón, ganar QF+SF+F marca campeón", () => {
    let torneo = generateSeleccionTorneo("mundial")
    for (let i = 0; i < 6; i++) {
      torneo = advanceSeleccionTorneoGrupo(torneo, i, true, false, "1-0", 1)
    }
    expect(torneo.fase).toBe("eliminatoria")

    const perdido = advanceSeleccionTorneoEliminatoria(torneo, false, "0-1")
    expect(perdido.fase).toBe("finalizado")
    expect(perdido.campeon).toBe(false)

    let avance = torneo
    for (let i = 0; i < 3; i++) {
      avance = advanceSeleccionTorneoEliminatoria(avance, true, "1-0")
    }
    expect(avance.fase).toBe("finalizado")
    expect(avance.campeon).toBe(true)
  })

  it("nunca genera un rival igual a la propia nacionalidad del jugador", () => {
    // "Argentina" está en el pool de rivales de torneo — sin el filtro por
    // nacionalidad, un jugador argentino podría acabar jugando contra sí mismo.
    for (let i = 0; i < 20; i++) {
      const torneo = generateSeleccionTorneo("mundial", "Argentina")
      expect(torneo.grupoPartidos.every((p) => p.rival !== "Argentina")).toBe(true)

      let avanzado = torneo
      for (let j = 0; j < 6; j++) {
        avanzado = advanceSeleccionTorneoGrupo(avanzado, j, true, false, "1-0", 1, "Argentina")
      }
      expect(avanzado.eliminatoria?.rival).not.toBe("Argentina")

      const siguienteRonda = advanceSeleccionTorneoEliminatoria(avanzado, true, "1-0", "Argentina")
      expect(siguienteRonda.eliminatoria?.rival).not.toBe("Argentina")
    }
  })
})

describe("generateSeleccionParon", () => {
  it("nunca genera un rival igual a la propia nacionalidad del jugador", () => {
    // "Francia" está en el pool de amistosos — mismo motivo que en el torneo.
    for (let i = 0; i < 20; i++) {
      const paron = generateSeleccionParon(1, "Francia")
      expect(paron.partidos.every((p) => p.rival !== "Francia")).toBe(true)
    }
  })
})

describe("simularPartidoSancion", () => {
  it("siempre devuelve un marcador válido en formato 'N-N' consistente con el resultado", () => {
    for (let i = 0; i < 300; i++) {
      const { resultado, marcador } = simularPartidoSancion()
      expect(marcador).toMatch(/^\d+-\d+$/)
      const [mis, rival] = marcador.split("-").map(Number)
      if (resultado === "victoria") expect(mis).toBeGreaterThan(rival)
      else if (resultado === "derrota") expect(rival).toBeGreaterThan(mis)
      else expect(mis).toBe(rival)
    }
  })
})

describe("generateContrato", () => {
  it("siempre empieza con 2 temporadas restantes", () => {
    for (let d = 1; d <= 5; d++) {
      expect(generateContrato(d).temporadasRestantes).toBe(2)
    }
  })

  it("el salario relativo queda acotado entre 1 y 5 y crece con la división", () => {
    expect(generateContrato(1).salarioRelativo).toBe(1) // max(1, min(5, 0)) = 1
    expect(generateContrato(5).salarioRelativo).toBe(4)
    expect(generateContrato(10).salarioRelativo).toBe(5) // clamp superior
  })
})

describe("generateTransferOffers", () => {
  it("sin reputación suficiente (< 20) no genera ninguna oferta", () => {
    expect(generateTransferOffers(10, 3, "Mi Club", 5)).toEqual([])
  })

  it("con reputación >= 20 genera al menos la oferta de la misma división", () => {
    const offers = generateTransferOffers(25, 3, "Mi Club", 5)
    expect(offers.length).toBeGreaterThanOrEqual(1)
    expect(offers[0].division).toBe(3)
    expect(offers[0].club).not.toBe("Mi Club")
  })

  it("con reputación >= 40 y no estar en la división máxima añade oferta de división superior", () => {
    const offers = generateTransferOffers(45, 3, "Mi Club", 5)
    expect(offers.some((o) => o.division === 4)).toBe(true)
  })

  it("con reputación >= 70 añade oferta de la división máxima (5)", () => {
    const offers = generateTransferOffers(75, 3, "Mi Club", 5)
    expect(offers.some((o) => o.division === 5)).toBe(true)
    expect(offers).toHaveLength(3)
  })

  it("nunca ofrece el club actual como destino", () => {
    for (let i = 0; i < 50; i++) {
      const offers = generateTransferOffers(80, 4, "Real Madrid", 5)
      expect(offers.every((o) => o.club !== "Real Madrid")).toBe(true)
    }
  })

  it("con reputación >= 40 y ya en división máxima (5) no añade oferta de división superior (no existe)", () => {
    const offers = generateTransferOffers(45, 5, "Manchester City", 5)
    expect(offers.every((o) => o.division !== 6)).toBe(true)
  })
})

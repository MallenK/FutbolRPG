import { describe, it, expect } from "vitest"
import {
  getSituacionForTurn,
  resolveDecisionWithDice,
  getStatLabel,
  initMatchState,
} from "./match-interactive"
import { createDefaultPlayer } from "./player"
import { Posicion, ResultadoDecision, DecisionOption } from "./types"

describe("initMatchState", () => {
  it("devuelve un estado inicial consistente", () => {
    const state = initMatchState()
    expect(state.turno).toBe(1)
    expect(state.totalTurnos).toBe(5)
    expect(state.marcador).toEqual({ local: 0, visitante: 0 })
    expect(state.tarjetasAmarillas).toBe(0)
    expect(state.expulsado).toBe(false)
    expect(state.log).toEqual([])
  })
})

describe("getStatLabel", () => {
  it("devuelve la abreviatura conocida para stats mapeadas", () => {
    expect(getStatLabel("tiro")).toBe("TIR")
    expect(getStatLabel("velocidad")).toBe("VEL")
  })

  it("devuelve las 3 primeras letras en mayúsculas para stats no mapeadas", () => {
    expect(getStatLabel("entradas")).toBe("ENT")
  })
})

describe("getSituacionForTurn", () => {
  it("para un jugador de campo (no portero), nunca devuelve una situación peligroPropio", () => {
    const player = createDefaultPlayer()
    player.posicionPrincipal = Posicion.DELANTERO
    for (let i = 0; i < 200; i++) {
      const s = getSituacionForTurn(1, player)
      expect(s.peligroPropio).not.toBe(true)
    }
  })

  it("para un portero, siempre devuelve una situación peligroPropio", () => {
    const player = createDefaultPlayer()
    player.posicionPrincipal = Posicion.PORTERO
    for (let i = 0; i < 200; i++) {
      const s = getSituacionForTurn(1, player)
      expect(s.peligroPropio).toBe(true)
    }
  })

  it("respeta posicionEfectiva sobre posicionPrincipal para decidir el pool (portero por posición secundaria efectiva)", () => {
    const player = createDefaultPlayer()
    player.posicionPrincipal = Posicion.DELANTERO
    for (let i = 0; i < 50; i++) {
      const s = getSituacionForTurn(1, player, Posicion.PORTERO)
      expect(s.peligroPropio).toBe(true)
    }
  })

  it("la dificultad base siempre queda acotada entre 30 y 80", () => {
    const player = createDefaultPlayer()
    for (let turno = 1; turno <= 5; turno++) {
      for (let i = 0; i < 50; i++) {
        const s = getSituacionForTurn(turno, player)
        expect(s.contexto.dificultadBase).toBeGreaterThanOrEqual(30)
        expect(s.contexto.dificultadBase).toBeLessThanOrEqual(80)
      }
    }
  })

  it("el minuto se calcula proporcionalmente al turno (turno/5 * 90)", () => {
    const player = createDefaultPlayer()
    const s3 = getSituacionForTurn(3, player)
    expect(s3.minuto).toBe(Math.round((3 / 5) * 90))
  })
})

describe("resolveDecisionWithDice", () => {
  const player = createDefaultPlayer()
  const opcionBase: DecisionOption = {
    id: "tiro_seguro",
    texto: "opción",
    tipo: "SEGURO",
    statPrincipal: "tiro",
    pesoStat: 1.0,
    riesgo: 0.1,
  }
  const marcadorNeutro = { local: 0, visitante: 0 }

  const situacionGol = {
    id: "mano_a_mano",
    descripcion: "test",
    minuto: 10,
    contexto: { dificultadBase: 50, presionSituacional: 20, bonusContexto: 0 },
    esOportunidadGol: true,
    opciones: [],
  }

  it("el score siempre queda acotado entre 0 y 100 para cualquier valor del dado (1-20)", () => {
    for (let dado = 1; dado <= 20; dado++) {
      const res = resolveDecisionWithDice(opcionBase, player, situacionGol, dado, marcadorNeutro)
      expect(res.score).toBeGreaterThanOrEqual(0)
      expect(res.score).toBeLessThanOrEqual(100)
    }
  })

  it("un dado más alto produce en promedio un score mayor (a igualdad del resto)", () => {
    let sumaBajo = 0
    let sumaAlto = 0
    const N = 100
    for (let i = 0; i < N; i++) {
      sumaBajo += resolveDecisionWithDice(opcionBase, player, situacionGol, 3, marcadorNeutro).score
      sumaAlto += resolveDecisionWithDice(opcionBase, player, situacionGol, 18, marcadorNeutro).score
    }
    expect(sumaAlto / N).toBeGreaterThan(sumaBajo / N)
  })

  it("el resultado devuelto es siempre uno del enum ResultadoDecision", () => {
    const validos = Object.values(ResultadoDecision)
    for (let dado = 1; dado <= 20; dado++) {
      const res = resolveDecisionWithDice(opcionBase, player, situacionGol, dado, marcadorNeutro)
      expect(validos).toContain(res.resultado)
    }
  })

  it("en una situación de gol, un dado más alto produce gol con mucha más frecuencia que uno bajo", () => {
    // Con dificultadBase=50 el skillDifference (75-50=25) por sí solo ya deja el score muy alto
    // y ambos dados caen en el mismo tramo de resultado (EXITO), sin diferencia real de gol.
    // Subimos la dificultad para que el rango del dado (±~6-7 puntos) sea lo que decide el tramo:
    // dado=1 cae en PARCIAL (golChance 0.08) y dado=20 cae en EXITO (golChance 0.35).
    const situacionDificil = { ...situacionGol, contexto: { ...situacionGol.contexto, dificultadBase: 64 } }
    const N = 300
    let golesAlto = 0
    let golesBajo = 0
    for (let i = 0; i < N; i++) {
      const alto = resolveDecisionWithDice(opcionBase, player, situacionDificil, 20, marcadorNeutro)
      if (alto.gol) golesAlto++
      const bajo = resolveDecisionWithDice(opcionBase, player, situacionDificil, 1, marcadorNeutro)
      if (bajo.gol) golesBajo++
    }
    expect(golesAlto).toBeGreaterThan(golesBajo)
  })

  it("con el trait penalty_expert, un penalti siempre resulta en gol", () => {
    const experto = createDefaultPlayer()
    experto.traits = ["penalty_expert"]
    const situacionPenalti = { ...situacionGol, id: "penalti" }
    for (let i = 0; i < 50; i++) {
      const res = resolveDecisionWithDice(opcionBase, experto, situacionPenalti, 1, marcadorNeutro)
      expect(res.gol).toBe(true)
    }
  })

  it("en situación peligroPropio (portero), un CRITICO_FALLO concede el gol con mucha más frecuencia que un PERFECTO", () => {
    const portero = createDefaultPlayer()
    portero.posicionPrincipal = Posicion.PORTERO
    // riesgo alto (>=0.3) y presionSituacional alto (>=40) para que isCriticoFalloCondition
    // pueda cumplirse (ver decision.ts: score<=15 y (riesgo>=0.3 || fatiga>=85 || presion>=40))
    const opcionRiesgo: DecisionOption = { ...opcionBase, riesgo: 0.4 }
    const situacionDefensiva = {
      ...situacionGol,
      esOportunidadGol: false,
      peligroPropio: true,
      contexto: { dificultadBase: 95, presionSituacional: 45, bonusContexto: 0 },
    }
    const N = 300
    let concedeConCriticoFallo = 0
    let concedeConPerfecto = 0
    for (let i = 0; i < N; i++) {
      const critico = resolveDecisionWithDice(opcionRiesgo, portero, situacionDefensiva, 1, marcadorNeutro)
      if (critico.resultado === ResultadoDecision.CRITICO_FALLO && critico.marcador.visitante > 0) concedeConCriticoFallo++

      const perfecto = resolveDecisionWithDice(
        opcionRiesgo,
        portero,
        { ...situacionDefensiva, contexto: { dificultadBase: 10, presionSituacional: 0, bonusContexto: 0 } },
        20,
        marcadorNeutro
      )
      if (perfecto.resultado === ResultadoDecision.PERFECTO && perfecto.marcador.visitante > 0) concedeConPerfecto++
    }
    expect(concedeConCriticoFallo).toBeGreaterThan(concedeConPerfecto)
  })

  it("el trait muro_infranqueable reduce la frecuencia de encajar gol en peligroPropio respecto a no tenerlo", () => {
    const conMuro = createDefaultPlayer()
    conMuro.posicionPrincipal = Posicion.PORTERO
    conMuro.traits = ["muro_infranqueable"]
    const sinMuro = createDefaultPlayer()
    sinMuro.posicionPrincipal = Posicion.PORTERO
    sinMuro.traits = []

    const situacionDefensivaDificil = {
      ...situacionGol,
      esOportunidadGol: false,
      peligroPropio: true,
      contexto: { dificultadBase: 95, presionSituacional: 40, bonusContexto: 0 },
    }

    const N = 300
    let golesConMuro = 0
    let golesSinMuro = 0
    for (let i = 0; i < N; i++) {
      const rc = resolveDecisionWithDice(opcionBase, conMuro, situacionDefensivaDificil, 1, marcadorNeutro)
      if (rc.marcador.visitante > marcadorNeutro.visitante) golesConMuro++
      const rs = resolveDecisionWithDice(opcionBase, sinMuro, situacionDefensivaDificil, 1, marcadorNeutro)
      if (rs.marcador.visitante > marcadorNeutro.visitante) golesSinMuro++
    }
    expect(golesSinMuro).toBeGreaterThan(golesConMuro)
  })

  it("penalizacionPosicion: jugar fuera de posición sin el trait polivalente reduce el score en promedio", () => {
    const N = 150
    let sumaEnPosicion = 0
    let sumaFueraPosicion = 0
    const jugador = createDefaultPlayer()
    jugador.posicionPrincipal = Posicion.DELANTERO
    jugador.traits = []
    for (let i = 0; i < N; i++) {
      sumaEnPosicion += resolveDecisionWithDice(opcionBase, jugador, situacionGol, 10, marcadorNeutro, Posicion.DELANTERO).score
      sumaFueraPosicion += resolveDecisionWithDice(opcionBase, jugador, situacionGol, 10, marcadorNeutro, Posicion.EXTREMO).score
    }
    expect(sumaEnPosicion / N).toBeGreaterThan(sumaFueraPosicion / N)
  })

  it("con el trait polivalente, jugar fuera de posición no penaliza el score", () => {
    const jugador = createDefaultPlayer()
    jugador.posicionPrincipal = Posicion.DELANTERO
    jugador.traits = ["polivalente"]
    // Usamos el mismo dado (determinista) para aislar el efecto de la penalización de posición
    const enPosicion = resolveDecisionWithDice(opcionBase, jugador, situacionGol, 10, marcadorNeutro, Posicion.DELANTERO)
    const fueraPosicion = resolveDecisionWithDice(opcionBase, jugador, situacionGol, 10, marcadorNeutro, Posicion.EXTREMO)
    expect(enPosicion.score).toBe(fueraPosicion.score)
  })
})

import { describe, it, expect } from "vitest"
import {
  ALL_STATS,
  STAT_BY_KEY,
  POSITION_STAT_PROFILES,
  BASE_STATS,
  POSITIONS,
  ORIGINS,
  PERSONALITIES,
  PLAY_STYLES,
  TRAITS,
  SELECTABLE_TRAITS,
  getSelectableTraits,
  FOOT_OPTIONS,
  buildAttributes,
  getStatGroupedByPosition,
  Position,
  StatKey,
} from "./player-config"

const ALL_POSITION_IDS = POSITIONS.map((p) => p.id)

describe("ALL_STATS / STAT_BY_KEY", () => {
  it("no hay claves de stat duplicadas", () => {
    const keys = ALL_STATS.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("STAT_BY_KEY contiene todas las stats de ALL_STATS y ninguna huérfana", () => {
    expect(Object.keys(STAT_BY_KEY).sort()).toEqual(ALL_STATS.map((s) => s.key).sort())
  })

  it("cada stat pertenece a uno de los 4 grupos válidos", () => {
    const gruposValidos = ["tecnicos", "fisicos", "tacticos", "mentales"]
    for (const s of ALL_STATS) {
      expect(gruposValidos).toContain(s.group)
    }
  })
})

describe("POSITION_STAT_PROFILES", () => {
  it("cada posición tiene stats primary y secondary no vacíos", () => {
    for (const pos of ALL_POSITION_IDS) {
      const profile = POSITION_STAT_PROFILES[pos]
      expect(profile.primary.length).toBeGreaterThan(0)
      expect(profile.secondary.length).toBeGreaterThan(0)
    }
  })

  it("todas las stats referenciadas en primary/secondary existen en STAT_BY_KEY", () => {
    for (const pos of ALL_POSITION_IDS) {
      const profile = POSITION_STAT_PROFILES[pos]
      for (const key of [...profile.primary, ...profile.secondary]) {
        expect(STAT_BY_KEY[key]).toBeDefined()
      }
    }
  })

  it("una stat no se repite entre primary y secondary dentro de la misma posición", () => {
    for (const pos of ALL_POSITION_IDS) {
      const profile = POSITION_STAT_PROFILES[pos]
      const interseccion = profile.primary.filter((k) => profile.secondary.includes(k))
      expect(interseccion).toEqual([])
    }
  })
})

describe("BASE_STATS", () => {
  it("cada posición define un valor para todas las stats existentes", () => {
    for (const pos of ALL_POSITION_IDS) {
      const stats = BASE_STATS[pos]
      for (const s of ALL_STATS) {
        expect(stats[s.key]).toBeTypeOf("number")
      }
    }
  })

  it("todos los valores base están en un rango razonable (1-99)", () => {
    for (const pos of ALL_POSITION_IDS) {
      for (const s of ALL_STATS) {
        const val = BASE_STATS[pos][s.key]
        expect(val).toBeGreaterThanOrEqual(1)
        expect(val).toBeLessThanOrEqual(99)
      }
    }
  })
})

describe("getSelectableTraits", () => {
  it("solo devuelve traits marcados como sourceable", () => {
    for (const pos of ALL_POSITION_IDS) {
      const traits = getSelectableTraits(pos)
      expect(traits.every((t) => t.sourceable)).toBe(true)
    }
  })

  it("un trait gateado por posiciones solo aparece para esas posiciones", () => {
    const traitGateado = SELECTABLE_TRAITS.find((t) => t.positions && t.positions.length > 0)
    expect(traitGateado).toBeDefined()

    for (const pos of ALL_POSITION_IDS) {
      const traits = getSelectableTraits(pos)
      const aparece = traits.some((t) => t.id === traitGateado!.id)
      expect(aparece).toBe(traitGateado!.positions!.includes(pos))
    }
  })

  it("un trait sin 'positions' definido aparece para todas las posiciones", () => {
    const traitUniversal = SELECTABLE_TRAITS.find((t) => !t.positions)
    expect(traitUniversal).toBeDefined()
    for (const pos of ALL_POSITION_IDS) {
      const traits = getSelectableTraits(pos)
      expect(traits.some((t) => t.id === traitUniversal!.id)).toBe(true)
    }
  })

  it("GK (portero) solo puede elegir muro_infranqueable entre los traits exclusivos de posición", () => {
    const gkTraits = getSelectableTraits("GK").map((t) => t.id)
    expect(gkTraits).toContain("muro_infranqueable")
    expect(gkTraits).not.toContain("goleador_nato")
    expect(gkTraits).not.toContain("anticipacion_defensiva")
  })
})

describe("TRAITS", () => {
  it("no hay ids de trait duplicados", () => {
    const ids = TRAITS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("SELECTABLE_TRAITS es exactamente el subconjunto sourceable de TRAITS", () => {
    expect(SELECTABLE_TRAITS).toEqual(TRAITS.filter((t) => t.sourceable))
  })
})

describe("ORIGINS", () => {
  it("cada origen referencia un traitId que existe en TRAITS", () => {
    const traitIds = TRAITS.map((t) => t.id)
    for (const origin of ORIGINS) {
      expect(traitIds).toContain(origin.traitId)
    }
  })

  it("los bonuses de cada origen solo referencian StatKeys válidas", () => {
    const validKeys = ALL_STATS.map((s) => s.key)
    for (const origin of ORIGINS) {
      for (const key of Object.keys(origin.bonuses)) {
        expect(validKeys).toContain(key as StatKey)
      }
    }
  })
})

describe("PERSONALITIES", () => {
  it("cada personalidad tiene un matchBonus con tipo válido", () => {
    const tiposValidos = ["flat", "variance", "pressure_bonus", "consistent"]
    for (const p of PERSONALITIES) {
      expect(tiposValidos).toContain(p.matchBonus.type)
    }
  })
})

describe("PLAY_STYLES", () => {
  it("cada posición tiene al menos un estilo de juego", () => {
    for (const pos of ALL_POSITION_IDS) {
      expect(PLAY_STYLES[pos].length).toBeGreaterThan(0)
    }
  })

  it("los ids de estilo son únicos dentro de cada posición", () => {
    for (const pos of ALL_POSITION_IDS) {
      const ids = PLAY_STYLES[pos].map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe("buildAttributes", () => {
  it("todos los valores resultantes quedan entre 1 y 99 (clamp)", () => {
    const result = buildAttributes("ST", "calle", { tiro: 500 }, "derecho")
    expect(result.tecnicos.tiro).toBeLessThanOrEqual(99)
  })

  it("combina base + bonus de origen + bonus de pie + puntos extra", () => {
    const base = BASE_STATS.ST.regate
    const result = buildAttributes("ST", "calle", {}, "izquierdo")
    // origen 'calle' da +10 regate, pie izquierdo da +3 regate
    expect(result.tecnicos.regate).toBe(Math.min(99, base + 10 + 3))
  })

  it("nunca baja de 1 aunque los puntos extra sean muy negativos", () => {
    const result = buildAttributes("GK", "academia", { reflejos: -1000 }, "derecho")
    expect(result.tecnicos.reflejos).toBe(1)
  })

  it("reparte cada stat en el grupo correcto (tecnicos/fisicos/tacticos/mentales)", () => {
    const result = buildAttributes("CM", "tactico", {}, "ambidiestro")
    expect(result.tecnicos.pase).toBeDefined()
    expect(result.fisicos.velocidad).toBeDefined()
    expect(result.tacticos.vision).toBeDefined()
    expect(result.mentales.disciplina).toBeDefined()
  })
})

describe("getStatGroupedByPosition", () => {
  it("coincide con POSITION_STAT_PROFILES traducido a StatDefinition", () => {
    for (const pos of ALL_POSITION_IDS) {
      const grouped = getStatGroupedByPosition(pos)
      expect(grouped.primary.map((s) => s.key)).toEqual(POSITION_STAT_PROFILES[pos].primary)
      expect(grouped.secondary.map((s) => s.key)).toEqual(POSITION_STAT_PROFILES[pos].secondary)
    }
  })
})

describe("FOOT_OPTIONS", () => {
  it("tiene exactamente 3 opciones válidas", () => {
    expect(FOOT_OPTIONS.map((f) => f.id).sort()).toEqual(["ambidiestro", "derecho", "izquierdo"])
  })
})

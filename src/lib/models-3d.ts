// Registro único de modelos 3D externos (.glb) usados por la app — ningún
// componente debe hardcodear una ruta de /public/models suelta, la declara
// aquí. Ver public/models/README.md para el flujo completo de generación
// manual con Meshy (plan gratuito, sin API) y las convenciones de carpeta.
//
// `ready: false` es la pieza clave para poder ir añadiendo modelos de forma
// escalable sin romper nada: el componente que consulta esta entrada sigue
// usando su versión procedural actual hasta que el archivo real exista y se
// cambie el flag a `true` — nunca hay una ruta rota en pantalla.

export type Model3DSource = "meshy" | "kenney" | "procedural"

export type Model3DEntry = {
  path: string
  label: string
  source: Model3DSource
  ready: boolean
  // Notas de generación (ajustes usados en Meshy, o de dónde viene el asset)
  // — no se usa en runtime, es documentación para quien genere el siguiente.
  note?: string
}

export const MODELS_3D = {
  "dice-d20": {
    path: "/models/dice/d20-arcade.glb",
    label: "Dado D20 (arcade)",
    source: "meshy",
    ready: false,
    note: "Sustituye el icosaedro procedural de Dice3D.tsx — mismo rol, más carácter (bordes biselados, números grabados).",
  },
  "trophy-liga": {
    path: "/models/trophies/trophy-liga.glb",
    label: "Trofeo de Liga",
    source: "meshy",
    ready: false,
  },
  "trophy-copa": {
    path: "/models/trophies/trophy-copa.glb",
    label: "Trofeo de Copa del Rey",
    source: "meshy",
    ready: false,
  },
  "trophy-europa": {
    path: "/models/trophies/trophy-europa.glb",
    label: "Trofeo de competición europea",
    source: "meshy",
    ready: false,
  },
  "trophy-seleccion": {
    path: "/models/trophies/trophy-seleccion.glb",
    label: "Trofeo de Selección Nacional",
    source: "meshy",
    ready: false,
  },
  "ball-classic": {
    path: "/models/match/ball-classic.glb",
    label: "Balón (partido)",
    source: "meshy",
    ready: false,
  },
  "player-character": {
    path: "/models/player/character-h.glb",
    label: "Personaje jugable (Kenney Blocky Characters)",
    source: "kenney",
    ready: true,
    note: "Ya en uso — ver PlayerFigure.tsx y public/models/player/KENNEY-LICENSE.txt.",
  },
} as const satisfies Record<string, Model3DEntry>

export type Model3DKey = keyof typeof MODELS_3D

export function getModel3D(key: Model3DKey): Model3DEntry {
  return MODELS_3D[key]
}

import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate } from "remotion"
import { COLORS, LOOP_FRAMES } from "../theme"
import { LoaderLabel } from "./Label"

interface TrophyLoaderProps {
  solidBg?: boolean
}

// Variante para el resumen de temporada: motivo de trofeo facetado (mismo
// lenguaje angular que el D20) en vez de dado — la espera es literalmente
// antes de una gala de premios, merece su propio acento (dorado).
export function TrophyLoader({ solidBg = false }: TrophyLoaderProps) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const cx = width / 2

  // Silueta angular de copa: puntos fijos en fracción del canvas, coherente
  // con el estilo facetado del resto de loaders (nada de curvas suaves).
  const s = width
  const trophyPoints: [number, number][] = [
    [cx - 0.30 * s, 0.30 * s], [cx + 0.30 * s, 0.30 * s], // borde de la copa
    [cx + 0.19 * s, 0.44 * s], [cx + 0.075 * s, 0.52 * s], // hombro derecho
    [cx + 0.06 * s, 0.62 * s], // tallo derecho
    [cx + 0.15 * s, 0.68 * s], [cx + 0.15 * s, 0.74 * s], // base derecha
    [cx - 0.15 * s, 0.74 * s], [cx - 0.15 * s, 0.68 * s], // base izquierda
    [cx - 0.06 * s, 0.62 * s], // tallo izquierdo
    [cx - 0.075 * s, 0.52 * s], [cx - 0.19 * s, 0.44 * s], // hombro izquierdo
  ]
  const trophyPath = trophyPoints.map((p) => p.join(",")).join(" ")

  // Asas angulares a los lados de la copa
  const handleLeft = `${cx - 0.30 * s},${0.34 * s} ${cx - 0.40 * s},${0.40 * s} ${cx - 0.36 * s},${0.48 * s} ${cx - 0.27 * s},${0.44 * s}`
  const handleRight = `${cx + 0.30 * s},${0.34 * s} ${cx + 0.40 * s},${0.40 * s} ${cx + 0.36 * s},${0.48 * s} ${cx + 0.27 * s},${0.44 * s}`

  // Destello: barrido diagonal + 3 chispas que titilan en fases distintas
  const sweepX = interpolate(frame, [0, LOOP_FRAMES], [-0.5 * s, 1.5 * s])
  const sparkles = [
    { x: cx - 0.24 * s, y: 0.36 * s, phase: 0 },
    { x: cx + 0.2 * s, y: 0.56 * s, phase: 0.33 },
    { x: cx + 0.02 * s, y: 0.26 * s, phase: 0.66 },
  ]

  return (
    <AbsoluteFill style={{ backgroundColor: solidBg ? COLORS.bg : "transparent" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={COLORS.yellow} stopOpacity="0" />
            <stop offset="50%" stopColor={COLORS.yellow} stopOpacity="0.9" />
            <stop offset="100%" stopColor={COLORS.yellow} stopOpacity="0" />
          </linearGradient>
          <clipPath id="trophyClip">
            <polygon points={trophyPath} />
          </clipPath>
        </defs>

        <polygon points={handleLeft} fill="none" stroke={COLORS.yellow} strokeWidth={5} strokeLinejoin="round" />
        <polygon points={handleRight} fill="none" stroke={COLORS.yellow} strokeWidth={5} strokeLinejoin="round" />
        <polygon points={trophyPath} fill="none" stroke={COLORS.yellow} strokeWidth={7} strokeLinejoin="round" />

        {/* barrido de luz recortado a la silueta de la copa */}
        <g clipPath="url(#trophyClip)">
          <rect x={sweepX - 30} y={0} width={60} height={height} fill="url(#sweep)" transform={`rotate(20 ${cx} ${0.5 * s})`} />
        </g>

        {sparkles.map((sp, i) => {
          const local = ((frame / LOOP_FRAMES + sp.phase) % 1)
          const twinkle = Math.max(0, Math.sin(local * Math.PI))
          const size = 5 + 4 * twinkle
          return (
            <g key={i} opacity={twinkle} transform={`translate(${sp.x} ${sp.y})`}>
              <line x1={-size} y1={0} x2={size} y2={0} stroke={COLORS.yellow} strokeWidth={2} />
              <line x1={0} y1={-size} x2={0} y2={size} stroke={COLORS.yellow} strokeWidth={2} />
            </g>
          )
        })}
      </svg>
      <LoaderLabel text="Temporada cerrada" color={COLORS.yellow} top={height * 0.8} />
    </AbsoluteFill>
  )
}

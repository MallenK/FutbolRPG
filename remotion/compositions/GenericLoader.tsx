import { useCurrentFrame, useVideoConfig, AbsoluteFill } from "remotion"
import { COLORS, LOOP_FRAMES } from "../theme"

// Hexágono regular = silueta del D20 (dado de la suerte), el motivo más
// reconocible del juego. Líneas internas alternas simulan facetas 3D.
function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const
  })
}

interface GenericLoaderProps {
  solidBg?: boolean
}

export function GenericLoader({ solidBg = false }: GenericLoaderProps) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const cx = width / 2
  const cy = height / 2
  const r = width * 0.28

  // Toda la animación es puramente periódica sobre LOOP_FRAMES → bucle sin salto.
  const rotation = (frame / LOOP_FRAMES) * 360
  const scale = 1 + 0.06 * Math.sin((2 * Math.PI * frame) / LOOP_FRAMES)

  const points = hexPoints(cx, cy, r)
  const hexPath = points.map((p) => p.join(",")).join(" ")

  return (
    <AbsoluteFill style={{ backgroundColor: solidBg ? COLORS.bg : "transparent" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <g
          style={{
            transform: `rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: `${cx}px ${cy}px`,
          }}
        >
          <polygon
            points={hexPath}
            fill="none"
            stroke={COLORS.accent}
            strokeWidth={7}
            strokeLinejoin="round"
          />
          {/* facetas internas: del vértice 0, 2 y 4 al centro */}
          {[0, 2, 4].map((i) => (
            <line
              key={i}
              x1={points[i][0]}
              y1={points[i][1]}
              x2={cx}
              y2={cy}
              stroke={COLORS.accent}
              strokeWidth={3}
              opacity={0.45}
            />
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  )
}

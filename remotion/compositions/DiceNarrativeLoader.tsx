import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, Easing } from "remotion"
import { COLORS, LOOP_FRAMES } from "../theme"
import { LoaderLabel } from "./Label"

function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const
  })
}

interface DiceNarrativeLoaderProps {
  solidBg?: boolean
}

// Variante de la espera de narrativa del partido: a diferencia del loader
// genérico (giro constante), este simula un tumbo real — se levanta, vuela
// por el aire y aterriza — coherente con "se está tirando el dado narrativo".
export function DiceNarrativeLoader({ solidBg = false }: DiceNarrativeLoaderProps) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const cx = width / 2
  const cy = height / 2
  const r = width * 0.26

  const t = [0, LOOP_FRAMES * 0.2, LOOP_FRAMES * 0.45, LOOP_FRAMES * 0.72, LOOP_FRAMES]
  const rotation = interpolate(frame, t, [0, -18, 22, 8, 0], { easing: Easing.inOut(Easing.quad) })
  const liftY = interpolate(frame, t, [0, -14, -26, -6, 0], { easing: Easing.inOut(Easing.quad) })
  const scale = interpolate(frame, t, [1, 0.96, 1.05, 0.98, 1], { easing: Easing.inOut(Easing.quad) })

  const points = hexPoints(cx, cy, r)
  const hexPath = points.map((p) => p.join(",")).join(" ")

  return (
    <AbsoluteFill style={{ backgroundColor: solidBg ? COLORS.bg : "transparent" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <g
          style={{
            transform: `translateY(${liftY}px) rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: `${cx}px ${cy}px`,
          }}
        >
          <polygon points={hexPath} fill="none" stroke={COLORS.accent} strokeWidth={7} strokeLinejoin="round" />
          {[0, 2, 4].map((i) => (
            <line key={i} x1={points[i][0]} y1={points[i][1]} x2={cx} y2={cy} stroke={COLORS.accent} strokeWidth={3} opacity={0.45} />
          ))}
        </g>
      </svg>
      <LoaderLabel text="Narrando..." color={COLORS.accent} top={height * 0.74} />
    </AbsoluteFill>
  )
}

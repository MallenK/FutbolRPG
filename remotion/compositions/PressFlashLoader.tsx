import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, Easing } from "remotion"
import { COLORS, LOOP_FRAMES } from "../theme"
import { LoaderLabel } from "./Label"

interface PressFlashLoaderProps {
  solidBg?: boolean
}

// Variante para eventos de prensa: cámara facetada + flash — coherente con
// que ese evento concreto es de tipo "PRENSA". Un disparo de flash por bucle.
export function PressFlashLoader({ solidBg = false }: PressFlashLoaderProps) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const cx = width / 2
  const cy = height / 2
  const s = width

  const bodyW = 0.46 * s
  const bodyH = 0.28 * s
  const bodyX = cx - bodyW / 2
  const bodyY = cy - bodyH / 2 + 0.02 * s

  // El flash dispara una vez por bucle: anillo que crece y se apaga + el
  // objetivo "parpadea" (se contrae) en el instante del disparo.
  const flashProgress = interpolate(frame, [0, LOOP_FRAMES * 0.35], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  })
  const ringRadius = 0.1 * s + flashProgress * 0.34 * s
  const ringOpacity = Math.max(0, 1 - flashProgress) * 0.85
  const lensSqueeze = interpolate(frame, [0, LOOP_FRAMES * 0.12, LOOP_FRAMES * 0.24], [1, 0.55, 1], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  })

  return (
    <AbsoluteFill style={{ backgroundColor: solidBg ? COLORS.bg : "transparent" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* destello */}
        <circle cx={cx} cy={cy} r={ringRadius} fill="none" stroke={COLORS.blue} strokeWidth={4} opacity={ringOpacity} />
        <circle cx={cx} cy={cy} r={ringRadius * 0.6} fill="none" stroke={COLORS.blue} strokeWidth={2} opacity={ringOpacity * 0.6} />

        {/* cuerpo de la cámara, facetado */}
        <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={10} fill="none" stroke={COLORS.blue} strokeWidth={7} strokeLinejoin="round" />
        {/* pupitre del flash, arriba a la izquierda */}
        <rect x={bodyX + bodyW * 0.12} y={bodyY - bodyH * 0.28} width={bodyW * 0.26} height={bodyH * 0.3} rx={4} fill="none" stroke={COLORS.blue} strokeWidth={6} strokeLinejoin="round" />
        {/* visor */}
        <rect x={bodyX + bodyW * 0.62} y={bodyY - bodyH * 0.16} width={bodyW * 0.18} height={bodyH * 0.18} rx={3} fill="none" stroke={COLORS.blue} strokeWidth={5} />

        {/* objetivo (lente) con parpadeo en el disparo */}
        <g transform={`translate(${cx} ${cy}) scale(1 ${lensSqueeze})`}>
          <circle r={0.11 * s} fill="none" stroke={COLORS.blue} strokeWidth={6} />
          <circle r={0.05 * s} fill="none" stroke={COLORS.blue} strokeWidth={3} opacity={0.6} />
        </g>
      </svg>
      <LoaderLabel text="Última hora" color={COLORS.blue} top={height * 0.78} />
    </AbsoluteFill>
  )
}

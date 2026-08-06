import { useCurrentFrame } from "remotion"
import { DISPLAY_FONT, LOOP_FRAMES } from "../theme"

// Único componente de texto de las 4 composiciones — la identidad de "sting"
// tipográfico del plan vive solo aquí, no se repite la fórmula en cada archivo.
export function LoaderLabel({ text, color, top }: { text: string; color: string; top: number }) {
  const frame = useCurrentFrame()
  const opacity = 0.72 + 0.28 * Math.sin((2 * Math.PI * frame) / LOOP_FRAMES)
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top,
        textAlign: "center",
        fontFamily: DISPLAY_FONT,
        fontSize: 30,
        letterSpacing: "0.14em",
        color,
        opacity,
        textTransform: "uppercase",
      }}
    >
      {text}
    </div>
  )
}

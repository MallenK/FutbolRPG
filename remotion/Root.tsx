import { Composition } from "remotion"
import { GenericLoader } from "./compositions/GenericLoader"
import { CANVAS, FPS, LOOP_FRAMES } from "./theme"

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GenericLoader"
        component={GenericLoader}
        durationInFrames={LOOP_FRAMES}
        fps={FPS}
        width={CANVAS.width}
        height={CANVAS.height}
        defaultProps={{ solidBg: false }}
      />
    </>
  )
}

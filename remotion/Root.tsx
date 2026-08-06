import { Composition } from "remotion"
import { GenericLoader } from "./compositions/GenericLoader"
import { DiceNarrativeLoader } from "./compositions/DiceNarrativeLoader"
import { TrophyLoader } from "./compositions/TrophyLoader"
import { PressFlashLoader } from "./compositions/PressFlashLoader"
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
      <Composition
        id="DiceNarrativeLoader"
        component={DiceNarrativeLoader}
        durationInFrames={LOOP_FRAMES}
        fps={FPS}
        width={CANVAS.width}
        height={CANVAS.height}
        defaultProps={{ solidBg: false }}
      />
      <Composition
        id="TrophyLoader"
        component={TrophyLoader}
        durationInFrames={LOOP_FRAMES}
        fps={FPS}
        width={CANVAS.width}
        height={CANVAS.height}
        defaultProps={{ solidBg: false }}
      />
      <Composition
        id="PressFlashLoader"
        component={PressFlashLoader}
        durationInFrames={LOOP_FRAMES}
        fps={FPS}
        width={CANVAS.width}
        height={CANVAS.height}
        defaultProps={{ solidBg: false }}
      />
    </>
  )
}

"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { TIER_HEX } from "@/lib/tier-colors"
import PlayerFigure from "./PlayerFigure"
import CameraLookAt from "./CameraLookAt"

interface PlayerAvatarPreviewProps {
  kitColor?: string
  heightScale?: number
  buildScale?: number
}

const BG_COLOR = "#030712" // gray-950, matches the app background exactly
const CAMERA_TARGET: [number, number, number] = [0, 0.65, 0]

function Turntable({ kitColor, heightScale, buildScale }: Required<PlayerAvatarPreviewProps>) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.5
  })
  return (
    <group ref={ref}>
      <PlayerFigure kitColor={kitColor} heightScale={heightScale} buildScale={buildScale} />
    </group>
  )
}

export default function PlayerAvatarPreview({
  kitColor = TIER_HEX.green,
  heightScale = 1,
  buildScale = 1,
}: PlayerAvatarPreviewProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.7, 3.4], fov: 38 }}
      gl={{ antialias: true }}
      dpr={[1, 1.5]}
      onCreated={({ gl }) => gl.setClearColor(BG_COLOR)}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} />
      <pointLight position={[-2, 1, 1]} intensity={0.4} color={TIER_HEX.green} />
      <CameraLookAt target={CAMERA_TARGET} />
      <Turntable kitColor={kitColor} heightScale={heightScale} buildScale={buildScale} />
    </Canvas>
  )
}

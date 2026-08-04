"use client"

interface PlayerFigureProps {
  kitColor?: string
  skinColor?: string
  heightScale?: number
  buildScale?: number
}

export default function PlayerFigure({
  kitColor = "#4ade80",
  skinColor = "#e8b98a",
  heightScale = 1,
  buildScale = 1,
}: PlayerFigureProps) {
  return (
    <group>
      <mesh position={[0, 0.75 * heightScale, 0]} castShadow>
        <capsuleGeometry args={[0.26 * buildScale, 0.55 * heightScale, 4, 8]} />
        <meshStandardMaterial color={kitColor} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.32 * heightScale, 0]} castShadow>
        <sphereGeometry args={[0.2, 14, 14]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>
    </group>
  )
}

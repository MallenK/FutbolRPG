"use client"

import { useEffect, useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

export type DicePhase = "idle" | "rolling" | "done"

interface Dice3DProps {
  phase: DicePhase
  finalValue: number
}

const NEUTRAL_COLOR = "#9ca3af" // gray-400, matches the resting/rolling tone

const TIER_COLORS: [threshold: number, color: string][] = [
  [18, "#facc15"], // yellow-400 — crítico
  [13, "#4ade80"], // green-400 — suerte
  [8, "#60a5fa"],  // blue-400 — normal
  [4, "#fb923c"],  // orange-400 — mala suerte
  [0, "#ef4444"],  // red-500 — pifia
]

function tierColorFor(value: number): string {
  return TIER_COLORS.find(([threshold]) => value >= threshold)?.[1] ?? NEUTRAL_COLOR
}

function D20({ phase, finalValue }: Dice3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const spinRef = useRef({ x: 5, y: 7, z: 3 })
  const prevPhase = useRef<DicePhase>(phase)
  const colorRef = useRef(new THREE.Color(NEUTRAL_COLOR))
  const targetColor = useMemo(() => new THREE.Color(tierColorFor(finalValue)), [finalValue])
  const neutralColor = useMemo(() => new THREE.Color(NEUTRAL_COLOR), [])

  useEffect(() => {
    if (phase === "rolling" && prevPhase.current !== "rolling") {
      spinRef.current = {
        x: 4 + Math.random() * 4,
        y: 5 + Math.random() * 5,
        z: 2 + Math.random() * 3,
      }
    }
    prevPhase.current = phase
  }, [phase])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    if (phase === "rolling") {
      mesh.rotation.x += spinRef.current.x * delta
      mesh.rotation.y += spinRef.current.y * delta
      mesh.rotation.z += spinRef.current.z * delta
      colorRef.current.lerp(neutralColor, 0.12)
    } else if (phase === "done") {
      mesh.rotation.x = THREE.MathUtils.damp(mesh.rotation.x, Math.PI * 0.12, 4, delta)
      mesh.rotation.y = THREE.MathUtils.damp(mesh.rotation.y, Math.PI * 0.28, 4, delta)
      mesh.rotation.z = THREE.MathUtils.damp(mesh.rotation.z, 0, 4, delta)
      colorRef.current.lerp(targetColor, 0.1)
    } else {
      mesh.rotation.y += delta * 0.35
      colorRef.current.lerp(neutralColor, 0.08)
    }

    const material = mesh.material as THREE.MeshStandardMaterial
    material.color.copy(colorRef.current)
    material.emissive.copy(colorRef.current).multiplyScalar(phase === "done" ? 0.35 : 0.08)
  })

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={0.35} metalness={0.2} flatShading />
    </mesh>
  )
}

export default function Dice3D({ phase, finalValue }: Dice3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.4], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 2]} intensity={1.4} />
      <pointLight position={[-3, -2, -2]} intensity={0.5} color="#22c55e" />
      <D20 phase={phase} finalValue={finalValue} />
    </Canvas>
  )
}

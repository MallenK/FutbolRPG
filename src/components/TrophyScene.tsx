"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Sparkles } from "@react-three/drei"
import * as THREE from "three"
import { TIER_HEX } from "@/lib/tier-colors"

// Trofeo 100% procedural (mismo enfoque que Dice3D/FieldScene, sin asset
// externo): base + vástago + copa + asas, geometría low-poly a propósito
// (flatShading), mismo lenguaje angular que el TrophyLoader de Remotion
// (Fase 1) pero en 3D real. Ver FASE D en context.md.
const GOLD = TIER_HEX.yellow

function Trophy() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.5
  })

  const goldMat = <meshStandardMaterial color={GOLD} metalness={0.75} roughness={0.28} flatShading />

  return (
    <group ref={groupRef}>
      {/* base */}
      <mesh position={[0, -1.05, 0]}>
        <cylinderGeometry args={[0.5, 0.56, 0.16, 6]} />
        {goldMat}
      </mesh>
      {/* vástago */}
      <mesh position={[0, -0.62, 0]}>
        <cylinderGeometry args={[0.09, 0.13, 0.72, 6]} />
        {goldMat}
      </mesh>
      {/* copa */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.44, 0.16, 0.64, 8, 1]} />
        {goldMat}
      </mesh>
      {/* labio superior */}
      <mesh position={[0, 0.45, 0]}>
        <torusGeometry args={[0.45, 0.045, 6, 12]} />
        {goldMat}
      </mesh>
      {/* asas */}
      <mesh position={[0.47, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.19, 0.045, 6, 8, Math.PI]} />
        {goldMat}
      </mesh>
      <mesh position={[-0.47, 0.1, 0]} rotation={[0, Math.PI, Math.PI / 2]}>
        <torusGeometry args={[0.19, 0.045, 6, 8, Math.PI]} />
        {goldMat}
      </mesh>
      <Sparkles count={35} scale={[1.8, 2.4, 1.8]} position={[0, 0, 0]} size={3.5} speed={0.4} color={GOLD} />
    </group>
  )
}

export default function TrophyScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.1, 3.4], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 2]} intensity={1.4} />
      <pointLight position={[-3, -1, -2]} intensity={0.4} color={GOLD} />
      <Trophy />
    </Canvas>
  )
}

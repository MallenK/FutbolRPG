"use client"

import { Suspense, useEffect, useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"
import { TIER_HEX } from "@/lib/tier-colors"
import { MODELS_3D } from "@/lib/models-3d"

// Ejemplo de referencia del pipeline de public/models/README.md: mientras
// MODELS_3D["dice-d20"].ready sea false (no hay .glb todavía) se usa el
// icosaedro procedural de siempre; en cuanto exista el archivo y se active
// el flag, este mismo componente pasa a cargarlo sin tocar nada más — ver
// D20Model más abajo para el mismo patrón aplicado a un modelo real.
const DICE_MODEL = MODELS_3D["dice-d20"]

export type DicePhase = "idle" | "rolling" | "done"

interface Dice3DProps {
  phase: DicePhase
  finalValue: number
}

const NEUTRAL_COLOR = TIER_HEX.neutral

const TIER_COLORS: [threshold: number, color: string][] = [
  [18, TIER_HEX.yellow], // crítico
  [13, TIER_HEX.green],  // suerte
  [8, TIER_HEX.blue],    // normal
  [4, TIER_HEX.orange],  // mala suerte
  [0, TIER_HEX.red],     // pifia
]

function tierColorFor(value: number): string {
  return TIER_COLORS.find(([threshold]) => value >= threshold)?.[1] ?? NEUTRAL_COLOR
}

// Rotación de "rolling"/"done"/"idle" y el lerp de color por tier son
// idénticos entre la versión procedural y la de modelo real — solo cambia
// QUÉ objeto Three.js se rota y a qué material(es) se les copia el color.
function useDiceMotion({ phase, finalValue }: Dice3DProps) {
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

  return (object: THREE.Object3D, applyColor: (c: THREE.Color) => void, delta: number) => {
    if (phase === "rolling") {
      object.rotation.x += spinRef.current.x * delta
      object.rotation.y += spinRef.current.y * delta
      object.rotation.z += spinRef.current.z * delta
      colorRef.current.lerp(neutralColor, 0.12)
    } else if (phase === "done") {
      object.rotation.x = THREE.MathUtils.damp(object.rotation.x, Math.PI * 0.12, 4, delta)
      object.rotation.y = THREE.MathUtils.damp(object.rotation.y, Math.PI * 0.28, 4, delta)
      object.rotation.z = THREE.MathUtils.damp(object.rotation.z, 0, 4, delta)
      colorRef.current.lerp(targetColor, 0.1)
    } else {
      object.rotation.y += delta * 0.35
      colorRef.current.lerp(neutralColor, 0.08)
    }
    applyColor(colorRef.current)
  }
}

// Versión procedural de siempre — activa mientras DICE_MODEL.ready sea false.
function D20Procedural({ phase, finalValue }: Dice3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const tick = useDiceMotion({ phase, finalValue })

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    tick(mesh, (color) => {
      const material = mesh.material as THREE.MeshStandardMaterial
      material.color.copy(color)
      material.emissive.copy(color).multiplyScalar(phase === "done" ? 0.35 : 0.08)
    }, delta)
  })

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={0.35} metalness={0.2} flatShading />
    </mesh>
  )
}

// Versión con modelo real generado en Meshy (public/models/README.md) — solo
// se monta cuando DICE_MODEL.ready es true. El modelo puede traer varios
// mesh/material (cuerpo + números grabados, etc.), así que el color de tier
// se aplica a todos los materiales tintables encontrados al recorrer la
// escena, en vez de asumir un único mesh como en la versión procedural.
function D20Model({ phase, finalValue }: Dice3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF(DICE_MODEL.path) as unknown as { scene: THREE.Group }
  const tick = useDiceMotion({ phase, finalValue })

  const clonedScene = useMemo(() => scene.clone(), [scene])
  const materials = useMemo(() => {
    const found: THREE.MeshStandardMaterial[] = []
    clonedScene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        found.push(obj.material)
      }
    })
    return found
  }, [clonedScene])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return
    tick(group, (color) => {
      for (const material of materials) {
        material.color.copy(color)
        material.emissive.copy(color).multiplyScalar(phase === "done" ? 0.35 : 0.08)
      }
    }, delta)
  })

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  )
}

if (DICE_MODEL.ready) useGLTF.preload(DICE_MODEL.path)

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
      {DICE_MODEL.ready ? (
        <Suspense fallback={<D20Procedural phase={phase} finalValue={finalValue} />}>
          <D20Model phase={phase} finalValue={finalValue} />
        </Suspense>
      ) : (
        <D20Procedural phase={phase} finalValue={finalValue} />
      )}
    </Canvas>
  )
}

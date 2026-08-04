"use client"

import { useEffect, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { ResultadoDecision } from "@/engine/types"
import { TIER_HEX, resultadoToHex } from "@/lib/tier-colors"

export type FieldScenePhase = "idle" | "acting" | "result"

interface FieldSceneProps {
  phase: FieldScenePhase
  resultado?: ResultadoDecision
  gol?: boolean
}

const BG_COLOR = "#030712" // gray-950, matches the app background exactly
const CAMERA_TARGET = new THREE.Vector3(0, 0.85, -2.8)
const PLAYER_START = new THREE.Vector3(0, 0, 1.6)
const BALL_REST = new THREE.Vector3(0.32, 0.16, 1.4)
const GOAL_Z = -5.5

function CameraRig() {
  const { camera } = useThree()
  useEffect(() => {
    camera.lookAt(CAMERA_TARGET)
  }, [camera])
  return null
}

type Reaction = "step" | "jump" | "slump" | "stumble"

function tierOutcome(resultado: ResultadoDecision | undefined, gol: boolean | undefined) {
  switch (resultado) {
    case ResultadoDecision.PERFECTO:
      return { travel: 7.2, side: 0, arc: 1.7, reaction: gol ? "jump" as Reaction : "step" as Reaction }
    case ResultadoDecision.EXITO:
      return { travel: 6.2, side: 0.15, arc: 1.1, reaction: gol ? "jump" as Reaction : "step" as Reaction }
    case ResultadoDecision.PARCIAL:
      return { travel: 3.4, side: 0.5, arc: 0.6, reaction: "step" as Reaction }
    case ResultadoDecision.FALLO:
      return { travel: 2.8, side: 1.9, arc: 0.45, reaction: "slump" as Reaction }
    case ResultadoDecision.CRITICO_FALLO:
      return { travel: 1.1, side: -1.6, arc: 0.25, reaction: "stumble" as Reaction }
    default:
      return { travel: 0, side: 0, arc: 0, reaction: "step" as Reaction }
  }
}

function Player() {
  return (
    <group>
      <mesh position={[0, 0.75, 0]} castShadow>
        <capsuleGeometry args={[0.26, 0.55, 4, 8]} />
        <meshStandardMaterial color={TIER_HEX.green} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.32, 0]} castShadow>
        <sphereGeometry args={[0.2, 14, 14]} />
        <meshStandardMaterial color="#e8b98a" roughness={0.6} />
      </mesh>
    </group>
  )
}

function Goal() {
  const postMat = <meshStandardMaterial color="#e5e7eb" roughness={0.4} />
  return (
    <group position={[0, 0, GOAL_Z]}>
      <mesh position={[-1.1, 0.65, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 1.3, 8]} />
        {postMat}
      </mesh>
      <mesh position={[1.1, 0.65, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 1.3, 8]} />
        {postMat}
      </mesh>
      <mesh position={[0, 1.28, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 2.2, 8]} />
        {postMat}
      </mesh>
    </group>
  )
}

function Pitch() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1.8]} receiveShadow>
        <planeGeometry args={[6.5, 9.5]} />
        <meshStandardMaterial color="#052e16" roughness={1} />
      </mesh>
      {/* goal line */}
      <mesh position={[0, 0.01, GOAL_Z + 0.02]}>
        <boxGeometry args={[3, 0.02, 0.05]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      {/* penalty box */}
      <mesh position={[-1.6, 0.01, GOAL_Z + 1.1]}>
        <boxGeometry args={[0.05, 0.02, 2.2]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      <mesh position={[1.6, 0.01, GOAL_Z + 1.1]}>
        <boxGeometry args={[0.05, 0.02, 2.2]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      <mesh position={[0, 0.01, GOAL_Z + 2.2]}>
        <boxGeometry args={[3.2, 0.02, 0.05]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
    </group>
  )
}

function Scene({ phase, resultado, gol }: FieldSceneProps) {
  const playerRef = useRef<THREE.Group>(null)
  const ballRef = useRef<THREE.Mesh>(null)
  const ballMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const tRef = useRef(0)
  const prevKeyRef = useRef("")
  const currentColorRef = useRef(new THREE.Color("#f8fafc"))
  const targetColorRef = useRef(new THREE.Color("#f8fafc"))

  const key = phase === "result" ? `result:${resultado}` : phase

  useEffect(() => {
    if (key === prevKeyRef.current) return
    prevKeyRef.current = key
    tRef.current = 0
    targetColorRef.current.set(
      phase === "result" && resultado ? resultadoToHex(resultado) : "#f8fafc"
    )
  }, [key, phase, resultado])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    tRef.current += delta
    const t = tRef.current
    const player = playerRef.current
    const ball = ballRef.current
    if (!player || !ball) return

    if (phase === "idle") {
      player.position.set(PLAYER_START.x, Math.sin(t * 2) * 0.04, PLAYER_START.z)
      player.rotation.set(0, 0, 0)
      ball.position.copy(BALL_REST)
      ball.rotation.y += delta * 0.6
    } else if (phase === "acting") {
      const lean = Math.min(t / 0.4, 1) * 0.15
      player.position.set(PLAYER_START.x, Math.sin(t * 8) * 0.02, PLAYER_START.z)
      player.rotation.set(lean, 0, 0)
      ball.position.set(BALL_REST.x, BALL_REST.y + Math.sin(t * 10) * 0.02, BALL_REST.z)
    } else {
      const { travel, side, arc, reaction } = tierOutcome(resultado, gol)
      const progress = Math.min(t / 1.1, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      ball.position.set(
        BALL_REST.x + side * eased,
        BALL_REST.y + Math.sin(eased * Math.PI) * arc,
        BALL_REST.z - travel * eased,
      )
      ball.rotation.x += delta * (4 + travel)

      if (reaction === "jump") {
        const hop = Math.sin(Math.min(t, 0.6) / 0.6 * Math.PI)
        player.position.set(PLAYER_START.x, Math.max(hop, 0) * 0.35, PLAYER_START.z)
        player.rotation.set(0, 0, 0)
      } else if (reaction === "stumble") {
        const wobble = Math.sin(Math.min(t, 0.5) / 0.5 * Math.PI)
        player.position.set(PLAYER_START.x, 0, PLAYER_START.z)
        player.rotation.set(0, 0, wobble * 0.4)
      } else if (reaction === "slump") {
        player.position.set(PLAYER_START.x, 0, PLAYER_START.z)
        player.rotation.set(Math.min(t / 0.5, 1) * 0.25, 0, 0)
      } else {
        player.position.set(PLAYER_START.x, 0, PLAYER_START.z - Math.min(t, 0.4) * 0.3)
        player.rotation.set(0, 0, 0)
      }
    }

    const glowSpeed = phase === "acting" ? 8 : 3
    const glowStrength = phase === "acting" ? (Math.sin(t * glowSpeed) * 0.5 + 0.5) * 0.5 : phase === "result" ? 0.6 : 0.05
    currentColorRef.current.lerp(targetColorRef.current, delta * 4)
    if (ballMatRef.current) {
      ballMatRef.current.emissive.copy(currentColorRef.current).multiplyScalar(glowStrength)
    }
  })

  return (
    <>
      <Pitch />
      <Goal />
      <group ref={playerRef} position={PLAYER_START}>
        <Player />
      </group>
      <mesh ref={ballRef} position={BALL_REST}>
        <sphereGeometry args={[0.19, 16, 16]} />
        <meshStandardMaterial ref={ballMatRef} color="#f8fafc" roughness={0.35} />
      </mesh>
    </>
  )
}

export default function FieldScene({ phase, resultado, gol }: FieldSceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 1.7, 5], fov: 45 }}
      gl={{ antialias: true }}
      dpr={[1, 1.5]}
      onCreated={({ gl }) => gl.setClearColor(BG_COLOR)}
    >
      <fog attach="fog" args={[BG_COLOR, 6, 15]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 3]} intensity={1.2} castShadow />
      <pointLight position={[-2, 2, 2]} intensity={0.35} color={TIER_HEX.green} />
      <CameraRig />
      <Scene phase={phase} resultado={resultado} gol={gol} />
    </Canvas>
  )
}

"use client"

import { useEffect, useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { ResultadoDecision } from "@/engine/types"
import { TIER_HEX, resultadoToHex } from "@/lib/tier-colors"
import PlayerFigure from "./PlayerFigure"
import CameraLookAt from "./CameraLookAt"

export type FieldScenePhase = "idle" | "acting" | "result"

interface FieldSceneProps {
  phase: FieldScenePhase
  resultado?: ResultadoDecision
  gol?: boolean
  // Turno de portero defendiendo su propia portería (ver Situacion.peligroPropio
  // en match-interactive.ts): la pelota viaja hacia la portería en vez de alejarse
  // de ella, y "encajado" (no el tramo del resultado) decide si entra o se para.
  peligroPropio?: boolean
  encajado?: boolean
}

const BG_COLOR = "#030712" // gray-950, matches the app background exactly
const CAMERA_TARGET: [number, number, number] = [0, 0.85, -2.8]
const PLAYER_START = new THREE.Vector3(0, 0, 1.6)
const BALL_REST = new THREE.Vector3(0.32, 0.16, 1.4)
const GOAL_Z = -5.5

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

// Same ball-travel mechanic as tierOutcome, read backwards: for a save the ball
// is stopped early (short travel); for a conceded goal it completes the full
// distance to the net. Severity comes from "encajado", not the result tier alone,
// since e.g. a FALLO still saves 55% of the time (see peligroPropio branch in
// resolveDecisionWithDice).
function tierOutcomePortero(resultado: ResultadoDecision | undefined, encajado: boolean | undefined) {
  if (encajado) {
    if (resultado === ResultadoDecision.CRITICO_FALLO) {
      return { travel: 7.0, side: 0, arc: 0.25, reaction: "stumble" as Reaction }
    }
    return { travel: 6.6, side: 0.8, arc: 0.45, reaction: "slump" as Reaction }
  }
  switch (resultado) {
    case ResultadoDecision.PERFECTO:
      return { travel: 0.9, side: 0, arc: 0.25, reaction: "jump" as Reaction }
    case ResultadoDecision.EXITO:
      return { travel: 1.6, side: 0.3, arc: 0.3, reaction: "step" as Reaction }
    case ResultadoDecision.PARCIAL:
      return { travel: 2.4, side: 0.6, arc: 0.35, reaction: "step" as Reaction }
    case ResultadoDecision.FALLO:
      return { travel: 3.0, side: 1.0, arc: 0.4, reaction: "step" as Reaction }
    case ResultadoDecision.CRITICO_FALLO:
      return { travel: 3.4, side: -1.1, arc: 0.4, reaction: "step" as Reaction }
    default:
      return { travel: 0, side: 0, arc: 0, reaction: "step" as Reaction }
  }
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

function Scene({ phase, resultado, gol, peligroPropio, encajado }: FieldSceneProps) {
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

  // Which named clip from the Kenney rig should play for the current phase/outcome.
  // The character's own animation now carries the acting (arms, legs); the group
  // transforms below stay limited to whole-body movement (hop height, step forward).
  const characterAnimation = useMemo(() => {
    if (phase !== "result") return "idle"
    const reaction = peligroPropio
      ? tierOutcomePortero(resultado, encajado).reaction
      : tierOutcome(resultado, gol).reaction
    switch (reaction) {
      case "jump": return "emote-yes"
      case "stumble": return "die"
      case "slump": return "emote-no"
      default: return peligroPropio ? "idle" : "attack-kick-right"
    }
  }, [phase, resultado, gol, peligroPropio, encajado])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    tRef.current += delta
    const t = tRef.current
    const player = playerRef.current
    const ball = ballRef.current
    if (!player || !ball) return

    if (phase === "idle") {
      player.position.set(PLAYER_START.x, 0, PLAYER_START.z)
      ball.position.copy(BALL_REST)
      ball.rotation.y += delta * 0.6
    } else if (phase === "acting") {
      player.position.set(PLAYER_START.x, 0, PLAYER_START.z)
      ball.position.set(BALL_REST.x, BALL_REST.y + Math.sin(t * 10) * 0.02, BALL_REST.z)
    } else {
      const { travel, side, arc, reaction } = peligroPropio
        ? tierOutcomePortero(resultado, encajado)
        : tierOutcome(resultado, gol)
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
        player.position.set(PLAYER_START.x, Math.max(hop, 0) * 0.3, PLAYER_START.z)
      } else if (reaction === "step") {
        player.position.set(PLAYER_START.x, 0, PLAYER_START.z - Math.min(t, 0.4) * 0.3)
      } else {
        player.position.set(PLAYER_START.x, 0, PLAYER_START.z)
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
        <PlayerFigure kitColor={peligroPropio ? TIER_HEX.yellow : TIER_HEX.green} animation={characterAnimation} />
      </group>
      <mesh ref={ballRef} position={BALL_REST}>
        <sphereGeometry args={[0.19, 16, 16]} />
        <meshStandardMaterial ref={ballMatRef} color="#f8fafc" roughness={0.35} />
      </mesh>
    </>
  )
}

export default function FieldScene({ phase, resultado, gol, peligroPropio, encajado }: FieldSceneProps) {
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
      <CameraLookAt target={CAMERA_TARGET} />
      <Scene phase={phase} resultado={resultado} gol={gol} peligroPropio={peligroPropio} encajado={encajado} />
    </Canvas>
  )
}

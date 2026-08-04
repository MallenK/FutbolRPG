"use client"

import { useEffect, useMemo, useRef } from "react"
import { useGLTF, useAnimations } from "@react-three/drei"
import * as THREE from "three"
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js"

// Kenney "Blocky Characters" (CC0) — see /public/models/player/KENNEY-LICENSE.txt
const MODEL_URL = "/models/player/character-h.glb"

interface PlayerFigureProps {
  kitColor?: string
  animation?: string
  heightScale?: number
  buildScale?: number
}

export default function PlayerFigure({
  kitColor = "#4ade80",
  animation = "idle",
  heightScale = 1,
  buildScale = 1,
}: PlayerFigureProps) {
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF(MODEL_URL) as unknown as {
    scene: THREE.Group
    animations: THREE.AnimationClip[]
  }

  // Clone geometry+materials per instance so two PlayerFigures on screen at
  // once (e.g. different kit colors) don't fight over the same cached GLTF,
  // then auto-fit to a consistent height with feet at y=0 — the source
  // model's native scale/pivot shouldn't leak into every scene that uses
  // this component.
  const clonedScene = useMemo(() => {
    // Plain Object3D.clone() breaks animation bindings on GLTF scenes (the
    // clip's PropertyBindings end up targeting the wrong cloned nodes).
    // SkeletonUtils.clone is the three.js-recommended way to clone a scene
    // that's going to be animated, whether or not it uses real bone skinning.
    const clone = cloneSkeleton(scene) as THREE.Group
    clone.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = (obj.material as THREE.Material).clone()
        obj.castShadow = true
      }
    })

    // Fit against the *bind* pose bounding box, but leave real headroom: once
    // an animation plays (idle sway, kicks, emotes) the silhouette can extend
    // well beyond the static bind pose, so undersize on purpose.
    const TARGET_HEIGHT = 1.3
    const rawSize = new THREE.Box3().setFromObject(clone).getSize(new THREE.Vector3())
    const fitScale = rawSize.y > 0 ? TARGET_HEIGHT / rawSize.y : 1
    clone.scale.setScalar(fitScale)

    const fittedBox = new THREE.Box3().setFromObject(clone)
    const center = fittedBox.getCenter(new THREE.Vector3())
    clone.position.x -= center.x
    clone.position.z -= center.z
    clone.position.y -= fittedBox.min.y

    return clone
  }, [scene])

  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    const action = actions[animation]
    if (!action) return
    action.reset().fadeIn(0.2).play()
    return () => {
      action.fadeOut(0.2)
    }
  }, [animation, actions])

  useEffect(() => {
    clonedScene.traverse((obj: THREE.Object3D) => {
      const isTintable =
        obj instanceof THREE.Mesh &&
        (obj.material instanceof THREE.MeshBasicMaterial || obj.material instanceof THREE.MeshStandardMaterial)
      if (isTintable) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial
        // Multiplying color against the base texture (not replacing it —
        // nulling `.map` on this KHR_materials_unlit export breaks the mesh)
        // still gives a clear green/yellow kit read while keeping the
        // texture's shading detail underneath.
        mat.color.set(kitColor)
        mat.needsUpdate = true
      }
    })
  }, [clonedScene, kitColor])

  return (
    <group ref={group} scale={[buildScale, heightScale, buildScale]}>
      <primitive object={clonedScene} />
    </group>
  )
}

useGLTF.preload(MODEL_URL)

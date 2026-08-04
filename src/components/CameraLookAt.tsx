"use client"

import { useEffect } from "react"
import { useThree } from "@react-three/fiber"
import * as THREE from "three"

interface CameraLookAtProps {
  target: [number, number, number]
}

export default function CameraLookAt({ target }: CameraLookAtProps) {
  const { camera } = useThree()
  useEffect(() => {
    camera.lookAt(new THREE.Vector3(...target))
  }, [camera, target])
  return null
}

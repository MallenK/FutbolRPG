"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"

const Dice3D = dynamic(() => import("./Dice3D"), {
  ssr: false,
  loading: () => <div className="w-full h-full rounded-2xl bg-gray-900/60 animate-pulse" />,
})

interface DiceRollProps {
  rolling: boolean
  finalValue: number
  onComplete?: () => void
}

export default function DiceRoll({ rolling, finalValue, onComplete }: DiceRollProps) {
  const [display, setDisplay] = useState<number>(finalValue)
  const [phase, setPhase] = useState<"idle" | "rolling" | "done">("idle")
  const onCompleteRef = useRef(onComplete)

  useEffect(() => { onCompleteRef.current = onComplete })

  useEffect(() => {
    if (!rolling) {
      setPhase((p) => (p === "rolling" ? "idle" : p))
      return
    }
    setPhase("rolling")
    let count = 0
    const interval = setInterval(() => {
      setDisplay(Math.floor(Math.random() * 20) + 1)
      count++
      if (count >= 20) {
        clearInterval(interval)
        setDisplay(finalValue)
        setPhase("done")
        onCompleteRef.current?.()
      }
    }, 60)
    return () => clearInterval(interval)
  }, [rolling, finalValue])

  const getDiceTextColor = () => {
    if (phase !== "done") return "text-gray-300"
    if (finalValue >= 18) return "text-yellow-400"
    if (finalValue >= 13) return "text-green-400"
    if (finalValue >= 8) return "text-blue-400"
    if (finalValue >= 4) return "text-orange-400"
    return "text-red-500"
  }

  const getDiceLabel = () => {
    if (finalValue >= 18) return "¡Crítico!"
    if (finalValue >= 13) return "Suerte"
    if (finalValue >= 8) return "Normal"
    if (finalValue >= 4) return "Mala suerte"
    return "¡Pifia!"
  }

  const text = getDiceTextColor()

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-gray-500 text-xs uppercase tracking-widest font-mono">
        D20 — Dado de suerte
      </div>
      <div className="relative w-32 h-32">
        <Dice3D phase={phase} finalValue={finalValue} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-4xl font-black font-mono drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] ${text}`}>
            {display}
          </span>
        </div>
      </div>
      {phase === "done" && (
        <div className={`text-sm font-bold uppercase tracking-wider ${text}`}>
          {getDiceLabel()}
        </div>
      )}
    </div>
  )
}

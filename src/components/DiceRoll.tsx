"use client"

import { useEffect, useRef, useState } from "react"

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

  const getDiceColors = () => {
    if (phase !== "done") return { border: "border-gray-500", text: "text-gray-300", shadow: "" }
    if (finalValue >= 18) return { border: "border-yellow-400", text: "text-yellow-400", shadow: "shadow-yellow-400/50" }
    if (finalValue >= 13) return { border: "border-green-400", text: "text-green-400", shadow: "shadow-green-400/30" }
    if (finalValue >= 8) return { border: "border-blue-400", text: "text-blue-400", shadow: "shadow-blue-400/30" }
    if (finalValue >= 4) return { border: "border-orange-400", text: "text-orange-400", shadow: "shadow-orange-400/30" }
    return { border: "border-red-500", text: "text-red-500", shadow: "shadow-red-500/30" }
  }

  const getDiceLabel = () => {
    if (finalValue >= 18) return "¡Crítico!"
    if (finalValue >= 13) return "Suerte"
    if (finalValue >= 8) return "Normal"
    if (finalValue >= 4) return "Mala suerte"
    return "¡Pifia!"
  }

  const { border, text, shadow } = getDiceColors()

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-gray-500 text-xs uppercase tracking-widest font-mono">
        D20 — Dado de suerte
      </div>
      <div
        className={`w-24 h-24 rounded-2xl border-2 flex items-center justify-center
          transition-all duration-300 shadow-lg
          ${phase === "rolling" ? "animate-pulse scale-110" : ""}
          ${border} ${text} ${shadow}`}
      >
        <span className="text-4xl font-black font-mono">{display}</span>
      </div>
      {phase === "done" && (
        <div className={`text-sm font-bold uppercase tracking-wider ${text}`}>
          {getDiceLabel()}
        </div>
      )}
    </div>
  )
}

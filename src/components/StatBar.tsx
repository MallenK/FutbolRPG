"use client"

interface StatBarProps {
  label?: string
  value: number
  max?: number
  color?: "green" | "blue" | "yellow" | "red" | "purple"
  showValue?: boolean
  size?: "sm" | "md"
}

const COLOR_MAP = {
  green: "bg-green-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
  purple: "bg-purple-500",
}

const getAutoColor = (value: number): keyof typeof COLOR_MAP => {
  if (value >= 80) return "green"
  if (value >= 65) return "yellow"
  if (value >= 50) return "blue"
  return "red"
}

export default function StatBar({
  label = "",
  value,
  max = 99,
  color,
  showValue = true,
  size = "md",
}: StatBarProps) {
  const pct = Math.min(100, (value / max) * 100)
  const colorClass = COLOR_MAP[color ?? getAutoColor(value)]
  const barH = size === "sm" ? "h-1" : "h-2"
  const textSize = size === "sm" ? "text-xs" : "text-sm"

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className={`${textSize} text-gray-400 uppercase tracking-wider font-mono w-10 shrink-0`}>
          {label}
        </span>
      )}
      <div className={`flex-1 bg-gray-800 rounded-full ${barH} overflow-hidden`}>
        <div
          className={`${colorClass} ${barH} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && (
        <span className={`${textSize} font-bold text-white w-6 text-right`}>{value}</span>
      )}
    </div>
  )
}

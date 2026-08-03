interface Props {
  level: number
  xp: number
}

export default function XPBar({ level, xp }: Props) {
  const xpNeeded = level * 400
  const pct = Math.min(100, (xp / xpNeeded) * 100)

  return (
    <div className="flex items-center gap-3">
      <span className="text-green-400 font-bold text-sm shrink-0 font-mono">Nv.{level}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-gray-600 text-xs shrink-0 font-mono">{xp}/{xpNeeded} XP</span>
    </div>
  )
}

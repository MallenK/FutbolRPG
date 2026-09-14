type SeasonEntry = {
  temporada: number
  club: string
  premios: string[]
}

export default function TrophyShowcase({ historial }: { historial: SeasonEntry[] }) {
  const totalPremios = historial.reduce((n, t) => n + t.premios.length, 0)
  if (historial.length === 0) return null

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vitrina de trofeos</h3>
        <span className="text-xs text-gray-600 font-mono">
          {totalPremios} galardón{totalPremios !== 1 ? "es" : ""} en {historial.length} temporada{historial.length !== 1 ? "s" : ""}
        </span>
      </div>
      {totalPremios === 0 ? (
        <p className="text-gray-600 text-xs text-center py-4">Todavía no ha ganado ningún premio.</p>
      ) : (
        <div className="space-y-3">
          {[...historial].reverse().filter((t) => t.premios.length > 0).map((t) => (
            <div key={t.temporada} className="flex items-start gap-3">
              <span className="text-gray-600 text-xs font-mono w-16 shrink-0 pt-0.5">T{t.temporada}</span>
              <div className="flex-1">
                <p className="text-gray-500 text-xs mb-1">{t.club}</p>
                <div className="flex flex-wrap gap-1.5">
                  {t.premios.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-semibold">
                      🏆 {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

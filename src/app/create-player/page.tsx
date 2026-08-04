"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import StatBar from "@/components/StatBar"
import {
  POSITIONS, NATIONALITIES, NATIONALITY_FLAGS,
  ORIGINS, PERSONALITIES, PLAY_STYLES, SELECTABLE_TRAITS, getSelectableTraits,
  FOOT_OPTIONS, POSITION_STAT_PROFILES, STAT_BY_KEY, BASE_STATS,
  buildAttributes,
  type Position, type OriginId, type PersonalityId, type DominantFoot, type StatKey,
} from "@/lib/player-config"
import { getDivisionInfo } from "@/lib/world"
import { TIER_HEX } from "@/lib/tier-colors"
import dynamic from "next/dynamic"

const PlayerAvatarPreview = dynamic(() => import("@/components/PlayerAvatarPreview"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-950 animate-pulse" />,
})

const TOTAL_STEPS = 7
const EXTRA_POINTS = 30
const MAX_PER_STAT = 15

const DIVISION_OPTIONS = [
  { nivel: 1, tag: "Difícil",   desc: "Clubs regionales. La carrera más larga y épica." },
  { nivel: 2, tag: "Normal",    desc: "Fútbol semiprofesional. Progresión más realista." },
  { nivel: 3, tag: "Estándar",  desc: "Profesional desde el primer día." },
]

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
  const labels = ["Identidad", "Origen", "Posición", "Personalidad", "Atributos", "División", "Resumen"]
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-black mb-1">
        Futbol<span className="text-green-400">RPG</span>
      </h1>
      <p className="text-gray-500 text-sm">Crea tu carrera · Paso {step} de {total}: <span className="text-gray-400">{labels[step - 1]}</span></p>
      <div className="flex gap-1.5 mt-3">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i + 1 < step ? "bg-green-500" : i + 1 === step ? "bg-green-400" : "bg-gray-800"}`} />
        ))}
      </div>
    </div>
  )
}

// ─── Navigation buttons ───────────────────────────────────────────────────────

function NavButtons({ onBack, onNext, nextLabel = "Siguiente →", disabled = false }: {
  onBack?: () => void; onNext: () => void; nextLabel?: string; disabled?: boolean
}) {
  return (
    <div className="flex gap-3 pt-2">
      {onBack && (
        <button onClick={onBack} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors">
          ← Atrás
        </button>
      )}
      <button
        onClick={onNext}
        disabled={disabled}
        className="flex-1 py-3 bg-green-500 hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold rounded-xl transition-colors"
      >
        {nextLabel}
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CreatePlayerPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  const [checking, setChecking] = useState(true)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Step 1: Identity
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [apodo, setApodo] = useState("")
  const [dorsal, setDorsal] = useState(10)
  const [nationality, setNationality] = useState("España")
  const [birthYear, setBirthYear] = useState(2002)
  const [altura, setAltura] = useState(180)
  const [peso, setPeso] = useState(75)
  const [foot, setFoot] = useState<DominantFoot>("derecho")

  // Step 2: Origin
  const [originId, setOriginId] = useState<OriginId>("academia")

  // Step 3: Position + style
  const [position, setPosition] = useState<Position>("ST")
  const [playStyle, setPlayStyle] = useState<string>("")

  // Step 4: Personality
  const [personality, setPersonality] = useState<PersonalityId>("profesional")

  // Step 5: Traits + extra points
  const [selectedTrait, setSelectedTrait] = useState<string>(getSelectableTraits("ST")[0].id)
  const [extras, setExtras] = useState<Partial<Record<StatKey, number>>>({})
  const [pointsLeft, setPointsLeft] = useState(EXTRA_POINTS)

  // Step 6: Division + club
  const [divisionInicial, setDivisionInicial] = useState(3)
  const [clubElegido, setClubElegido] = useState(getDivisionInfo(3).clubes[0])

  // Reset style when position changes
  useEffect(() => {
    setPlayStyle(PLAY_STYLES[position][0].id)
  }, [position])

  // Keep the selected trait valid for the current position
  useEffect(() => {
    const available = getSelectableTraits(position)
    if (!available.some((t) => t.id === selectedTrait)) {
      setSelectedTrait(available[0].id)
    }
  }, [position, selectedTrait])

  // Reset club choice when division changes
  useEffect(() => {
    setClubElegido(getDivisionInfo(divisionInicial).clubes[0])
  }, [divisionInicial])

  // Reset extras when position/origin change
  useEffect(() => {
    setExtras({})
    setPointsLeft(EXTRA_POINTS)
  }, [position, originId])

  useEffect(() => {
    if (!isPending && !session) router.push("/login")
  }, [session, isPending, router])

  useEffect(() => {
    if (!session) return
    fetch("/api/player")
      .then((r) => r.json())
      .then(({ player }) => {
        if (player) router.push("/dashboard")
        else setChecking(false)
      })
  }, [session, router])

  // ── Stat helpers ────────────────────────────────────────────────────────────

  const getStatValue = (key: StatKey): number => {
    const origin = ORIGINS.find((o) => o.id === originId)!
    const footDef = FOOT_OPTIONS.find((f) => f.id === foot)!
    const base = BASE_STATS[position][key] ?? 50
    return Math.min(99, base + (origin.bonuses[key] ?? 0) + (footDef.bonus[key] ?? 0) + (extras[key] ?? 0))
  }

  const addPoint = (key: StatKey) => {
    if (pointsLeft <= 0 || (extras[key] ?? 0) >= MAX_PER_STAT) return
    setExtras((p) => ({ ...p, [key]: (p[key] ?? 0) + 1 }))
    setPointsLeft((p) => p - 1)
  }

  const removePoint = (key: StatKey) => {
    if ((extras[key] ?? 0) <= 0) return
    setExtras((p) => ({ ...p, [key]: (p[key] ?? 0) - 1 }))
    setPointsLeft((p) => p + 1)
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true)
    setError("")
    const origin = ORIGINS.find((o) => o.id === originId)!
    const attributes = buildAttributes(position, originId, extras, foot)
    const currentYear = 2026
    const age = currentYear - birthYear

    try {
      const res = await fetch("/api/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${nombre} ${apellido}`.trim(),
          position,
          nationality,
          divisionInicial,
          attributes,
          rpg: {
            apellido,
            apodo: apodo.trim() || undefined,
            dorsal,
            piernaDominante: foot,
            altura,
            peso,
            age,
            origen: originId,
            personalidad: personality,
            estiloJuego: playStyle,
            traits: [origin.traitId, selectedTrait],
            potencial: origin.potencial,
            clubElegido,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al crear jugador")
        setSubmitting(false)
        return
      }
      router.push("/dashboard")
    } catch {
      setError("Error de conexión")
      setSubmitting(false)
    }
  }

  if (isPending || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-gray-400">Cargando...</div>
      </div>
    )
  }

  const profile = POSITION_STAT_PROFILES[position]

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <StepIndicator step={step} total={TOTAL_STEPS} />

        <div className="mb-6 rounded-2xl border border-gray-800 overflow-hidden bg-gray-900">
          <div className="relative w-full h-56">
            <PlayerAvatarPreview
              kitColor={position === "GK" ? TIER_HEX.yellow : TIER_HEX.green}
              heightScale={altura / 180}
              buildScale={peso / 75}
            />
            <div className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/60 border border-gray-700 flex items-center justify-center">
              <span className="text-white font-mono font-bold text-sm">{dorsal}</span>
            </div>
            <div className="absolute top-3 right-3 text-lg">{NATIONALITY_FLAGS[nationality]}</div>
          </div>
          <div className="px-4 py-3 border-t border-gray-800 text-center">
            <p className="text-white font-bold">
              {apodo.trim() ? `"${apodo.trim()}"` : (nombre || "Tu jugador")}
            </p>
            {apodo.trim() && (nombre || apellido) && (
              <p className="text-gray-500 text-xs mt-0.5">{nombre} {apellido}</p>
            )}
          </div>
        </div>

        {/* ── Step 1: Identity ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Nombre</label>
                <input
                  value={nombre} onChange={(e) => setNombre(e.target.value)}
                  placeholder="Carlos" maxLength={20}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Apellido</label>
                <input
                  value={apellido} onChange={(e) => setApellido(e.target.value)}
                  placeholder="García" maxLength={20}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Apodo <span className="text-gray-600 normal-case">(opcional)</span></label>
                <input
                  value={apodo} onChange={(e) => setApodo(e.target.value)}
                  placeholder="El Mago" maxLength={20}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Dorsal</label>
                <input
                  type="number" min={1} max={99} value={dorsal}
                  onChange={(e) => setDorsal(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-center font-mono font-bold focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Nacionalidad</label>
              <select
                value={nationality} onChange={(e) => setNationality(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
              >
                {NATIONALITIES.map((n) => <option key={n} value={n}>{NATIONALITY_FLAGS[n]} {n}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Año de nacimiento</label>
              <div className="flex items-center gap-4">
                <input
                  type="range" min={1997} max={2008} value={birthYear}
                  onChange={(e) => setBirthYear(Number(e.target.value))}
                  className="flex-1 accent-green-500"
                />
                <span className="text-white font-mono font-bold w-24 text-right">
                  {birthYear} · <span className="text-green-400">{2026 - birthYear} años</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Altura (cm)</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={160} max={205} value={altura} onChange={(e) => setAltura(Number(e.target.value))} className="flex-1 accent-green-500" />
                  <span className="text-white font-mono text-sm w-16 text-right">{altura} cm</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Peso (kg)</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={60} max={100} value={peso} onChange={(e) => setPeso(Number(e.target.value))} className="flex-1 accent-green-500" />
                  <span className="text-white font-mono text-sm w-16 text-right">{peso} kg</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Pie dominante</label>
              <div className="grid grid-cols-3 gap-2">
                {FOOT_OPTIONS.map((f) => (
                  <button key={f.id} onClick={() => setFoot(f.id)}
                    className={`py-3 rounded-xl font-bold text-sm transition-colors ${foot === f.id ? "bg-green-500 text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <NavButtons onNext={() => setStep(2)} disabled={!nombre.trim()} />
          </div>
        )}

        {/* ── Step 2: Origin ───────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Tu historia define tus fortalezas iniciales.</p>
            {ORIGINS.map((o) => {
              const selected = originId === o.id
              const topBonuses = Object.entries(o.bonuses).sort(([, a], [, b]) => b - a).slice(0, 3)
              return (
                <button key={o.id} onClick={() => setOriginId(o.id)}
                  className={`w-full text-left p-5 rounded-2xl border transition-colors ${selected ? "border-green-500 bg-green-500/10" : "border-gray-700 bg-gray-900 hover:border-gray-500"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-white">{o.nombre}</p>
                      <p className="text-gray-400 text-sm mt-1 leading-relaxed">{o.historia}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 mt-0.5 ${
                      o.potencial >= 4 ? "bg-green-500/20 text-green-400" :
                      o.potencial === 3 ? "bg-blue-500/20 text-blue-400" :
                      "bg-orange-500/20 text-orange-400"
                    }`}>
                      Pot. {o.potencial}/5
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {topBonuses.map(([key, val]) => (
                      <span key={key} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
                        +{val} {STAT_BY_KEY[key as StatKey]?.label ?? key}
                      </span>
                    ))}
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                      Trait: {o.traitId.replace(/_/g, " ")}
                    </span>
                  </div>
                </button>
              )
            })}
            <NavButtons onBack={() => setStep(1)} onNext={() => setStep(3)} />
          </div>
        )}

        {/* ── Step 3: Position + style ─────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-gray-400 mb-3 uppercase tracking-wider">Posición</label>
              <div className="grid grid-cols-4 gap-2">
                {POSITIONS.map((pos) => (
                  <button key={pos.id} onClick={() => setPosition(pos.id)}
                    className={`py-3 px-2 rounded-xl font-bold text-xs transition-colors ${position === pos.id ? "bg-green-500 text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                  >
                    <div className="text-base font-black">{pos.id}</div>
                    <div className="mt-0.5 font-normal">{pos.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-3 uppercase tracking-wider">Estilo de juego</label>
              <div className="space-y-2">
                {PLAY_STYLES[position].map((style) => (
                  <button key={style.id} onClick={() => setPlayStyle(style.id)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors ${playStyle === style.id ? "border-green-500 bg-green-500/10" : "border-gray-700 bg-gray-900 hover:border-gray-500"}`}
                  >
                    <p className="font-bold text-white text-sm">{style.label}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{style.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <NavButtons onBack={() => setStep(2)} onNext={() => setStep(4)} />
          </div>
        )}

        {/* ── Step 4: Personality ──────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Tu personalidad afecta cómo reaccionas bajo presión y en el vestuario.</p>
            {PERSONALITIES.map((p) => (
              <button key={p.id} onClick={() => setPersonality(p.id)}
                className={`w-full text-left p-5 rounded-2xl border transition-colors ${personality === p.id ? "border-green-500 bg-green-500/10" : "border-gray-700 bg-gray-900 hover:border-gray-500"}`}
              >
                <p className="font-bold text-white">{p.nombre}</p>
                <p className="text-gray-400 text-sm mt-1">{p.descripcion}</p>
                <p className="text-green-400/80 text-xs mt-2">{p.efecto}</p>
              </button>
            ))}
            <NavButtons onBack={() => setStep(3)} onNext={() => setStep(5)} />
          </div>
        )}

        {/* ── Step 5: Attributes + Trait ───────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-5">
            {/* Trait selection */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Elige tu rasgo especial</p>
              <div className="grid grid-cols-2 gap-2">
                {getSelectableTraits(position).map((t) => (
                  <button key={t.id} onClick={() => setSelectedTrait(t.id)}
                    className={`text-left p-3 rounded-xl border transition-colors ${selectedTrait === t.id ? "border-yellow-500 bg-yellow-500/10" : "border-gray-700 bg-gray-900 hover:border-gray-500"}`}
                  >
                    <p className="text-white font-bold text-xs">{t.nombre}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{t.efecto}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Points banner */}
            <div className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-3 border border-gray-800">
              <span className="text-gray-400 text-sm">Puntos extra disponibles</span>
              <span className={`font-black text-xl ${pointsLeft > 0 ? "text-green-400" : "text-gray-600"}`}>{pointsLeft}</span>
            </div>

            {/* Primary stats */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Atributos principales</p>
              {profile.primary.map((key) => {
                const statDef = STAT_BY_KEY[key]
                const value = getStatValue(key)
                const extra = extras[key] ?? 0
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-gray-200 text-sm w-28 shrink-0">{statDef.label}</span>
                    <div className="flex-1"><StatBar value={value} size="sm" showValue={false} /></div>
                    <span className="text-white font-mono font-bold text-sm w-8 text-right">{value}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => removePoint(key)} disabled={extra <= 0}
                        className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white font-bold text-sm flex items-center justify-center">−</button>
                      <span className="text-green-400 font-mono text-xs w-5 text-center">{extra > 0 ? `+${extra}` : ""}</span>
                      <button onClick={() => addPoint(key)} disabled={pointsLeft <= 0 || extra >= MAX_PER_STAT}
                        className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white font-bold text-sm flex items-center justify-center">+</button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Secondary stats */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Atributos secundarios</p>
              {profile.secondary.map((key) => {
                const statDef = STAT_BY_KEY[key]
                const value = getStatValue(key)
                const extra = extras[key] ?? 0
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-28 shrink-0">{statDef.label}</span>
                    <div className="flex-1"><StatBar value={value} size="sm" showValue={false} /></div>
                    <span className="text-gray-300 font-mono text-sm w-8 text-right">{value}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => removePoint(key)} disabled={extra <= 0}
                        className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white font-bold text-sm flex items-center justify-center">−</button>
                      <span className="text-green-400 font-mono text-xs w-5 text-center">{extra > 0 ? `+${extra}` : ""}</span>
                      <button onClick={() => addPoint(key)} disabled={pointsLeft <= 0 || extra >= MAX_PER_STAT}
                        className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white font-bold text-sm flex items-center justify-center">+</button>
                    </div>
                  </div>
                )
              })}
            </div>

            <NavButtons onBack={() => setStep(4)} onNext={() => setStep(6)} />
          </div>
        )}

        {/* ── Step 6: Division ─────────────────────────────────────────────── */}
        {step === 6 && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">¿Desde dónde quieres empezar tu carrera profesional?</p>
            {DIVISION_OPTIONS.map((opt) => {
              const divInfo = getDivisionInfo(opt.nivel)
              const selected = divisionInicial === opt.nivel
              return (
                <button key={opt.nivel} onClick={() => setDivisionInicial(opt.nivel)}
                  className={`w-full text-left p-5 rounded-2xl border transition-colors ${selected ? "border-green-500 bg-green-500/10" : "border-gray-700 bg-gray-900 hover:border-gray-500"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white">{divInfo.nombre}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      opt.nivel === 1 ? "bg-red-500/20 text-red-400" :
                      opt.nivel === 2 ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-green-500/20 text-green-400"}`}>{opt.tag}</span>
                  </div>
                  <p className="text-gray-400 text-sm">{opt.desc}</p>
                </button>
              )
            })}

            <div className="pt-2">
              <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider">Tu equipo preferente en {getDivisionInfo(divisionInicial).nombre}</p>
              <div className="grid grid-cols-2 gap-2">
                {getDivisionInfo(divisionInicial).clubes.map((club) => (
                  <button key={club} onClick={() => setClubElegido(club)}
                    className={`py-3 px-3 rounded-xl font-semibold text-sm text-left transition-colors ${clubElegido === club ? "bg-green-500 text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                  >
                    {club}
                  </button>
                ))}
              </div>
            </div>

            <NavButtons onBack={() => setStep(5)} onNext={() => setStep(7)} />
          </div>
        )}

        {/* ── Step 7: Summary + submit ─────────────────────────────────────── */}
        {step === 7 && (() => {
          const divInfo = getDivisionInfo(divisionInicial)
          const originDef = ORIGINS.find((o) => o.id === originId)!
          const personalityDef = PERSONALITIES.find((p) => p.id === personality)!
          const traitDef = SELECTABLE_TRAITS.find((t) => t.id === selectedTrait)!
          const styleDef = PLAY_STYLES[position].find((s) => s.id === playStyle)!
          const topStats = profile.primary.slice(0, 4).map((key) => ({ key, value: getStatValue(key) }))
          const age = 2026 - birthYear

          return (
            <div className="space-y-4">
              {/* Player card */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center shrink-0">
                    <span className="text-xl font-black text-green-400">{position}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-black">
                      {apodo.trim() ? `"${apodo.trim()}"` : `${nombre || "—"} ${apellido}`}
                      <span className="text-gray-500 text-base font-mono ml-2">#{dorsal}</span>
                    </p>
                    {apodo.trim() && <p className="text-gray-400 text-sm">{nombre} {apellido}</p>}
                    <p className="text-gray-400 text-sm">{POSITIONS.find((p) => p.id === position)?.label} · {NATIONALITY_FLAGS[nationality]} {nationality} · {age} años</p>
                    <p className="text-gray-500 text-xs mt-0.5">{altura} cm · {peso} kg · Pie {foot}</p>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Origen</p>
                    <p className="text-white text-sm font-semibold">{originDef.nombre}</p>
                    <p className="text-gray-500 text-xs">Potencial {originDef.potencial}/5</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Personalidad</p>
                    <p className="text-white text-sm font-semibold">{personalityDef.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Estilo</p>
                    <p className="text-white text-sm font-semibold">{styleDef?.label}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Rasgo</p>
                    <p className="text-yellow-400 text-sm font-semibold">{traitDef?.nombre}</p>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Atributos top</p>
                  <div className="grid grid-cols-2 gap-2">
                    {topStats.map(({ key, value }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs w-20 truncate">{STAT_BY_KEY[key].label}</span>
                        <div className="flex-1"><StatBar value={value} size="sm" showValue={false} /></div>
                        <span className="text-white font-mono text-xs w-6 text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Equipo preferente</p>
                  <p className="text-white font-semibold">{clubElegido} · {divInfo.nombre}</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
              )}

              <NavButtons
                onBack={() => setStep(6)}
                onNext={handleSubmit}
                nextLabel={submitting ? "Creando carrera..." : "Comenzar carrera →"}
                disabled={submitting || !nombre.trim()}
              />
            </div>
          )
        })()}
      </div>
    </main>
  )
}

"use client"

// Efectos de sonido sintetizados con Web Audio API -- sin archivos de audio
// externos (cero peso añadido, cero dudas de licencia). Deliberadamente
// suaves: solo ondas sine/triangle (nunca square/sawtooth, que suenan
// ásperas), duraciones cortas (<0.6s), volumen bajo por defecto y
// envolventes con ataque/caída suaves para que nada "pinche" al oído.
// Silenciable en un click desde Ajustes; el estado vive en localStorage
// para efecto inmediato y en player.state.preferencias para sincronizarse
// entre dispositivos (mismo patrón que use-reduced-motion.ts).

const STORAGE_KEY = "sonidoDesactivado"
const MASTER_VOLUME = 0.22 // techo bajo a propósito: "no debe ser abrasivo"

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new AC()
      masterGain = ctx.createGain()
      masterGain.gain.value = MASTER_VOLUME
      masterGain.connect(ctx.destination)
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {})
    return ctx
  } catch {
    return null // Web Audio no disponible (navegador antiguo, contexto restringido): no es crítico, simplemente no suena.
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "true"
  } catch {
    return true
  }
}

export function setSoundOverride(disabled: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, disabled ? "true" : "false")
  } catch {
    // localStorage no disponible: el toggle sigue funcionando en esta sesión vía React state.
  }
}

function tone(startTime: number, freq: number, duration: number, peakGain: number, type: OscillatorType = "sine") {
  const c = getCtx()
  if (!c || !masterGain) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t0 = c.currentTime + startTime
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.02) // ataque suave, nunca un golpe seco
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration) // caída suave, nunca un corte brusco
  osc.connect(gain)
  gain.connect(masterGain)
  osc.start(t0)
  osc.stop(t0 + duration + 0.03)
}

export type SoundName =
  | "perfecto" | "exito" | "parcial" | "fallo" | "critico_fallo"
  | "gol" | "tarjeta" | "dado" | "trofeo" | "nivel"

export function playSound(name: SoundName) {
  if (!isSoundEnabled()) return
  if (!getCtx()) return

  switch (name) {
    case "perfecto":
      tone(0, 523.25, 0.16, 0.16); tone(0.09, 659.25, 0.22, 0.16) // C5 → E5
      break
    case "exito":
      tone(0, 523.25, 0.18, 0.13)
      break
    case "parcial":
      tone(0, 440, 0.14, 0.1, "triangle")
      break
    case "fallo":
      tone(0, 349.23, 0.2, 0.11, "triangle") // nota baja y corta, no un "buzzer"
      break
    case "critico_fallo":
      tone(0, 233.08, 0.22, 0.13, "triangle"); tone(0.1, 196.0, 0.28, 0.12, "triangle")
      break
    case "gol":
      tone(0, 523.25, 0.13, 0.17); tone(0.1, 659.25, 0.13, 0.17); tone(0.2, 783.99, 0.28, 0.19) // C-E-G
      break
    case "tarjeta":
      tone(0, 293.66, 0.22, 0.1, "triangle")
      break
    case "dado":
      tone(0, 660, 0.05, 0.05, "triangle") // tic muy corto y flojo
      break
    case "trofeo":
      tone(0, 523.25, 0.14, 0.15); tone(0.11, 659.25, 0.14, 0.15)
      tone(0.22, 783.99, 0.14, 0.15); tone(0.33, 1046.5, 0.3, 0.17)
      break
    case "nivel":
      tone(0, 392.0, 0.1, 0.13); tone(0.08, 523.25, 0.1, 0.13); tone(0.16, 659.25, 0.22, 0.15)
      break
  }
}

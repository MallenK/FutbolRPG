import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { readJson } from "@/lib/http"

// gemini-1.5-flash fue retirado por Google en 2025: con ese modelo la API
// responde error y la narrativa IA caía siempre al texto de respaldo. El
// modelo se puede cambiar sin tocar código con GEMINI_MODEL.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// Cada campo de texto que se interpola en el prompt se recorta: evita que
// alguien use la cuota gratuita de Gemini con prompts arbitrarios largos.
const MAX_CAMPO = 300

function recortarCampos<T>(ctx: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(ctx as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v.slice(0, MAX_CAMPO)
    else if (Array.isArray(v)) out[k] = v.slice(0, 10).map((x) => (typeof x === "string" ? x.slice(0, 80) : x))
    else out[k] = v
  }
  return out as T
}

type NarrativeContext =
  | {
      type: "match"
      playerName: string; playerPosition: string; minuto: number
      situacion: string; accion: string; dado: number
      resultado: string; narrativoBase: string; gol: boolean
    }
  | {
      type: "event"
      playerName: string; playerPosition: string; club: string; rol: string
      eventTipo: string; eventDesc: string; opcionTexto: string; narrativoBase: string
    }
  | {
      type: "season"
      playerName: string; playerPosition: string; club: string; rol: string
      temporada: number; age: number; goles: number; asistencias: number
      valoracionMedia: number; premios: string[]; subioRol: boolean
      torneoSeleccion?: string | null; campeonSeleccion?: boolean
    }

function buildPrompt(ctx: NarrativeContext): string {
  if (ctx.type === "match") {
    return (
      `Eres comentarista de un videojuego de fútbol RPG. Narra en exactamente 2 frases dramáticas en español:\n` +
      `Min ${ctx.minuto}: ${ctx.situacion}\n` +
      `${ctx.playerName} (${ctx.playerPosition}) elige "${ctx.accion}". D20: ${ctx.dado}/20.\n` +
      `Resultado: ${ctx.resultado}${ctx.gol ? " (¡GOL!)" : ""}. Contexto: ${ctx.narrativoBase}\n` +
      `Solo devuelve las 2 frases, sin asteriscos, sin formato extra.`
    )
  }
  if (ctx.type === "season") {
    const premiosStr = ctx.premios.length > 0 ? ctx.premios.join(", ") : "ningún premio especial"
    const selStr = ctx.campeonSeleccion
      ? ` Además, ganó la ${ctx.torneoSeleccion} con la selección nacional.`
      : ctx.torneoSeleccion
        ? ` Participó en la ${ctx.torneoSeleccion} con la selección.`
        : ""
    return (
      `Eres el narrador de un videojuego de carrera futbolística. Escribe UN párrafo de 3 frases en español que resuma la temporada de este jugador con emoción y profundidad narrativa:\n` +
      `Jugador: ${ctx.playerName}, ${ctx.playerPosition}, ${ctx.age} años, ${ctx.rol} en ${ctx.club}.\n` +
      `Temporada ${ctx.temporada}: ${ctx.goles} goles, ${ctx.asistencias} asistencias, valoración media ${ctx.valoracionMedia.toFixed(1)}.\n` +
      `Premios: ${premiosStr}. ${ctx.subioRol ? "Subió de rol esta temporada." : ""}${selStr}\n` +
      `Solo devuelve el párrafo de 3 frases, sin asteriscos ni formato extra.`
    )
  }
  return (
    `Eres narrador de un videojuego de carrera futbolística. En 2 frases dramáticas en español narra:\n` +
    `Evento ${ctx.eventTipo}: ${ctx.eventDesc}\n` +
    `${ctx.playerName} (${ctx.rol} en ${ctx.club}) elige: "${ctx.opcionTexto}".\n` +
    `Consecuencia: ${ctx.narrativoBase}\n` +
    `Solo devuelve las 2 frases, sin asteriscos, sin formato extra.`
  )
}

export async function POST(req: NextRequest) {
  // Antes esta ruta no pedía sesión: cualquiera podía usarla como proxy
  // gratuito de Gemini con la clave del proyecto.
  const { error } = await requireSession()
  if (error) return error

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "No API key" }, { status: 503 })
  }

  const body = await readJson(req)
  if (!body || !["match", "event", "season"].includes(body.type as string)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  const ctx = recortarCampos(body as unknown as NarrativeContext)
  if (ctx.type === "season" && !Array.isArray(ctx.premios)) ctx.premios = []

  const prompt = buildPrompt(ctx)

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      // La clave va en cabecera, no en la URL, para que no acabe en logs.
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 120, temperature: 0.85 },
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Gemini error" }, { status: 502 })
    }

    const data = await res.json()
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

    return NextResponse.json({ narrative: text.trim() })
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 })
  }
}

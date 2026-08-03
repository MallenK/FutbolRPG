import { NextRequest, NextResponse } from "next/server"

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

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
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "No API key" }, { status: 503 })
  }

  let ctx: NarrativeContext
  try {
    ctx = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const prompt = buildPrompt(ctx)

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

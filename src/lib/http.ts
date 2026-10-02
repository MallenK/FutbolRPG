import type { NextRequest } from "next/server"

// Lee el body JSON de una petición sin reventar con un 500 si llega vacío o
// malformado: devuelve null y la ruta responde 400. Solo garantiza que es un
// objeto; cada ruta sigue validando sus campos.
export async function readJson<T extends Record<string, unknown>>(req: NextRequest | Request): Promise<Partial<T> | null> {
  try {
    const body: unknown = await req.json()
    if (typeof body !== "object" || body === null || Array.isArray(body)) return null
    return body as Partial<T>
  } catch {
    return null
  }
}

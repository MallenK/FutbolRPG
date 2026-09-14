"use client"

import { useState } from "react"
import Link from "next/link"
import { requestPasswordReset } from "@/lib/auth-client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const { error } = await requestPasswordReset({ email, redirectTo: "/reset-password" })
    setLoading(false)
    if (error) {
      setError("No se pudo procesar la solicitud. Inténtalo de nuevo.")
      return
    }
    // Siempre mostramos éxito aunque el email no exista, para no revelar
    // qué emails están registrados (mismo criterio que cualquier plataforma seria).
    setSent(true)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-2xl border border-gray-800">
        <h1 className="text-2xl font-black text-white mb-1">
          Futbol<span className="text-green-400">RPG</span>
        </h1>
        <p className="text-gray-400 text-sm mb-8">Recupera el acceso a tu cuenta</p>

        {sent ? (
          <div className="space-y-4">
            <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              Si existe una cuenta con ese email, te hemos enviado un enlace para restablecer tu contraseña.
            </p>
            <Link href="/login" className="block text-center text-gray-400 hover:text-white text-sm">
              ← Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold rounded-lg transition-colors"
            >
              {loading ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>

            <Link href="/login" className="block text-center text-gray-500 hover:text-white text-sm">
              ← Volver a iniciar sesión
            </Link>
          </form>
        )}
      </div>
    </main>
  )
}

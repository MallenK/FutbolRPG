"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "@/lib/auth-client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error } = await signIn.email({ email, password })

    if (error) {
      setError("Email o contraseña incorrectos")
      setLoading(false)
      return
    }

    router.push("/dashboard")
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-2xl border border-gray-800">
        <h1 className="text-2xl font-black text-white mb-1">
          Futbol<span className="text-green-400">RPG</span>
        </h1>
        <p className="text-gray-400 text-sm mb-8">Accede a tu carrera</p>

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
          <div>
            <label className="block text-sm text-gray-300 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold rounded-lg transition-colors"
          >
            {loading ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-green-400 hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signUp } from "@/lib/auth-client"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error } = await signUp.email({ name, email, password })

    if (error) {
      setError(error.message ?? "Error al crear la cuenta")
      setLoading(false)
      return
    }

    router.push("/create-player")
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-2xl border border-gray-800">
        <h1 className="text-2xl font-black text-white mb-1">
          Futbol<span className="text-green-400">RPG</span>
        </h1>
        <p className="text-gray-400 text-sm mb-8">Crea tu cuenta y empieza tu carrera</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Nombre de usuario</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
            />
          </div>
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
              minLength={8}
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
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-green-400 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  )
}

"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { resetPassword } from "@/lib/auth-client"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!token) {
      setError("Enlace de recuperación inválido o caducado.")
      return
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)
    const { error } = await resetPassword({ newPassword: password, token })
    setLoading(false)

    if (error) {
      setError(error.message ?? "No se pudo restablecer la contraseña. El enlace puede haber caducado.")
      return
    }
    setDone(true)
    setTimeout(() => router.push("/login"), 2000)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-2xl border border-gray-800">
        <h1 className="text-2xl font-black text-white mb-1">
          Futbol<span className="text-green-400">RPG</span>
        </h1>
        <p className="text-gray-400 text-sm mb-8">Elige tu nueva contraseña</p>

        {done ? (
          <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            Contraseña actualizada. Redirigiendo al login...
          </p>
        ) : !token ? (
          <div className="space-y-4">
            <p className="text-red-400 text-sm">Este enlace no es válido o ha caducado.</p>
            <Link href="/forgot-password" className="block text-center text-green-400 hover:underline text-sm">
              Solicitar uno nuevo
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Confirmar contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold rounded-lg transition-colors"
            >
              {loading ? "Guardando..." : "Guardar nueva contraseña"}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}

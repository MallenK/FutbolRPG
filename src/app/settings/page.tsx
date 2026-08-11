"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  useSession,
  changeEmail,
  changePassword,
  deleteUser,
  revokeOtherSessions,
} from "@/lib/auth-client"
import VideoLoader from "@/components/VideoLoader"
import { setReducedMotionOverride, getStoredReducedMotionOverride } from "@/lib/use-reduced-motion"
import type { SeasonHistoryEntry } from "@/lib/world"

type Preferencias = {
  reducirMovimiento?: boolean
  ocultarAvisoMercado?: boolean
  ocultoEnRanking?: boolean
  ocultoEnActividad?: boolean
}

type PlayerData = {
  id: string
  name: string
  position: string
  nationality: string
  attributes: unknown
  state: {
    apodo?: string
    dorsal?: number
    preferencias?: Preferencias
    carrera: {
      club: string
      estadisticasTemporada?: { partidosJugados: number; goles: number; asistencias: number }
      estadisticasCarrera?: { partidosJugados: number; goles: number; asistencias: number }
      historialTemporadas?: SeasonHistoryEntry[]
    }
  }
}

type Msg = { type: "ok" | "error"; text: string } | null

const inputClass =
  "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
const primaryBtn =
  "px-4 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold text-sm rounded-lg transition-colors whitespace-nowrap"
const secondaryBtn =
  "w-full py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white font-medium text-sm rounded-lg transition-colors"

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 py-3 border-b border-gray-800 last:border-0 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-4 h-4 accent-green-500"
      />
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
    </label>
  )
}

export default function SettingsPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [player, setPlayer] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)

  const [newEmail, setNewEmail] = useState("")
  const [emailMsg, setEmailMsg] = useState<Msg>(null)
  const [emailLoading, setEmailLoading] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMsg, setPasswordMsg] = useState<Msg>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [revokeMsg, setRevokeMsg] = useState<string | null>(null)
  const [revokeLoading, setRevokeLoading] = useState(false)

  const [deletePassword, setDeletePassword] = useState("")
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [apodo, setApodo] = useState("")
  const [dorsal, setDorsal] = useState(10)
  const [profileMsg, setProfileMsg] = useState<Msg>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const [reducirMovimiento, setReducirMovimientoState] = useState(false)
  const [ocultarAvisoMercado, setOcultarAvisoMercado] = useState(false)
  const [ocultoEnRanking, setOcultoEnRanking] = useState(false)
  const [ocultoEnActividad, setOcultoEnActividad] = useState(false)

  useEffect(() => {
    if (!isPending && !session) router.push("/login")
  }, [session, isPending, router])

  useEffect(() => {
    if (!session) return
    fetch("/api/player")
      .then((r) => r.json())
      .then(({ player: p }: { player: PlayerData | null }) => {
        setPlayer(p ?? null)
        if (p) {
          setApodo(p.state.apodo ?? "")
          setDorsal(p.state.dorsal ?? 10)
          const prefs = p.state.preferencias ?? {}
          const localOverride = getStoredReducedMotionOverride()
          setReducirMovimientoState(prefs.reducirMovimiento ?? localOverride)
          if (prefs.reducirMovimiento && !localOverride) setReducedMotionOverride(true)
          setOcultarAvisoMercado(prefs.ocultarAvisoMercado ?? false)
          setOcultoEnRanking(prefs.ocultoEnRanking ?? false)
          setOcultoEnActividad(prefs.ocultoEnActividad ?? false)
        }
        setLoading(false)
      })
  }, [session])

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailMsg(null)
    setEmailLoading(true)
    const { error } = await changeEmail({ newEmail })
    if (error) {
      setEmailMsg({ type: "error", text: "No se pudo cambiar el email. Inténtalo de nuevo." })
    } else {
      setEmailMsg({ type: "ok", text: "Email actualizado." })
      setNewEmail("")
    }
    setEmailLoading(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Las contraseñas nuevas no coinciden." })
      return
    }
    setPasswordLoading(true)
    const { error } = await changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
    if (error) {
      setPasswordMsg({ type: "error", text: "No se pudo cambiar la contraseña. Revisa la contraseña actual." })
    } else {
      setPasswordMsg({ type: "ok", text: "Contraseña actualizada. Se ha cerrado sesión en el resto de dispositivos." })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    }
    setPasswordLoading(false)
  }

  async function handleRevokeOtherSessions() {
    setRevokeMsg(null)
    setRevokeLoading(true)
    const { error } = await revokeOtherSessions()
    setRevokeMsg(error ? "No se pudo cerrar el resto de sesiones." : "Sesión cerrada en el resto de dispositivos.")
    setRevokeLoading(false)
  }

  async function handleDeleteAccount() {
    setDeleteError(null)
    setDeleteLoading(true)
    const { error } = await deleteUser({ password: deletePassword })
    if (error) {
      setDeleteError("Contraseña incorrecta. No se ha eliminado la cuenta.")
      setDeleteLoading(false)
      return
    }
    // Navegación dura, no router.push: al borrar la cuenta, useSession()
    // pasa a null en esta misma página y el guard de arriba ("sin sesión
    // -> /login") compite con esta redirección — una navegación dura gana
    // la carrera sin más lógica y de paso limpia cualquier estado de cliente
    // que quedara de la cuenta ya eliminada.
    window.location.href = "/"
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    setProfileLoading(true)
    const res = await fetch("/api/player/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apodo, dorsal }),
    })
    setProfileMsg(
      res.ok ? { type: "ok", text: "Datos guardados." } : { type: "error", text: "No se pudo guardar." }
    )
    setProfileLoading(false)
  }

  function savePreference(patch: Preferencias) {
    fetch("/api/player/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferencias: patch }),
    }).catch(() => {})
  }

  function handleToggleReducedMotion(value: boolean) {
    setReducirMovimientoState(value)
    setReducedMotionOverride(value)
    savePreference({ reducirMovimiento: value })
  }

  function handleExport() {
    if (!player) return
    const blob = new Blob([JSON.stringify(player, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `futbolrpg-${player.name.replace(/\s+/g, "_")}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isPending || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950">
        <VideoLoader label="Cargando ajustes..." />
      </main>
    )
  }
  if (!session) return null

  const statsTemporada = player?.state.carrera.estadisticasTemporada
  const statsCarrera = player?.state.carrera.estadisticasCarrera
  const totalPartidos = (statsCarrera?.partidosJugados ?? 0) + (statsTemporada?.partidosJugados ?? 0)
  const totalGoles = (statsCarrera?.goles ?? 0) + (statsTemporada?.goles ?? 0)
  const totalAsistencias = (statsCarrera?.asistencias ?? 0) + (statsTemporada?.asistencias ?? 0)
  const historialTemporadas = player?.state.carrera.historialTemporadas ?? []

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-black">
            Futbol<span className="text-green-400">RPG</span>
            <span className="text-gray-400 font-normal text-lg ml-2">· Ajustes</span>
          </h1>
        </div>
        <p className="text-gray-500 text-sm mb-8">Sesión iniciada como {session.user.email}</p>

        {/* 1. Cuenta y seguridad */}
        <section className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Cuenta y seguridad</h2>

          <form onSubmit={handleChangeEmail} className="mb-6">
            <label className="block text-sm text-gray-300 mb-1">Cambiar email</label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder={session.user.email}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={inputClass}
              />
              <button type="submit" disabled={!newEmail || emailLoading} className={primaryBtn}>
                {emailLoading ? "..." : "Cambiar"}
              </button>
            </div>
            {emailMsg && (
              <p className={`text-sm mt-2 ${emailMsg.type === "error" ? "text-red-400" : "text-green-400"}`}>
                {emailMsg.text}
              </p>
            )}
          </form>

          <form onSubmit={handleChangePassword} className="space-y-2 mb-6">
            <label className="block text-sm text-gray-300 mb-1">Cambiar contraseña</label>
            <input
              type="password"
              placeholder="Contraseña actual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Confirmar nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={inputClass}
            />
            <button type="submit" disabled={passwordLoading} className={primaryBtn}>
              {passwordLoading ? "Actualizando..." : "Actualizar contraseña"}
            </button>
            {passwordMsg && (
              <p className={`text-sm ${passwordMsg.type === "error" ? "text-red-400" : "text-green-400"}`}>
                {passwordMsg.text}
              </p>
            )}
          </form>

          <div className="mb-6">
            <button onClick={handleRevokeOtherSessions} disabled={revokeLoading} className={secondaryBtn}>
              {revokeLoading ? "Cerrando sesiones..." : "Cerrar sesión en todos los demás dispositivos"}
            </button>
            {revokeMsg && <p className="text-gray-400 text-sm mt-2">{revokeMsg}</p>}
          </div>

          <div className="pt-4 border-t border-red-900/40">
            <h3 className="text-red-400 font-bold text-sm mb-2">Zona de peligro</h3>
            <p className="text-gray-500 text-xs mb-3">
              Eliminar tu cuenta borra tu jugador, tu carrera y todo tu historial de forma permanente. No se puede deshacer.
            </p>
            <input
              type="password"
              placeholder="Confirma tu contraseña"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className={`${inputClass} mb-2`}
            />
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(e) => setDeleteConfirmed(e.target.checked)}
                className="w-4 h-4 accent-red-500"
              />
              Entiendo que esta acción no se puede deshacer
            </label>
            {deleteError && <p className="text-red-400 text-sm mb-2">{deleteError}</p>}
            <button
              onClick={handleDeleteAccount}
              disabled={!deletePassword || !deleteConfirmed || deleteLoading}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-sm rounded-lg transition-colors"
            >
              {deleteLoading ? "Eliminando..." : "Eliminar mi cuenta"}
            </button>
          </div>
        </section>

        {player && (
          <>
            {/* 2. Datos de carrera */}
            <section className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
              <h2 className="text-lg font-bold mb-4">Datos de carrera</h2>
              <form onSubmit={saveProfile} className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Apodo</label>
                  <input
                    value={apodo}
                    onChange={(e) => setApodo(e.target.value)}
                    maxLength={20}
                    placeholder="Sin apodo"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Dorsal</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={dorsal}
                    onChange={(e) => setDorsal(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <p className="text-gray-600 text-xs">
                  Nombre, posición, nacionalidad y club no se pueden cambiar una vez creada la carrera: afectan a
                  los perfiles de atributos, los rasgos y el histórico de la Selección Nacional.
                </p>
                <button type="submit" disabled={profileLoading} className={primaryBtn}>
                  {profileLoading ? "Guardando..." : "Guardar"}
                </button>
                {profileMsg && (
                  <p className={`text-sm ${profileMsg.type === "error" ? "text-red-400" : "text-green-400"}`}>
                    {profileMsg.text}
                  </p>
                )}
              </form>

              <div className="grid grid-cols-3 gap-3 text-center pt-4 border-t border-gray-800 mb-4">
                <div>
                  <div className="text-xl font-black text-green-400">{totalPartidos}</div>
                  <div className="text-gray-500 text-xs">Partidos</div>
                </div>
                <div>
                  <div className="text-xl font-black text-green-400">{totalGoles}</div>
                  <div className="text-gray-500 text-xs">Goles</div>
                </div>
                <div>
                  <div className="text-xl font-black text-green-400">{totalAsistencias}</div>
                  <div className="text-gray-500 text-xs">Asistencias</div>
                </div>
              </div>

              {historialTemporadas.length > 0 && (
                <div className="pt-4 border-t border-gray-800 mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Historial de temporadas</p>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {[...historialTemporadas].reverse().map((h) => (
                      <div key={h.temporada} className="bg-gray-800/60 rounded-lg px-3 py-2.5 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white">Temporada {h.temporada}</span>
                          {h.cambioDivision !== "ninguno" && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              h.cambioDivision === "ascenso" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                            }`}>
                              {h.cambioDivision === "ascenso" ? "▲ Ascenso" : "▼ Descenso"}
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500 text-xs mt-0.5">
                          {h.club} · {h.liga} · {h.posicionFinal}º de {h.totalEquipos}
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          {h.stats.goles}G · {h.stats.asistencias}A · {h.stats.valoracionMedia.toFixed(1)} val.
                          {h.premios.length > 0 && ` · ${h.premios.length} premio${h.premios.length > 1 ? "s" : ""}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleExport} className={secondaryBtn}>
                Exportar mis datos (JSON)
              </button>
            </section>

            {/* 3. Preferencias */}
            <section className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
              <h2 className="text-lg font-bold mb-2">Preferencias</h2>
              <ToggleRow
                label="Reducir animaciones"
                description="Muestra la imagen estática en vez del vídeo en las pantallas de carga, aunque el sistema no lo pida."
                checked={reducirMovimiento}
                onChange={handleToggleReducedMotion}
              />
              <ToggleRow
                label="Ocultar aviso de ofertas de mercado"
                description="No mostrar el aviso de nuevas ofertas de otros usuarios en el dashboard."
                checked={ocultarAvisoMercado}
                onChange={(value) => {
                  setOcultarAvisoMercado(value)
                  savePreference({ ocultarAvisoMercado: value })
                }}
              />
            </section>

            {/* 4. Privacidad y actividad */}
            <section className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
              <h2 className="text-lg font-bold mb-2">Privacidad y actividad</h2>
              <ToggleRow
                label="Ocultarme del ranking"
                description="Tu jugador no aparecerá en la clasificación pública (/ranking)."
                checked={ocultoEnRanking}
                onChange={(value) => {
                  setOcultoEnRanking(value)
                  savePreference({ ocultoEnRanking: value })
                }}
              />
              <ToggleRow
                label="Ocultar mi actividad reciente"
                description="Tus partidos y fichajes no aparecerán en el feed de actividad público."
                checked={ocultoEnActividad}
                onChange={(value) => {
                  setOcultoEnActividad(value)
                  savePreference({ ocultoEnActividad: value })
                }}
              />
            </section>
          </>
        )}
      </div>
    </main>
  )
}

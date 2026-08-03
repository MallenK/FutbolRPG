"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { type TransferOffer } from "@/lib/world"

type MarketState = {
  mercado: {
    enLista: boolean
    ofertasActivas: TransferOffer[]
    ultimaActualizacion: number
  }
  division: number
  club: string
  reputacion: number
}

const DIVISION_LABELS: Record<number, string> = {
  1: "3ª Fed.", 2: "1ª Fed.", 3: "2ª Div.", 4: "1ª Div.", 5: "Champions",
}

export default function TransferPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  const [market, setMarket] = useState<MarketState | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    if (!isPending && !session) router.push("/login")
  }, [session, isPending, router])

  useEffect(() => {
    if (!session) return
    fetch("/api/transfer")
      .then((r) => r.json())
      .then((data) => { setMarket(data); setLoading(false) })
  }, [session])

  const handleRequestTransfer = async () => {
    setActionLoading("request")
    const res = await fetch("/api/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "requestTransfer" }),
    })
    const data = await res.json()
    setMarket((prev) => prev ? { ...prev, mercado: data.mercado } : null)
    setActionLoading(null)
  }

  const handleRefreshOffers = async () => {
    setActionLoading("refresh")
    const res = await fetch("/api/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refreshOffers" }),
    })
    const data = await res.json()
    setMarket((prev) => prev ? { ...prev, mercado: data.mercado } : null)
    setActionLoading(null)
  }

  const handleOffer = async (offerId: string, action: "accept" | "reject") => {
    setActionLoading(offerId)
    const res = await fetch("/api/transfer/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, action }),
    })
    const data = await res.json()
    if (action === "accept" && data.success) {
      setResult({
        type: "success",
        message: `¡Traspaso completado! Ahora juegas en ${data.transfer.club} (${data.transfer.liga}) como ${data.transfer.rol}.`,
      })
    } else {
      setMarket((prev) => {
        if (!prev) return null
        return {
          ...prev,
          mercado: {
            ...prev.mercado,
            ofertasActivas: prev.mercado.ofertasActivas.filter((o) => o.id !== offerId),
          },
        }
      })
    }
    setActionLoading(null)
  }

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-gray-400">Cargando mercado...</div>
      </div>
    )
  }

  if (result) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-5xl">✈️</div>
          <h2 className="text-2xl font-black">¡Nuevo destino!</h2>
          <p className="text-gray-300">{result.message}</p>
          <button
            onClick={() => router.push("/season")}
            className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors"
          >
            Volver a la temporada
          </button>
        </div>
      </main>
    )
  }

  const { mercado, division, club, reputacion } = market ?? {
    mercado: { enLista: false, ofertasActivas: [], ultimaActualizacion: 0 },
    division: 3, club: "—", reputacion: 10,
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Mercado de Fichajes</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {club} · {DIVISION_LABELS[division] ?? "—"} · Rep. {reputacion}/100
            </p>
          </div>
          <button
            onClick={() => router.push("/season")}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            ← Temporada
          </button>
        </div>

        {/* Contrato / solicitud */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">
          <h2 className="font-bold text-white">Tu situación contractual</h2>
          <p className="text-gray-400 text-sm">
            {mercado.enLista
              ? "Has solicitado el traspaso. Los clubes están al tanto de tu situación."
              : "Actualmente estás comprometido con tu club. Puedes pedir el traspaso para que lleguen más ofertas."}
          </p>
          {!mercado.enLista && (
            <button
              onClick={handleRequestTransfer}
              disabled={actionLoading === "request"}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:bg-orange-800 text-black font-bold rounded-xl transition-colors text-sm"
            >
              {actionLoading === "request" ? "Tramitando..." : "Solicitar traspaso"}
            </button>
          )}
          {mercado.enLista && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full">
                EN LISTA DE TRANSFERIBLES
              </span>
            </div>
          )}
        </div>

        {/* Ofertas activas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white">Ofertas activas</h2>
            <button
              onClick={handleRefreshOffers}
              disabled={!!actionLoading}
              className="text-xs text-gray-500 hover:text-white transition-colors disabled:opacity-40"
            >
              {actionLoading === "refresh" ? "Actualizando..." : "Actualizar →"}
            </button>
          </div>

          {mercado.ofertasActivas.length === 0 && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center">
              <p className="text-gray-500 text-sm">
                {reputacion < 20
                  ? "Tu reputación aún no atrae ofertas. Sigue mejorando tu rendimiento."
                  : "No hay ofertas activas en este momento. Actualiza para comprobar."}
              </p>
              <p className="text-gray-600 text-xs mt-2">Reputación mínima para ofertas: 20/100</p>
            </div>
          )}

          {mercado.ofertasActivas.map((offer) => (
            <div key={offer.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-black text-lg">{offer.club}</p>
                  <p className="text-gray-500 text-sm">{offer.liga}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    offer.division > division
                      ? "bg-green-500/20 text-green-400"
                      : offer.division === division
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-gray-700 text-gray-400"
                  }`}>
                    {DIVISION_LABELS[offer.division] ?? "—"}
                    {offer.division > division ? " ↑" : offer.division === division ? "" : " ↓"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Rol ofrecido</p>
                  <p className="text-white font-bold">{offer.rolOfrecido}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOffer(offer.id, "accept")}
                  disabled={actionLoading === offer.id}
                  className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-black font-bold rounded-xl text-sm transition-colors"
                >
                  {actionLoading === offer.id ? "..." : "Aceptar"}
                </button>
                <button
                  onClick={() => handleOffer(offer.id, "reject")}
                  disabled={actionLoading === offer.id}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 font-bold rounded-xl text-sm transition-colors"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

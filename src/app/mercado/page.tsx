"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

const POSITION_LABELS: Record<string, string> = {
  GK: "POR", CB: "DFC", FB: "LAT",
  CM: "MC", AM: "MP", W: "EXT", ST: "DEL",
}

type MarketListing = {
  listingId: string
  playerName: string
  playerPosition: string
  playerAge: number
  userName: string
  club: string
  rol: string
  level: number
  reputation: number
  seasons: number
  goals: number
  hasOffered: boolean
}

type PendingOffer = {
  id: string
  fromPlayerName: string
  fromClub: string
  createdAt: string
}

type MyListing = {
  id: string
  active: boolean
}

type MarketData = {
  listings: MarketListing[]
  myListing: MyListing | null
  pendingOffers: PendingOffer[]
  myOfferCount: number
}

const ROL_COLOR: Record<string, string> = {
  Reserva: "text-gray-500",
  Rotación: "text-blue-400",
  Titular: "text-green-400",
  Estrella: "text-yellow-400",
}

export default function MercadoPage() {
  const router = useRouter()
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [offeringId, setOfferingId] = useState<string | null>(null)
  const [respondingId, setRespondingId] = useState<string | null>(null)

  const fetchMarket = useCallback(() => {
    setLoading(true)
    fetch("/api/market")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }, [])

  useEffect(() => { fetchMarket() }, [fetchMarket])

  const handleToggle = async () => {
    setToggling(true)
    await fetch("/api/market/toggle", { method: "POST" })
    fetchMarket()
    setToggling(false)
  }

  const handleOffer = async (listingId: string) => {
    setOfferingId(listingId)
    const res = await fetch("/api/market/offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    })
    if (res.ok) {
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          listings: prev.listings.map((l) =>
            l.listingId === listingId ? { ...l, hasOffered: true } : l
          ),
        }
      })
    }
    setOfferingId(null)
  }

  const handleRespond = async (offerId: string, action: "accept" | "reject") => {
    setRespondingId(offerId)
    const res = await fetch("/api/market/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, action }),
    })
    if (res.ok) fetchMarket()
    setRespondingId(null)
  }

  const isOnMarket = data?.myListing?.active ?? false

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-black">
            Futbol<span className="text-green-400">RPG</span>
            <span className="text-gray-400 font-normal text-lg ml-2">· Mercado</span>
          </h1>
        </div>

        {loading ? (
          <div className="py-24 text-center text-gray-500">Cargando mercado...</div>
        ) : (
          <div className="space-y-6">
            {/* My status panel */}
            <div className={`rounded-2xl border p-5 ${
              isOnMarket
                ? "bg-yellow-500/10 border-yellow-500/30"
                : "bg-gray-900 border-gray-800"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">
                    {isOnMarket ? "Estás en el mercado" : "No estás en el mercado"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isOnMarket
                      ? `${data?.myOfferCount ?? 0} oferta${data?.myOfferCount !== 1 ? "s" : ""} recibida${data?.myOfferCount !== 1 ? "s" : ""}`
                      : "Activa tu disponibilidad para recibir ofertas de otros clubes"}
                  </p>
                </div>
                <button
                  onClick={handleToggle}
                  disabled={toggling}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${
                    isOnMarket
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                      : "bg-yellow-500 hover:bg-yellow-400 text-black"
                  }`}
                >
                  {toggling ? "..." : isOnMarket ? "Retirarme" : "Ponerme en venta"}
                </button>
              </div>

              {/* Incoming offers */}
              {isOnMarket && data && data.pendingOffers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-yellow-500/20 space-y-3">
                  <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider">
                    Ofertas recibidas
                  </p>
                  {data.pendingOffers.map((offer) => (
                    <div key={offer.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {offer.fromPlayerName}
                        </p>
                        <p className="text-xs text-gray-400">{offer.fromClub}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleRespond(offer.id, "reject")}
                          disabled={respondingId === offer.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-50 transition-colors"
                        >
                          {respondingId === offer.id ? "..." : "Rechazar"}
                        </button>
                        <button
                          onClick={() => handleRespond(offer.id, "accept")}
                          disabled={respondingId === offer.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500 hover:bg-green-400 text-black disabled:opacity-50 transition-colors"
                        >
                          {respondingId === offer.id ? "..." : "Aceptar"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available players */}
            <div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Jugadores disponibles ({data?.listings.length ?? 0})
              </h2>

              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                {!data || data.listings.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-500 text-sm">No hay jugadores en el mercado.</p>
                    <p className="text-gray-600 text-xs mt-1">Cuando otros usuarios se pongan en venta, aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {data.listings.map((l) => (
                      <div key={l.listingId} className="flex items-center gap-4 px-5 py-4">
                        {/* Position */}
                        <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-gray-300">
                            {POSITION_LABELS[l.playerPosition] ?? l.playerPosition}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white truncate">{l.playerName}</p>
                            <span className={`text-xs font-semibold ${ROL_COLOR[l.rol] ?? "text-gray-400"}`}>
                              {l.rol}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {l.userName} · {l.club} · {l.playerAge} años
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="hidden sm:flex gap-3 shrink-0 text-right">
                          <div className="text-center">
                            <p className="text-white font-bold font-mono text-sm">Nv.{l.level}</p>
                            <p className="text-gray-600 text-xs">niv</p>
                          </div>
                          <div className="text-center">
                            <p className="text-green-400 font-bold font-mono text-sm">{l.reputation}</p>
                            <p className="text-gray-600 text-xs">rep</p>
                          </div>
                          <div className="text-center">
                            <p className="text-blue-400 font-bold font-mono text-sm">{l.goals}</p>
                            <p className="text-gray-600 text-xs">goles</p>
                          </div>
                        </div>

                        {/* Offer button */}
                        <button
                          onClick={() => handleOffer(l.listingId)}
                          disabled={l.hasOffered || offeringId === l.listingId}
                          className={`shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                            l.hasOffered
                              ? "bg-gray-800 text-gray-500 cursor-default"
                              : "bg-green-500 hover:bg-green-400 text-black disabled:opacity-50"
                          }`}
                        >
                          {offeringId === l.listingId ? "..." : l.hasOffered ? "Ofertado" : "Ofertar"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

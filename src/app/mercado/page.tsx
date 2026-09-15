"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { getDivisionInfo, type TransferOffer } from "@/lib/world"

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

type ClubMarketState = {
  mercado: {
    enLista: boolean
    ofertasActivas: TransferOffer[]
    ultimaActualizacion: number
  }
  division: number
  club: string
  reputacion: number
}

const ROL_COLOR: Record<string, string> = {
  Reserva: "text-gray-500",
  Rotación: "text-blue-400",
  Titular: "text-green-400",
  Estrella: "text-yellow-400",
}

export default function MercadoPage() {
  const { data: session } = useSession()
  const router = useRouter()

  // ─── Mercado entre jugadores reales (transferListing/transferOffer) ───────
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [offeringId, setOfferingId] = useState<string | null>(null)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [confirmAcceptId, setConfirmAcceptId] = useState<string | null>(null)

  // ─── Ofertas de tu club (carrera.mercado, NPC — antes vivían en /transfer,
  // fusionadas aquí: son la otra mitad de "tengo ofertas de fichaje", y
  // separarlas en dos pantallas con nombre casi idéntico solo generaba
  // confusión — ver informe-fallos.md, hallazgo C3 / Ronda 8). ───────────────
  const [clubMarket, setClubMarket] = useState<ClubMarketState | null>(null)
  const [clubLoading, setClubLoading] = useState(true)
  const [clubActionLoading, setClubActionLoading] = useState<string | null>(null)
  const [confirmClubOfferId, setConfirmClubOfferId] = useState<string | null>(null)
  const [transferResult, setTransferResult] = useState<{ club: string; liga: string; rol: string } | null>(null)

  const fetchMarket = useCallback(() => {
    setLoading(true)
    fetch("/api/market")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }, [])

  const fetchClubMarket = useCallback(() => {
    setClubLoading(true)
    fetch("/api/transfer")
      .then((r) => r.json())
      .then((d) => { setClubMarket(d); setClubLoading(false) })
      .catch(() => setClubLoading(false))
  }, [])

  useEffect(() => { fetchMarket() }, [fetchMarket])
  useEffect(() => { if (session) fetchClubMarket() }, [session, fetchClubMarket])

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

  // Aceptar una oferta recibida cambia el club/liga/división para siempre —
  // antes se ejecutaba con un solo clic, sin confirmación (ver auditoría UX,
  // heurística 5). Ahora exige un segundo toque explícito.
  const handleRespond = async (offerId: string, action: "accept" | "reject") => {
    if (action === "accept" && confirmAcceptId !== offerId) {
      setConfirmAcceptId(offerId)
      return
    }
    setRespondingId(offerId)
    setConfirmAcceptId(null)
    const res = await fetch("/api/market/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, action }),
    })
    if (res.ok) fetchMarket()
    setRespondingId(null)
  }

  const handleRequestClubOffers = async () => {
    setClubActionLoading("request")
    const res = await fetch("/api/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "requestTransfer" }),
    })
    const d = await res.json()
    setClubMarket((prev) => prev ? { ...prev, mercado: d.mercado } : prev)
    setClubActionLoading(null)
  }

  const handleRefreshClubOffers = async () => {
    setClubActionLoading("refresh")
    const res = await fetch("/api/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refreshOffers" }),
    })
    const d = await res.json()
    setClubMarket((prev) => prev ? { ...prev, mercado: d.mercado } : prev)
    setClubActionLoading(null)
  }

  // Igual que en el mercado real: aceptar una oferta de club cambia carrera
  // entera (club, liga, división, contrato) de forma irreversible — mismo
  // segundo toque de confirmación antes de ejecutar.
  const handleClubOffer = async (offerId: string, action: "accept" | "reject") => {
    if (action === "accept" && confirmClubOfferId !== offerId) {
      setConfirmClubOfferId(offerId)
      return
    }
    setClubActionLoading(offerId)
    setConfirmClubOfferId(null)
    const res = await fetch("/api/transfer/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, action }),
    })
    const d = await res.json()
    if (action === "accept" && d.success) {
      setTransferResult({ club: d.transfer.club, liga: d.transfer.liga, rol: d.transfer.rol })
    } else {
      setClubMarket((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          mercado: { ...prev.mercado, ofertasActivas: prev.mercado.ofertasActivas.filter((o) => o.id !== offerId) },
        }
      })
    }
    setClubActionLoading(null)
  }

  const isOnMarket = data?.myListing?.active ?? false

  if (transferResult) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-5xl">✈️</div>
          <h2 className="text-2xl font-black">¡Nuevo destino!</h2>
          <p className="text-gray-300">
            ¡Traspaso completado! Ahora juegas en {transferResult.club} ({transferResult.liga}) como {transferResult.rol}.
          </p>
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

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            ← Perfil
          </button>
          <h1 className="text-2xl font-black">
            Futbol<span className="text-green-400">RPG</span>
            <span className="text-gray-400 font-normal text-lg ml-2">· Mercado</span>
          </h1>
        </div>

        <div className="space-y-10">
          {/* ─── Ofertas de tu club (NPC) ─── */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Ofertas de tu club</h2>
              <p className="text-gray-500 text-sm">Propuestas de otros clubes de la pirámide, generadas para tu carrera.</p>
            </div>

            {clubLoading ? (
              <div className="py-8 text-center text-gray-500 text-sm">Cargando...</div>
            ) : !clubMarket?.mercado.enLista ? (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center space-y-3">
                <p className="text-gray-400 text-sm">
                  Todavía no has solicitado traspaso. Pídelo desde la pantalla de Temporada para empezar a recibir ofertas de clubes.
                </p>
                <button
                  onClick={() => router.push("/season")}
                  className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Ir a Temporada →
                </button>
              </div>
            ) : clubMarket.mercado.ofertasActivas.length === 0 ? (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center space-y-3">
                <p className="text-gray-400 text-sm">
                  {clubMarket.reputacion < 20
                    ? "Tu reputación aún no atrae ofertas de clubes. Sigue mejorando tu rendimiento."
                    : "Estás en lista de transferibles, pero no hay ofertas de clubes en este momento."}
                </p>
                <button
                  onClick={handleRequestClubOffers}
                  disabled={!!clubActionLoading}
                  className="px-5 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  {clubActionLoading === "request" ? "Actualizando..." : "Buscar ofertas de nuevo →"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {clubMarket.mercado.ofertasActivas.map((offer) => (
                  <div key={offer.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-black text-lg">{offer.club}</p>
                        <p className="text-gray-500 text-sm">{offer.liga}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        offer.division > clubMarket.division
                          ? "bg-green-500/20 text-green-400"
                          : offer.division === clubMarket.division
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-gray-700 text-gray-400"
                      }`}>
                        {getDivisionInfo(offer.division).nombreCorto}
                        {offer.division > clubMarket.division ? " ↑" : offer.division === clubMarket.division ? "" : " ↓"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">Rol ofrecido: <span className="text-white font-bold">{offer.rolOfrecido}</span></p>
                    {confirmClubOfferId === offer.id ? (
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 space-y-2">
                        <p className="text-orange-300 text-xs">
                          ¿Fichar por {offer.club}? Tu carrera entera se traslada allí — no se puede deshacer.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleClubOffer(offer.id, "accept")}
                            disabled={clubActionLoading === offer.id}
                            className="flex-1 py-2 bg-orange-500 hover:bg-orange-400 text-black font-bold rounded-lg text-sm transition-colors"
                          >
                            {clubActionLoading === offer.id ? "..." : "Sí, fichar"}
                          </button>
                          <button
                            onClick={() => setConfirmClubOfferId(null)}
                            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg text-sm transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleClubOffer(offer.id, "accept")}
                          disabled={clubActionLoading === offer.id}
                          className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold rounded-xl text-sm transition-colors"
                        >
                          Aceptar
                        </button>
                        <button
                          onClick={() => handleClubOffer(offer.id, "reject")}
                          disabled={clubActionLoading === offer.id}
                          className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 font-bold rounded-xl text-sm transition-colors"
                        >
                          {clubActionLoading === offer.id ? "..." : "Rechazar"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleRefreshClubOffers}
                  disabled={!!clubActionLoading}
                  className="text-xs text-gray-500 hover:text-white transition-colors disabled:opacity-40"
                >
                  {clubActionLoading === "refresh" ? "Actualizando..." : "Actualizar ofertas →"}
                </button>
              </div>
            )}
          </div>

          {/* ─── Mercado entre jugadores reales ─── */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Mercado entre jugadores</h2>
              <p className="text-gray-500 text-sm">Fichajes reales con otros usuarios de FutbolRPG.</p>
            </div>

            {loading ? (
              <div className="py-16 text-center text-gray-500">Cargando mercado...</div>
            ) : (
              <div className="space-y-6">
                {/* My status panel */}
                <div className={`rounded-2xl border p-5 ${
                  isOnMarket ? "bg-yellow-500/10 border-yellow-500/30" : "bg-gray-900 border-gray-800"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">
                        {isOnMarket ? "Estás en el mercado" : "No estás en el mercado"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isOnMarket
                          ? `${data?.myOfferCount ?? 0} oferta${data?.myOfferCount !== 1 ? "s" : ""} recibida${data?.myOfferCount !== 1 ? "s" : ""}`
                          : "Activa tu disponibilidad para recibir ofertas de otros jugadores"}
                      </p>
                    </div>
                    <button
                      onClick={handleToggle}
                      disabled={toggling}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${
                        isOnMarket ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-yellow-500 hover:bg-yellow-400 text-black"
                      }`}
                    >
                      {toggling ? "..." : isOnMarket ? "Retirarme" : "Ponerme en venta"}
                    </button>
                  </div>

                  {/* Incoming offers */}
                  {isOnMarket && data && data.pendingOffers.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-yellow-500/20 space-y-3">
                      <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider">Ofertas recibidas</p>
                      {data.pendingOffers.map((offer) => (
                        <div key={offer.id} className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{offer.fromPlayerName}</p>
                              <p className="text-xs text-gray-400">{offer.fromClub}</p>
                            </div>
                            {confirmAcceptId !== offer.id && (
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
                                  Aceptar
                                </button>
                              </div>
                            )}
                          </div>
                          {confirmAcceptId === offer.id && (
                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 space-y-2">
                              <p className="text-orange-300 text-xs">
                                ¿Fichar por {offer.fromClub}? Tu carrera entera se traslada allí — no se puede deshacer.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleRespond(offer.id, "accept")}
                                  disabled={respondingId === offer.id}
                                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-400 text-black font-bold rounded-lg text-xs transition-colors"
                                >
                                  {respondingId === offer.id ? "..." : "Sí, fichar"}
                                </button>
                                <button
                                  onClick={() => setConfirmAcceptId(null)}
                                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg text-xs transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available players */}
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Jugadores disponibles ({data?.listings.length ?? 0})
                  </h3>

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
                            <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-gray-300">
                                {POSITION_LABELS[l.playerPosition] ?? l.playerPosition}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-white truncate">{l.playerName}</p>
                                <span className={`text-xs font-semibold ${ROL_COLOR[l.rol] ?? "text-gray-400"}`}>{l.rol}</span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {l.userName} · {l.club} · {l.playerAge} años
                              </p>
                            </div>
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
        </div>
      </div>
    </main>
  )
}

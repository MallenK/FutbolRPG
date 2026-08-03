"use client"

import { usePathname, useRouter } from "next/navigation"

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Perfil",
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? "text-green-400" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="8" r="4" /><path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    href: "/season",
    label: "Temporada",
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? "text-green-400" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="4" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    href: "/transfer",
    label: "Mercado",
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? "text-green-400" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0-4-4m4 4-4 4M4 17h12m0 0-4-4m4 4-4 4" />
      </svg>
    ),
  },
  {
    href: "/leaderboard",
    label: "Ranking",
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? "text-green-400" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 17h2v-6H3v6zm5 0h2V7H8v10zm5 0h2v-4h-2v4zm5 0h2v-9h-2v9z" />
      </svg>
    ),
  },
  {
    href: "/feed",
    label: "Actividad",
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? "text-green-400" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h6" />
      </svg>
    ),
  },
]

const HIDDEN_PATHS = ["/", "/login", "/register", "/create-player", "/match"]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "?"))) return null
  if (pathname.startsWith("/match")) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur border-t border-gray-800 safe-area-pb">
      <div className="max-w-lg mx-auto flex items-center">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                active ? "text-green-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {icon(active)}
              <span className={`text-xs font-medium ${active ? "text-green-400" : "text-gray-600"}`}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import BottomNav from "@/components/BottomNav"

export const metadata: Metadata = {
  title: "FutbolRPG",
  description: "Simulador de carrera futbolística con mecánicas RPG",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="pb-safe">
        {children}
        <BottomNav />
        <Analytics />
      </body>
    </html>
  )
}

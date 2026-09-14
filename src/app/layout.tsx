import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import BottomNav from "@/components/BottomNav"
import RegisterServiceWorker from "@/components/RegisterServiceWorker"

export const metadata: Metadata = {
  title: "FutbolRPG",
  description: "Simulador de carrera futbolística con mecánicas RPG",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/pwa-icon-192", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/pwa-icon-192", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FutbolRPG",
  },
}

export const viewport: Viewport = {
  themeColor: "#030712",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="pb-safe">
        {children}
        <BottomNav />
        <Analytics />
        <RegisterServiceWorker />
      </body>
    </html>
  )
}

import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-black tracking-tight mb-3">
          Futbol<span className="text-green-400">RPG</span>
        </h1>
        <p className="text-gray-400 text-lg">
          Simula tu carrera. Toma decisiones. Escribe la leyenda.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-8 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition-colors"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/register"
          className="px-8 py-3 bg-gray-800 hover:bg-gray-700 font-bold rounded-lg transition-colors border border-gray-700"
        >
          Crear cuenta
        </Link>
      </div>
    </main>
  )
}

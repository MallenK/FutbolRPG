interface VideoLoaderProps {
  label: string
  variant?: "generic" | "dice" | "trophy" | "press"
  size?: number
}

// Bucle corto renderizado con Remotion (ver remotion/), sustituye el texto plano
// "Cargando..." que había antes. Con prefers-reduced-motion cae al frame estático
// (mismo motivo, sin animación) en vez del vídeo.
export default function VideoLoader({ label, variant = "generic", size = 140 }: VideoLoaderProps) {
  const base = `/videos/loaders/${variant}`

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <video
        className="motion-reduce:hidden"
        style={{ width: size, height: size }}
        autoPlay
        muted
        loop
        playsInline
        poster={`${base}-poster.png`}
      >
        <source src={`${base}.webm`} type="video/webm" />
        <source src={`${base}.mp4`} type="video/mp4" />
      </video>
      {/* eslint-disable-next-line @next/next/no-img-element -- static local asset, no responsive/optimization needs */}
      <img
        className="hidden motion-reduce:block"
        style={{ width: size, height: size }}
        src={`${base}-poster.png`}
        alt=""
      />
      <div className="text-gray-400">{label}</div>
    </div>
  )
}

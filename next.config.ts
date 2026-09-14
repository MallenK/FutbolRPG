import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Hay un package-lock.json huérfano un nivel por encima (carpeta de trabajo
  // suelta, sin git propio — ver .claude/context.md) que hace que Next.js
  // infiera mal la raíz del workspace y avise en cada arranque. El proyecto
  // real siempre es esta carpeta.
  outputFileTracingRoot: path.join(__dirname),
}

export default nextConfig

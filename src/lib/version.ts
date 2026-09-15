import packageJson from "../../package.json"

// Única fuente de verdad para la versión de la app — package.json. Ver
// CHANGELOG.md para el historial de versiones y ROADMAP.md para el estado
// de cada fase.
export const APP_VERSION = packageJson.version

// Límites del plan gratuito — ver ROADMAP.md "Stripe / Premium".
// Un solo sitio para las reglas de negocio de qué es gratis y qué no.

export const FREE_SEASON_LIMIT = 5

export function seasonLimitReached(temporadaActual: number, isPremium: boolean): boolean {
  if (isPremium) return false
  return temporadaActual > FREE_SEASON_LIMIT
}

export function seleccionLocked(isPremium: boolean): boolean {
  return !isPremium
}

export function mercadoLocked(isPremium: boolean): boolean {
  return !isPremium
}

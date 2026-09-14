export type RachaState = {
  diasConsecutivos: number
  ultimoDia: string // "YYYY-MM-DD" (UTC)
}

export const todayUTC = (): string => new Date().toISOString().slice(0, 10)

const diaAnterior = (dia: string): string => {
  const d = new Date(`${dia}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Actualiza la racha diaria de un jugador. Solo cambia algo la primera vez
// que se llama en un día natural (UTC) — llamadas repetidas el mismo día
// devuelven isNewDay: false para que el llamador no tenga que escribir en
// la base de datos en cada carga del dashboard.
export const updateRacha = (racha: RachaState | undefined, today: string = todayUTC()): { racha: RachaState; isNewDay: boolean } => {
  if (!racha) return { racha: { diasConsecutivos: 1, ultimoDia: today }, isNewDay: true }
  if (racha.ultimoDia === today) return { racha, isNewDay: false }

  const diasConsecutivos = racha.ultimoDia === diaAnterior(today) ? racha.diasConsecutivos + 1 : 1
  return { racha: { diasConsecutivos, ultimoDia: today }, isNewDay: true }
}

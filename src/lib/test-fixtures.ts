import { buildAttributes } from "@/lib/player-config"
import { mapDbPlayer } from "@/lib/match-server"
import type { Player } from "@/engine/types"

// Jugador de prueba para los tests del motor, construido con las mismas
// funciones que usa la app real (buildAttributes al crear el personaje y
// mapDbPlayer al jugar un partido). Sustituye a createDefaultPlayer del motor
// legado (src/engine/player.ts), que tenía datos fijos que la app nunca usaba.
// Devuelve un objeto nuevo en cada llamada: los tests lo modifican.
export function jugadorDePrueba(): Player {
  return mapDbPlayer({
    id: "jugador_prueba",
    name: "Jugador de Prueba",
    position: "ST",
    nationality: "España",
    age: 18,
    attributes: buildAttributes("ST", "academia", {}, "derecho"),
    state: {
      fatiga: 0,
      forma: 80,
      moral: 85,
      riesgoLesion: 5,
      traits: ["alto_potencial"],
      potencial: 5,
      posicionesSecundarias: ["W"],
      confianza: { entrenador: 60, vestuario: 50, reputacion: 40 },
      carrera: {
        club: "Club de Prueba",
        rol: "Rotación",
        temporada: 1,
        etiquetas: ["Joven Promesa"],
        estadisticasTemporada: { partidosJugados: 0, goles: 0, asistencias: 0, valoracionMedia: 6.0 },
      },
    },
  })
}

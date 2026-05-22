using System.Collections.Generic;

namespace FutbolRPG.Engine
{
    public static class PlayerService
    {
        public static Player CreateDefaultPlayer()
        {
            return new Player
            {
                id = "player_001",
                personal = new PersonalData
                {
                    nombre          = "Alex 'El Rayo' Martínez",
                    edad            = 18,
                    nacionalidad    = "España",
                    genero          = "M",
                    piernaDominante = "Derecha",
                    altura          = 178,
                    peso            = 74,
                    dorsal          = 29,
                    fechaNacimiento = "12/04/2006",
                    cantera         = "Rayo Vallecano",
                    representante   = "Golazo Sports Agency"
                },
                posicionPrincipal     = Posicion.DELANTERO,
                posicionesSecundarias = new List<Posicion> { Posicion.EXTREMO },

                tecnicos = new StatsTecnicos
                {
                    control = 70, pase = 65, tiro = 75, regate = 72, cabeceo = 60
                },
                fisicos = new StatsFisicos
                {
                    resistencia = 70, velocidad = 82, aceleracion = 80, fuerza = 65
                },
                tacticos = new StatsTacticos
                {
                    posicionamiento = 68, vision = 60, decisiones = 65
                },
                mentales = new StatsMentales
                {
                    disciplina = 70, confianza = 75, presion = 60
                },

                estado = new EstadoJugador
                {
                    fatiga = 0, forma = 80, moral = 85, riesgoLesion = 5
                },
                confianza = new Confianza
                {
                    entrenador = 60, vestuario = 50, reputacion = 40
                },

                carrera = new Carrera
                {
                    club      = "Rayo Vallecano",
                    rol       = "Rotación",
                    temporada = 1,
                    etiquetas = new List<string> { "Joven Promesa" },
                    estadisticasTemporada = new StatsTemporada
                    {
                        partidosJugados = 0, goles = 0,
                        asistencias = 0, valoracionMedia = 6.0f
                    },
                    historial = new SeasonHistory(),
                    mundo = new WorldState
                    {
                        equiposPrimera      = new List<string>(DatabaseData.TeamsPrimeraBase),
                        equiposSegunda      = new List<string>(DatabaseData.TeamsSegundaBase),
                        campeonesHistoricos = new List<string>()
                    }
                }
            };
        }

        public class StatEffects
        {
            public float fatiga;
            public float moral;
            public float forma;
            public float entrenador;
            public float vestuario;
            public float reputacion;
        }

        public static Player UpdatePlayerStats(Player player, StatEffects effects)
        {
            var p = player.DeepClone();

            p.estado.fatiga  = Clamp(p.estado.fatiga  + effects.fatiga,  0f, 100f);
            p.estado.moral   = Clamp(p.estado.moral   + effects.moral,   0f, 100f);
            p.estado.forma   = Clamp(p.estado.forma   + effects.forma,   0f, 100f);

            p.confianza.entrenador = Clamp(p.confianza.entrenador + effects.entrenador, 0f, 100f);
            p.confianza.vestuario  = Clamp(p.confianza.vestuario  + effects.vestuario,  0f, 100f);
            p.confianza.reputacion = Clamp(p.confianza.reputacion + effects.reputacion, 0f, 999f);

            return p;
        }

        private static float Clamp(float value, float min, float max)
        {
            if (value < min) return min;
            if (value > max) return max;
            return value;
        }
    }
}

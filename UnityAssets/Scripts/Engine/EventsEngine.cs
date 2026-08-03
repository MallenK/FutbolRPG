using System;
using System.Collections.Generic;

namespace FutbolRPG.Engine
{
    public class EventOption
    {
        public string texto;
        public string statCheck;
        public Func<Player, PlayerService.StatEffects> efectos;
        public string logResultado;
    }

    public class CareerEvent
    {
        public string              id;
        public string              titulo;
        public string              descripcion;
        public Func<Player, bool>  triggerCondition;
        public List<EventOption>   opciones = new List<EventOption>();
    }

    public class EventResult
    {
        public Player          player;
        public List<LogEntry>  logs = new List<LogEntry>();
    }

    public static class EventsEngine
    {
        private static readonly Random _rng = new Random();

        private static readonly List<CareerEvent> CareerEvents = new List<CareerEvent>
        {
            new CareerEvent
            {
                id          = "conflicto_entrenador",
                titulo      = "Conflicto Táctico",
                descripcion = "El entrenador te recrimina públicamente por tu falta de sacrificio defensivo.",
                triggerCondition = p => p.confianza.entrenador < 40 && _rng.NextDouble() < 0.3,
                opciones = new List<EventOption>
                {
                    new EventOption
                    {
                        texto       = "Pedir disculpas y trabajar más",
                        statCheck   = "disciplina",
                        efectos     = p => new PlayerService.StatEffects { entrenador = 10, moral = -5, fatiga = 10 },
                        logResultado = "El míster valora tu humildad. Recuperas confianza."
                    },
                    new EventOption
                    {
                        texto       = "Discutir y defender tu estilo",
                        statCheck   = "confianza",
                        efectos     = p => new PlayerService.StatEffects { entrenador = -15, reputacion = 5, moral = 5 },
                        logResultado = "La discusión sube de tono. El vestuario te apoya, pero el míster te sentencia."
                    }
                }
            },
            new CareerEvent
            {
                id          = "oferta_renovacion",
                titulo      = "Oferta de Renovación",
                descripcion = "El club te ofrece extender el contrato, pero con un sueldo bajo.",
                triggerCondition = p => p.carrera.estadisticasTemporada.valoracionMedia > 7.5f && _rng.NextDouble() < 0.1,
                opciones = new List<EventOption>
                {
                    new EventOption
                    {
                        texto       = "Aceptar por amor al club",
                        efectos     = p => new PlayerService.StatEffects { entrenador = 5, vestuario = 10, reputacion = 2 },
                        logResultado = "Firmas la renovación. La afición te adora."
                    },
                    new EventOption
                    {
                        texto       = "Rechazar y esperar algo mejor",
                        statCheck   = "confianza",
                        efectos     = p => new PlayerService.StatEffects { entrenador = -5, moral = 5 },
                        logResultado = "Rechazas la oferta. El club se molesta, pero tú confías en tu valor."
                    }
                }
            },
            new CareerEvent
            {
                id          = "presion_mediatica",
                titulo      = "Presión Mediática",
                descripcion = "Rumores sobre tu vida nocturna aparecen en prensa rosa.",
                triggerCondition = p => p.confianza.reputacion > 60 && _rng.NextDouble() < 0.2,
                opciones = new List<EventOption>
                {
                    new EventOption
                    {
                        texto       = "Emitir comunicado y centrarte",
                        statCheck   = "disciplina",
                        efectos     = p => new PlayerService.StatEffects { reputacion = 5, moral = -5 },
                        logResultado = "Desmientes los rumores con elegancia."
                    },
                    new EventOption
                    {
                        texto       = "Ignorarlo (salir de fiesta igual)",
                        efectos     = p => new PlayerService.StatEffects { forma = -10, fatiga = 10, moral = 10 },
                        logResultado = "Decides ignorar a la prensa. Tu forma física se resiente."
                    }
                }
            },
            new CareerEvent
            {
                id          = "ultima_oportunidad",
                titulo      = "Ultimátum",
                descripcion = "Tu rendimiento es inaceptable. Si no mejoras, te irás a la grada.",
                triggerCondition = p => p.carrera.estadisticasTemporada.valoracionMedia < 5.5f
                                    && p.carrera.estadisticasTemporada.partidosJugados > 3,
                opciones = new List<EventOption>
                {
                    new EventOption
                    {
                        texto       = "Entrenar doble turno",
                        statCheck   = "presion",
                        efectos     = p => new PlayerService.StatEffects { fatiga = 20, forma = 15, entrenador = 5 },
                        logResultado = "Te machacas físicamente. Estás agotado pero en mejor forma."
                    },
                    new EventOption
                    {
                        texto       = "Quejarse del sistema",
                        efectos     = p => new PlayerService.StatEffects { entrenador = -20, vestuario = -10 },
                        logResultado = "Te excusas en la táctica. Nadie te cree."
                    }
                }
            }
        };

        public static EventResult TriggerWeeklyEvent(Player player)
        {
            var result = new EventResult { player = player.DeepClone() };
            var posibles = CareerEvents.FindAll(e => e.triggerCondition(player));

            if (posibles.Count == 0) return result;

            var evento = posibles[_rng.Next(posibles.Count)];

            result.logs.Add(new LogEntry { tipo = LogType.INFO, mensaje = $"\n📢 [EVENTO] {evento.titulo.ToUpper()}" });

            EventOption opcionElegida;
            float roll = (float)_rng.NextDouble() * 100f;
            var bestOption = evento.opciones.Find(o =>
                !string.IsNullOrEmpty(o.statCheck) && player.mentales.GetStat(o.statCheck) > 60);

            opcionElegida = (bestOption != null && roll < 80f)
                ? bestOption
                : evento.opciones[_rng.Next(evento.opciones.Count)];

            result.logs.Add(new LogEntry { tipo = LogType.INFO, mensaje = $">> Decisión: {opcionElegida.texto}" });
            result.logs.Add(new LogEntry { tipo = LogType.INFO, mensaje = $">> Resultado: {opcionElegida.logResultado}" });

            result.player.carrera.historial.eventosImportantes.Add(
                $"{evento.titulo}: {opcionElegida.texto}");

            result.player = PlayerService.UpdatePlayerStats(result.player, opcionElegida.efectos(player));
            return result;
        }
    }
}

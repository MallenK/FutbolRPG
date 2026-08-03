using System;
using System.Collections.Generic;

namespace FutbolRPG.Engine
{
    public class Situacion
    {
        public string          id;
        public string          descripcion;
        public DecisionContext contexto;
        public List<DecisionOption> opciones = new List<DecisionOption>();
        public bool            esOportunidadGol;
    }

    public class MatchResult
    {
        public Player          player;
        public List<LogEntry>  logs    = new List<LogEntry>();
        public int             golesLocal;
        public int             golesVisitante;
        public MatchStats      stats;
    }

    public static class MatchEngine
    {
        private static readonly Random _rng = new Random();

        private static List<Situacion> GetSituacionesDelantero() => new List<Situacion>
        {
            new Situacion
            {
                id = "mano_a_mano",
                descripcion = "Recibes un pase filtrado y quedas solo frente al portero.",
                contexto = new DecisionContext { dificultadBase = 50, presionSituacional = 30, bonusContexto = 0 },
                esOportunidadGol = true,
                opciones = new List<DecisionOption>
                {
                    new DecisionOption { id = "tiro_seguro",   texto = "Asegurar al centro",    tipo = TipoDecision.SEGURO,      statPrincipal = "tiro",   pesoStat = 1.1f, riesgo = 0.1f },
                    new DecisionOption { id = "tiro_colocado", texto = "Colocar al palo",        tipo = TipoDecision.TECNICO,     statPrincipal = "tiro",   pesoStat = 1.0f, riesgo = 0.2f },
                    new DecisionOption { id = "regatear_gk",   texto = "Regatear al portero",    tipo = TipoDecision.EQUILIBRADO, statPrincipal = "regate", pesoStat = 0.85f,riesgo = 0.4f }
                }
            },
            new Situacion
            {
                id = "centro_area",
                descripcion = "Centro bombeado al punto de penalti.",
                contexto = new DecisionContext { dificultadBase = 50, presionSituacional = 20, bonusContexto = 10 },
                esOportunidadGol = true,
                opciones = new List<DecisionOption>
                {
                    new DecisionOption { id = "control_tiro", texto = "Controlar y asegurar",   tipo = TipoDecision.SEGURO,  statPrincipal = "control", pesoStat = 1.1f, riesgo = 0.15f },
                    new DecisionOption { id = "cabeza",       texto = "Remate de cabeza",        tipo = TipoDecision.TECNICO, statPrincipal = "cabeceo", pesoStat = 1.0f, riesgo = 0.2f  },
                    new DecisionOption { id = "volea",        texto = "Volea espectacular",      tipo = TipoDecision.AGRESIVO,statPrincipal = "tiro",    pesoStat = 0.85f,riesgo = 0.5f  }
                }
            },
            new Situacion
            {
                id = "presion_salida",
                descripcion = "El defensa rival duda con el balón.",
                contexto = new DecisionContext { dificultadBase = 40, presionSituacional = 0, bonusContexto = 5 },
                esOportunidadGol = false,
                opciones = new List<DecisionOption>
                {
                    new DecisionOption { id = "sprint_presion", texto = "Presionar espacio",  tipo = TipoDecision.FISICO,   statPrincipal = "aceleracion",    pesoStat = 1.1f, riesgo = 0.1f },
                    new DecisionOption { id = "interceptar",    texto = "Cortar pase",        tipo = TipoDecision.TACTICO,  statPrincipal = "posicionamiento", pesoStat = 1.0f, riesgo = 0.2f },
                    new DecisionOption { id = "entrada_fuerte", texto = "Entrada directa",    tipo = TipoDecision.AGRESIVO, statPrincipal = "fuerza",         pesoStat = 0.85f,riesgo = 0.4f }
                }
            },
            new Situacion
            {
                id = "espaldas_arco",
                descripcion = "Recibes de espaldas con marca pegajosa.",
                contexto = new DecisionContext { dificultadBase = 45, presionSituacional = 15, bonusContexto = 0 },
                esOportunidadGol = false,
                opciones = new List<DecisionOption>
                {
                    new DecisionOption { id = "pivotear",    texto = "Descargar de cara",   tipo = TipoDecision.SEGURO,      statPrincipal = "fuerza", pesoStat = 1.1f, riesgo = 0.05f },
                    new DecisionOption { id = "pared",       texto = "Buscar pared",        tipo = TipoDecision.EQUILIBRADO, statPrincipal = "pase",   pesoStat = 1.0f, riesgo = 0.2f  },
                    new DecisionOption { id = "giro_rapido", texto = "Giro y auto-pase",    tipo = TipoDecision.TECNICO,     statPrincipal = "regate", pesoStat = 0.85f,riesgo = 0.35f }
                }
            },
            new Situacion
            {
                id = "contragolpe",
                descripcion = "Contraataque con espacio por delante.",
                contexto = new DecisionContext { dificultadBase = 45, presionSituacional = 10, bonusContexto = 15 },
                esOportunidadGol = false,
                opciones = new List<DecisionOption>
                {
                    new DecisionOption { id = "pase_profundidad",  texto = "Abrir a banda",           tipo = TipoDecision.SEGURO, statPrincipal = "vision",    pesoStat = 1.1f, riesgo = 0.1f },
                    new DecisionOption { id = "conducir_velocidad",texto = "Ganar por velocidad",      tipo = TipoDecision.FISICO, statPrincipal = "velocidad", pesoStat = 1.0f, riesgo = 0.2f },
                    new DecisionOption { id = "frenar_recorte",    texto = "Frenar y romper cintura",  tipo = TipoDecision.TECNICO,statPrincipal = "regate",    pesoStat = 0.85f,riesgo = 0.3f }
                }
            },
            new Situacion
            {
                id = "balon_parado",
                descripcion = "Tiro libre en la frontal del área.",
                contexto = new DecisionContext { dificultadBase = 50, presionSituacional = 40, bonusContexto = 0 },
                esOportunidadGol = true,
                opciones = new List<DecisionOption>
                {
                    new DecisionOption { id = "centro_fk",        texto = "Centrar al punto penal",        tipo = TipoDecision.SEGURO,  statPrincipal = "pase",  pesoStat = 1.1f, riesgo = 0.1f  },
                    new DecisionOption { id = "tiro_colocado_fk", texto = "Rosca sobre barrera",           tipo = TipoDecision.TECNICO, statPrincipal = "tiro",  pesoStat = 1.0f, riesgo = 0.25f },
                    new DecisionOption { id = "potencia_fk",      texto = "Potencia al palo del portero",  tipo = TipoDecision.AGRESIVO,statPrincipal = "fuerza",pesoStat = 0.85f,riesgo = 0.4f  }
                }
            }
        };

        private static float GetTargetBaseDifficulty(int turno)
        {
            float rand = (float)_rng.NextDouble();
            if (turno <= 2)
            {
                return rand < 0.7f ? 35f + (float)_rng.NextDouble() * 10f
                                   : 46f + (float)_rng.NextDouble() * 9f;
            }
            if (turno <= 4)
            {
                if (rand < 0.4f) return 35f + (float)_rng.NextDouble() * 10f;
                if (rand < 0.8f) return 46f + (float)_rng.NextDouble() * 14f;
                return 61f + (float)_rng.NextDouble() * 9f;
            }
            if (turno <= 6)
            {
                if (rand < 0.2f) return 40f + (float)_rng.NextDouble() * 5f;
                if (rand < 0.7f) return 50f + (float)_rng.NextDouble() * 10f;
                return 65f + (float)_rng.NextDouble() * 10f;
            }
            if (rand < 0.2f) return 50f + (float)_rng.NextDouble() * 9f;
            if (rand < 0.8f) return 65f + (float)_rng.NextDouble() * 10f;
            return 76f + (float)_rng.NextDouble() * 14f;
        }

        public static string SimulateMatchResultOnly(string rivalDificultad)
        {
            float baseLocal = (float)_rng.NextDouble();
            float baseVisit = (float)_rng.NextDouble();
            int gLocal, gVisitante;

            if (rivalDificultad == "Baja")
            {
                gLocal     = (int)(baseLocal * 4);
                gVisitante = (int)(baseVisit * 2);
            }
            else if (rivalDificultad == "Media")
            {
                gLocal     = (int)(baseLocal * 3);
                gVisitante = (int)(baseVisit * 3);
            }
            else
            {
                gLocal     = (int)(baseLocal * 2);
                gVisitante = (int)(baseVisit * 4);
            }
            return $"{gLocal}-{gVisitante}";
        }

        public static MatchResult SimulateMatch(Player player)
        {
            var result   = new MatchResult { player = player.DeepClone() };
            var logs     = result.logs;
            var current  = result.player;
            var marcador = (local: 2, visitante: 1);

            var stats = new MatchStats
            {
                minutos = 90, goles = 0, asistencias = 0,
                tiros = 0, pasesCompletados = 0, robos = 0, valoracion = 6.0f
            };

            var situaciones = GetSituacionesDelantero();
            const int TURNOS = 5;
            const float MIN_POR_TURNO = 90f / TURNOS;
            bool hardMomentOccurred = false;

            logs.Add(new LogEntry { tipo = LogType.MATCH, mensaje = $"\n=== INICIO DEL PARTIDO: {current.carrera.club} vs RIVAL FC ===" });

            for (int turno = 1; turno <= TURNOS; turno++)
            {
                int minuto = (int)Math.Round(turno * MIN_POR_TURNO);

                float baseDC = GetTargetBaseDifficulty(turno);
                if (turno >= TURNOS - 1 && !hardMomentOccurred && baseDC < 65f)
                {
                    baseDC = 70f + (float)_rng.NextDouble() * 10f;
                }
                if (baseDC >= 65f) hardMomentOccurred = true;

                if (current.estado.fatiga > 50) baseDC += 5f;
                if (minuto > 70)                baseDC += 5f;
                baseDC = (float)Math.Round(baseDC);

                var pool = baseDC > 70f
                    ? situaciones.FindAll(s => s.esOportunidadGol)
                    : situaciones;
                if (pool.Count == 0) pool = situaciones;

                var template = pool[_rng.Next(pool.Count)];
                var situacion = new Situacion
                {
                    id = template.id,
                    descripcion = template.descripcion,
                    esOportunidadGol = template.esOportunidadGol,
                    opciones = template.opciones,
                    contexto = new DecisionContext
                    {
                        dificultadBase     = baseDC,
                        presionSituacional = template.contexto.presionSituacional,
                        bonusContexto      = template.contexto.bonusContexto
                    }
                };

                var opcion  = situacion.opciones[_rng.Next(situacion.opciones.Count)];
                var res     = DecisionEngine.ResolveDecision(opcion, current, situacion.contexto);

                logs.Add(new LogEntry { tipo = LogType.MATCH, mensaje = $"Min {minuto} [{opcion.texto}]: {res.narrativo} ({res.resultado})" });

                float valoracionDelta = 0f, turnoMoral = 0f, turnoForma = 0f;
                float turnoFatiga = 4f + _rng.Next(5);

                if (situacion.esOportunidadGol)
                {
                    stats.tiros++;
                    if (res.resultado == ResultadoDecision.PERFECTO)
                    {
                        if (_rng.NextDouble() < 0.80) { stats.goles++; marcador.local++; logs.Add(new LogEntry { tipo = LogType.MATCH, mensaje = "⚽ ¡GOLAZO! Definición imparable." }); valoracionDelta += 1.5f; turnoMoral += 10f; }
                        else valoracionDelta += 0.5f;
                    }
                    else if (res.resultado == ResultadoDecision.EXITO)
                    {
                        if (_rng.NextDouble() < 0.35) { stats.goles++; marcador.local++; logs.Add(new LogEntry { tipo = LogType.MATCH, mensaje = "⚽ ¡GOOOL! Al fondo de la red." }); valoracionDelta += 1.2f; turnoMoral += 8f; }
                        else valoracionDelta += 0.2f;
                    }
                    else if (res.resultado == ResultadoDecision.PARCIAL)
                    {
                        if (_rng.NextDouble() < 0.08) { stats.goles++; marcador.local++; logs.Add(new LogEntry { tipo = LogType.MATCH, mensaje = "⚽ ¡GOL! Entró con suspense." }); valoracionDelta += 1.0f; turnoMoral += 5f; }
                        else valoracionDelta -= 0.1f;
                    }
                    else { valoracionDelta -= 0.5f; turnoMoral -= 5f; }
                }
                else
                {
                    if (res.resultado == ResultadoDecision.PERFECTO)
                    {
                        stats.asistencias++; stats.pasesCompletados++; marcador.local++;
                        logs.Add(new LogEntry { tipo = LogType.MATCH, mensaje = "🎯 ¡ASISTENCIA DE ORO!" });
                        valoracionDelta += 1.0f; turnoMoral += 5f;
                    }
                    else if (res.resultado == ResultadoDecision.EXITO)
                    {
                        stats.pasesCompletados++; valoracionDelta += 0.4f; turnoMoral += 2f;
                    }
                    else if (res.resultado == ResultadoDecision.PARCIAL)
                    {
                        valoracionDelta += 0.1f;
                    }
                    else
                    {
                        stats.robos--;
                        if (_rng.NextDouble() < 0.15) { marcador.visitante++; logs.Add(new LogEntry { tipo = LogType.MATCH, mensaje = "😡 GOL RIVAL." }); valoracionDelta -= 0.5f; }
                        turnoMoral -= 3f; valoracionDelta -= 0.3f;
                    }
                }

                if (res.resultado == ResultadoDecision.PERFECTO || res.resultado == ResultadoDecision.EXITO)
                    turnoForma = 1f;
                else if (res.resultado == ResultadoDecision.FALLO || res.resultado == ResultadoDecision.CRITICO_FALLO)
                    turnoForma = -1f;

                float turnoRiesgo = current.estado.fatiga > 60f ? _rng.Next(6) + 3f : 0f;

                stats.valoracion = Math.Max(1f, Math.Min(10f, stats.valoracion + valoracionDelta));

                current = PlayerService.UpdatePlayerStats(current, new PlayerService.StatEffects
                {
                    fatiga = turnoFatiga, moral = turnoMoral
                });
                current.estado.forma        = Math.Max(0f, Math.Min(100f, current.estado.forma + turnoForma));
                current.estado.riesgoLesion = Math.Max(0f, Math.Min(100f, current.estado.riesgoLesion + turnoRiesgo));
            }

            // --- Final ---
            float impactoEntrenador = 0f, impactoVestuario = 0f, impactoReputacion = 0f;

            if (stats.valoracion >= 7.0f) impactoEntrenador += (int)(stats.valoracion - 5f) * 3;
            else if (stats.valoracion < 6.0f) impactoEntrenador -= 4f;
            if (stats.goles > 0) impactoEntrenador += 5f;

            if (stats.asistencias > 0) impactoVestuario += 5f;
            if (stats.valoracion < 5.0f) impactoVestuario -= 5f;

            impactoReputacion += stats.goles * 3 + stats.asistencias * 2;
            if (stats.valoracion >= 8.0f) impactoReputacion += 3f;

            current = PlayerService.UpdatePlayerStats(current, new PlayerService.StatEffects
            {
                entrenador = impactoEntrenador,
                vestuario  = impactoVestuario,
                reputacion = impactoReputacion
            });

            current.carrera.estadisticasTemporada.partidosJugados++;
            current.carrera.estadisticasTemporada.goles        += stats.goles;
            current.carrera.estadisticasTemporada.asistencias  += stats.asistencias;

            int   jugados  = current.carrera.estadisticasTemporada.partidosJugados;
            float mediaAnt = current.carrera.estadisticasTemporada.valoracionMedia;
            current.carrera.estadisticasTemporada.valoracionMedia =
                ((mediaAnt * (jugados - 1)) + stats.valoracion) / jugados;

            logs.Add(new LogEntry { tipo = LogType.MATCH, mensaje = $"🏁 FINAL: {current.carrera.club} {marcador.local} - {marcador.visitante} Rival FC" });
            logs.Add(new LogEntry { tipo = LogType.MATCH, mensaje = $"📊 Stats: {stats.goles} Goles | {stats.asistencias} Asist. | Val: {stats.valoracion:F1}" });

            result.player         = current;
            result.golesLocal     = marcador.local;
            result.golesVisitante = marcador.visitante;
            result.stats          = stats;
            return result;
        }
    }
}

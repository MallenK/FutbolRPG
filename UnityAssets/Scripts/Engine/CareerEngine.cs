using System;
using System.Collections.Generic;

namespace FutbolRPG.Engine
{
    public class CalendarMatch
    {
        public int    jornada;
        public string tipo;       // "LIGA" | "COPA"
        public string rival;
        public string dificultad; // "Baja" | "Media" | "Alta"
    }

    public class CareerActionResult
    {
        public Player         player;
        public List<LogEntry> logs = new List<LogEntry>();
    }

    public static class CareerEngine
    {
        private static readonly Random _rng = new Random();

        private static List<CalendarMatch> GetCalendarForSeason(Player player)
        {
            var world   = player.carrera.mundo;
            var rivals  = world.equiposPrimera.FindAll(t => t != player.carrera.club);
            var calendar = new List<CalendarMatch>();

            for (int i = 1; i <= 15; i++)
            {
                if (i == 4 || i == 8 || i == 12)
                {
                    calendar.Add(new CalendarMatch
                    {
                        jornada    = i,
                        tipo       = "COPA",
                        rival      = DatabaseData.GetRandomElement(world.equiposSegunda),
                        dificultad = "Baja"
                    });
                }
                else
                {
                    calendar.Add(new CalendarMatch
                    {
                        jornada    = i,
                        tipo       = "LIGA",
                        rival      = DatabaseData.GetRandomElement(rivals),
                        dificultad = _rng.NextDouble() > 0.7 ? "Alta" : "Media"
                    });
                }
            }
            return calendar;
        }

        private static CareerActionResult RunMatch(Player player, CalendarMatch match)
        {
            var result = new CareerActionResult { player = player.DeepClone() };
            var logs   = result.logs;
            var p      = result.player;

            logs.Add(new LogEntry { tipo = LogType.MATCH, mensaje = $"\n⚽ JORNADA {match.jornada} [{match.tipo}] vs {match.rival}" });

            // Recuperación de fatiga + lesiones nuevas
            float fatigaRec = -25f;
            if (p.mentales.disciplina > 70) fatigaRec -= 5f;

            if (p.carrera.historial.semanasLesionado == 0 && p.estado.fatiga > 70 && _rng.NextDouble() < 0.15)
            {
                int semanas = DatabaseData.GetRandomInt(2, 6);
                p.carrera.historial.semanasLesionado += semanas;
                p.carrera.historial.lesionesSufridas++;
                logs.Add(new LogEntry { tipo = LogType.INJURY, mensaje = $"🚑 LESIÓN: Sobrecarga muscular. Baja por {semanas} semanas." });
            }

            p = PlayerService.UpdatePlayerStats(p, new PlayerService.StatEffects { fatiga = fatigaRec, forma = 2 });

            var record = new MatchRecord
            {
                temporada   = p.carrera.temporada,
                jornada     = match.jornada,
                competicion = match.tipo,
                rival       = match.rival,
                resultado   = "",
                jugado      = false,
                minutos     = 0,
                stats       = null
            };

            // LESIONADO
            if (p.carrera.historial.semanasLesionado > 0)
            {
                record.resultado    = MatchEngine.SimulateMatchResultOnly(match.dificultad);
                record.detallesExtra = "No convocado (Lesión)";
                logs.Add(new LogEntry { tipo = LogType.INJURY, mensaje = $"[GRADA] Resultado del equipo: {record.resultado}" });
                p.carrera.historial.semanasLesionado--;
            }
            else
            {
                // Evento semanal
                var evResult = EventsEngine.TriggerWeeklyEvent(p);
                p = evResult.player;
                logs.AddRange(evResult.logs);

                if (match.tipo == "COPA")
                {
                    var cupRes = CompetitionEngine.ResolveCupMatch(
                        match.rival, p.carrera.club, true,
                        p.carrera.estadisticasTemporada.valoracionMedia == 0 ? 6.5f : p.carrera.estadisticasTemporada.valoracionMedia);

                    record.resultado     = cupRes.score;
                    record.detallesExtra = cupRes.method;
                    record.jugado        = true;
                    record.minutos       = cupRes.method == "Prórroga" ? 120 : 90;

                    if (cupRes.winner == p.carrera.club)
                    {
                        logs.Add(new LogEntry { tipo = LogType.MATCH, mensaje = $"🏆 AVANZAMOS! {cupRes.score} ({cupRes.method})" });
                        p = PlayerService.UpdatePlayerStats(p, new PlayerService.StatEffects { moral = 5 });
                    }
                    else
                    {
                        logs.Add(new LogEntry { tipo = LogType.MATCH, mensaje = $"❌ ELIMINADOS. {cupRes.score}" });
                        p = PlayerService.UpdatePlayerStats(p, new PlayerService.StatEffects { moral = -10 });
                    }
                }
                else
                {
                    int goalsPre = p.carrera.estadisticasTemporada.goles;
                    int assPre   = p.carrera.estadisticasTemporada.asistencias;

                    var matchResult = MatchEngine.SimulateMatch(p);
                    p = matchResult.player;
                    logs.AddRange(matchResult.logs);

                    int goalsInMatch = p.carrera.estadisticasTemporada.goles        - goalsPre;
                    int assInMatch   = p.carrera.estadisticasTemporada.asistencias  - assPre;

                    record.jugado  = true;
                    record.minutos = 90;
                    record.stats   = new MatchStats
                    {
                        goles = goalsInMatch, asistencias = assInMatch,
                        minutos = 90, tiros = goalsInMatch + 1,
                        pasesCompletados = 20, robos = 2, valoracion = 7.0f
                    };

                    for (int g = 0; g < goalsInMatch; g++)
                        record.eventos.Add(new MatchEvent
                        {
                            minuto      = DatabaseData.GetRandomInt(10, 88),
                            tipo        = "GOL",
                            subtipo     = DatabaseData.GetRandomElement(DatabaseData.GoalTypes),
                            descripcion = "Golazo para adelantar al equipo"
                        });

                    for (int a = 0; a < assInMatch; a++)
                        record.eventos.Add(new MatchEvent
                        {
                            minuto      = DatabaseData.GetRandomInt(10, 88),
                            tipo        = "ASISTENCIA",
                            subtipo     = DatabaseData.GetRandomElement(DatabaseData.AssistTypes),
                            descripcion = "Pase clave"
                        });

                    int teamGoals  = goalsInMatch + DatabaseData.GetRandomInt(0, 2);
                    int rivalGoals = DatabaseData.GetRandomInt(0, 2);
                    record.resultado = $"{teamGoals}-{rivalGoals}";

                    logs.Add(new LogEntry { tipo = LogType.MATCH, mensaje = $"FINAL: {record.resultado} | Goles: {goalsInMatch} Asist: {assInMatch}" });
                    if (goalsInMatch > 0)
                        logs.Add(new LogEntry { tipo = LogType.MATCH, mensaje = $"⚽ ¡Has marcado! ({goalsInMatch})" });
                }
            }

            p.carrera.historial.historialPartidos.Add(record);
            result.player = p;
            return result;
        }

        private static CareerActionResult ProcessEndOfSeason(Player player)
        {
            var result = new CareerActionResult { player = player.DeepClone() };
            var logs   = result.logs;
            var p      = result.player;

            logs.Add(new LogEntry { tipo = LogType.SEASON, mensaje = $"\n🏁 FIN DE TEMPORADA {p.carrera.temporada}" });

            // Tabla de liga
            var leagueResult = CompetitionEngine.GenerateLeagueTable(
                p.carrera.mundo.equiposPrimera,
                p.carrera.club,
                p.carrera.estadisticasTemporada.valoracionMedia);

            int myPos = leagueResult.table.Find(r => r.team == p.carrera.club)?.pos ?? 10;

            logs.Add(new LogEntry { tipo = LogType.SEASON, mensaje = "\n📊 CLASIFICACIÓN FINAL:" });
            logs.Add(new LogEntry { tipo = LogType.SEASON, mensaje = $"1. {leagueResult.winner} 🏆" });

            int end = Math.Min(7, leagueResult.table.Count);
            for (int i = 1; i < end; i++)
            {
                var r = leagueResult.table[i];
                logs.Add(new LogEntry { tipo = LogType.SEASON, mensaje = $"{r.pos}. {r.team} ({r.pts}pts)" });
            }
            logs.Add(new LogEntry { tipo = LogType.SEASON, mensaje = "..." });

            int start = Math.Max(0, leagueResult.table.Count - 3);
            for (int i = start; i < leagueResult.table.Count; i++)
            {
                var r = leagueResult.table[i];
                logs.Add(new LogEntry { tipo = LogType.SEASON, mensaje = $"{r.pos}. {r.team} (Descenso)" });
            }

            logs.Add(new LogEntry { tipo = LogType.SEASON, mensaje = $"\nTu equipo ({p.carrera.club}) terminó: 📍 Puesto {myPos}" });

            string winnerCopa = DatabaseData.GetRandomElement(p.carrera.mundo.equiposPrimera);
            logs.Add(new LogEntry { tipo = LogType.SEASON, mensaje = $"🏆 Campeón de Copa: {winnerCopa}" });

            // Premios
            logs.Add(new LogEntry { tipo = LogType.AWARD, mensaje = "\n✨ GALA DE PREMIOS" });
            var awards  = new List<string>();
            var stats   = p.carrera.estadisticasTemporada;
            bool isCrack = stats.valoracionMedia > 8.0f && stats.goles > 15;

            string winnerLiga = isCrack && _rng.NextDouble() > 0.3
                ? p.personal.nombre
                : DatabaseData.GetRandomElement(DatabaseData.RealPlayersPool);
            logs.Add(new LogEntry { tipo = LogType.AWARD, mensaje = $"MVP La Liga: {winnerLiga}" });
            if (winnerLiga == p.personal.nombre) awards.Add("MVP La Liga");

            var youngPool   = DatabaseData.RealPlayersPool.GetRange(10, DatabaseData.RealPlayersPool.Count - 10);
            string winnerRev = (p.personal.edad < 21 && stats.valoracionMedia > 7.0f && _rng.NextDouble() > 0.4)
                ? p.personal.nombre
                : DatabaseData.GetRandomElement(youngPool);
            logs.Add(new LogEntry { tipo = LogType.AWARD, mensaje = $"Jugador Revelación: {winnerRev}" });
            if (winnerRev == p.personal.nombre) awards.Add("Jugador Revelación");

            var topFive   = DatabaseData.RealPlayersPool.GetRange(0, 5);
            string winnerBO = (isCrack && stats.goles > 30)
                ? p.personal.nombre
                : DatabaseData.GetRandomElement(topFive);
            logs.Add(new LogEntry { tipo = LogType.AWARD, mensaje = $"Balón de Oro: {winnerBO}" });
            if (winnerBO == p.personal.nombre) awards.Add("Balón de Oro");

            p.carrera.historial.resumenesTemporadas.Add(new SeasonSummary
            {
                temporada    = p.carrera.temporada,
                club         = p.carrera.club,
                stats        = stats.Clone(),
                premios      = awards,
                posicionLiga = myPos,
                campeonLiga  = leagueResult.winner,
                campeonCopa  = winnerCopa
            });

            // Ascensos/Descensos
            var promRelResult = CompetitionEngine.ProcessPromotionRelegation(p.carrera.mundo);
            p.carrera.mundo = promRelResult.newWorld;
            logs.Add(new LogEntry { tipo = LogType.INFO, mensaje = "\n🔄 MOVIMIENTOS LIGA:" });
            foreach (var n in promRelResult.news)
                logs.Add(new LogEntry { tipo = LogType.INFO, mensaje = n });

            // Off-season
            p.personal.edad++;
            p.carrera.temporada++;
            p.carrera.estadisticasTemporada = new StatsTemporada
                { partidosJugados = 0, goles = 0, asistencias = 0, valoracionMedia = 6.0f };

            if (p.personal.edad < 24) p.fisicos.velocidad += 1;

            logs.Add(new LogEntry { tipo = LogType.SEASON, mensaje = $"\n📅 Temporada finalizada. Edad actual: {p.personal.edad}" });

            result.player = p;
            return result;
        }

        public static CareerActionResult RunNextMatch(Player player)
        {
            var calendar      = GetCalendarForSeason(player);
            int matchesPlayed = player.carrera.estadisticasTemporada.partidosJugados;

            if (matchesPlayed >= calendar.Count)
            {
                return ProcessEndOfSeason(player);
            }

            var allLogs = new List<LogEntry>();
            var match   = calendar[matchesPlayed];
            var matchRes = RunMatch(player, match);
            allLogs.AddRange(matchRes.logs);
            player = matchRes.player;

            if (player.carrera.estadisticasTemporada.partidosJugados >= calendar.Count)
            {
                var endRes = ProcessEndOfSeason(player);
                allLogs.AddRange(endRes.logs);
                player = endRes.player;
            }

            return new CareerActionResult { player = player, logs = allLogs };
        }

        public static CareerActionResult RunRestOfSeason(Player player)
        {
            var calendar      = GetCalendarForSeason(player);
            int matchesPlayed = player.carrera.estadisticasTemporada.partidosJugados;
            var allLogs       = new List<LogEntry>();

            allLogs.Add(new LogEntry { tipo = LogType.INFO, mensaje = $"⏩ Simulando resto de temporada ({calendar.Count - matchesPlayed} partidos)..." });

            while (matchesPlayed < calendar.Count)
            {
                var matchRes = RunMatch(player, calendar[matchesPlayed]);
                allLogs.AddRange(matchRes.logs);
                player = matchRes.player;
                matchesPlayed++;
            }

            var endRes = ProcessEndOfSeason(player);
            allLogs.AddRange(endRes.logs);
            player = endRes.player;

            return new CareerActionResult { player = player, logs = allLogs };
        }

        public static CareerActionResult RunCareerDuration(Player player, int seasons)
        {
            var allLogs  = new List<LogEntry>();
            var calendar = GetCalendarForSeason(player);

            if (player.carrera.estadisticasTemporada.partidosJugados > 0 &&
                player.carrera.estadisticasTemporada.partidosJugados < calendar.Count)
            {
                var restRes = RunRestOfSeason(player);
                allLogs.AddRange(restRes.logs);
                player = restRes.player;
                seasons--;
            }

            for (int i = 0; i < seasons; i++)
            {
                var seasonRes = RunRestOfSeason(player);
                allLogs.AddRange(seasonRes.logs);
                player = seasonRes.player;
            }

            return new CareerActionResult { player = player, logs = allLogs };
        }
    }
}

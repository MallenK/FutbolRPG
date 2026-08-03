using System;
using System.Collections.Generic;

namespace FutbolRPG.Engine
{
    public class LeagueRow
    {
        public int    pos;
        public string team;
        public int    pts;
        public int    gf;
        public int    gc;
    }

    public class LeagueTableResult
    {
        public List<LeagueRow> table  = new List<LeagueRow>();
        public string          winner;
    }

    public class CupMatchResult
    {
        public string winner;
        public string score;
        public string method;
    }

    public class PromotionRelegationResult
    {
        public WorldState    newWorld = new WorldState();
        public List<string>  news     = new List<string>();
    }

    public static class CompetitionEngine
    {
        private static readonly Random _rng = new Random();

        public static LeagueTableResult GenerateLeagueTable(
            List<string> teams, string playerTeam, float playerPerformance)
        {
            var rows = new List<LeagueRow>();

            foreach (var team in teams)
            {
                int   baseIndex    = DatabaseData.TeamsPrimeraBase.IndexOf(team);
                float baseStrength = 1.0f - (baseIndex / 40f);

                rows.Add(new LeagueRow
                {
                    team = team,
                    pts  = (int)(30 + _rng.NextDouble() * 50 + baseStrength * 20),
                    gf   = (int)(30 + _rng.NextDouble() * 40),
                    gc   = (int)(30 + _rng.NextDouble() * 40)
                });
            }

            var playerRow = rows.Find(r => r.team == playerTeam);
            if (playerRow != null)
                playerRow.pts += (int)(playerPerformance * 0.5f);

            rows.Sort((a, b) => b.pts.CompareTo(a.pts));
            for (int i = 0; i < rows.Count; i++) rows[i].pos = i + 1;

            return new LeagueTableResult { table = rows, winner = rows[0].team };
        }

        public static CupMatchResult ResolveCupMatch(
            string rival, string playerTeam, bool playerPlayed, float playerRating)
        {
            float baseAdvantage = playerPlayed ? (playerRating - 6.0f) / 4f : 0f;
            float strengthDiff  = ((float)_rng.NextDouble() - 0.5f) + baseAdvantage;

            int gLocal, gVisit;
            if (strengthDiff > 0.1f)
            {
                gLocal = _rng.Next(3) + 1; gVisit = _rng.Next(2);
            }
            else if (strengthDiff < -0.1f)
            {
                gLocal = _rng.Next(2); gVisit = _rng.Next(3) + 1;
            }
            else
            {
                gLocal = 1; gVisit = 1;
            }

            if (gLocal != gVisit)
                return new CupMatchResult
                {
                    winner = gLocal > gVisit ? playerTeam : rival,
                    score  = $"{gLocal}-{gVisit}",
                    method = "Regular"
                };

            // Prórroga
            int etLocal = _rng.NextDouble() > 0.7 ? 1 : 0;
            int etVisit = _rng.NextDouble() > 0.7 ? 1 : 0;
            gLocal += etLocal; gVisit += etVisit;

            if (gLocal != gVisit)
                return new CupMatchResult
                {
                    winner = gLocal > gVisit ? playerTeam : rival,
                    score  = $"{gLocal}-{gVisit} (AET)",
                    method = "Prórroga"
                };

            // Penaltis
            int pensLocal = 3 + _rng.Next(3);
            int pensVisit = 3 + _rng.Next(3);
            bool localWins = pensLocal >= pensVisit;
            int winScore   = localWins ? pensLocal : pensVisit;
            int loseScore  = localWins ? pensVisit : pensLocal;

            return new CupMatchResult
            {
                winner = localWins ? playerTeam : rival,
                score  = $"{gLocal}-{gVisit} ({winScore}-{loseScore} PEN)",
                method = "Penaltis"
            };
        }

        public static PromotionRelegationResult ProcessPromotionRelegation(WorldState world)
        {
            var primera = new List<string>(world.equiposPrimera);
            var segunda = new List<string>(world.equiposSegunda);

            var candidatesRel  = primera.Count >= 14 ? primera.GetRange(14, primera.Count - 14) : new List<string>(primera);
            var candidatesProm = segunda.Count >= 6  ? segunda.GetRange(0, 6)                    : new List<string>(segunda);

            var relegated = new List<string>();
            var promoted  = new List<string>();

            for (int i = 0; i < 3; i++)
            {
                if (candidatesRel.Count > 0)
                {
                    int rIdx = _rng.Next(candidatesRel.Count);
                    relegated.Add(candidatesRel[rIdx]);
                    candidatesRel.RemoveAt(rIdx);
                }
                if (candidatesProm.Count > 0)
                {
                    int pIdx = _rng.Next(candidatesProm.Count);
                    promoted.Add(candidatesProm[pIdx]);
                    candidatesProm.RemoveAt(pIdx);
                }
            }

            var newPrimera = new List<string>(primera);
            foreach (var t in relegated) newPrimera.Remove(t);
            newPrimera.AddRange(promoted);

            var newSegunda = new List<string>(segunda);
            foreach (var t in promoted) newSegunda.Remove(t);
            newSegunda.AddRange(relegated);

            return new PromotionRelegationResult
            {
                newWorld = new WorldState
                {
                    equiposPrimera      = newPrimera,
                    equiposSegunda      = newSegunda,
                    campeonesHistoricos = new List<string>(world.campeonesHistoricos)
                },
                news = new List<string>
                {
                    $"Descendidos: {string.Join(", ", relegated)}",
                    $"Ascendidos: {string.Join(", ", promoted)}"
                }
            };
        }
    }
}

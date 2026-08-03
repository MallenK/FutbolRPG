using System;

namespace FutbolRPG.Engine
{
    public static class DecisionEngine
    {
        private static readonly Random _rng = new Random();

        private struct ScoreResult
        {
            public int    score;
            public string breakdown;
        }

        private static ScoreResult CalculateScore(DecisionOption option, Player player, DecisionContext context)
        {
            const float BASE_SCORE = 50f;

            float statValue = player.GetStat(option.statPrincipal);

            float statContribution = statValue * option.pesoStat;
            float difficultyPenalty = context.dificultadBase;
            float skillDifference = statContribution - difficultyPenalty;

            float formMod       = (player.estado.forma  - 50f) * 0.2f;
            float fatigueMod    = player.estado.fatiga * 0.20f;
            float confidenceMod = (player.mentales.confianza - 50f) * 0.15f;

            float pressureResistance = player.mentales.presion / 100f;
            float effectivePressure  = context.presionSituacional * (1f - pressureResistance * 0.6f);

            float randomFactor = _rng.Next(13) - 6;

            float rawScore =
                BASE_SCORE +
                skillDifference +
                formMod -
                fatigueMod +
                confidenceMod -
                effectivePressure +
                context.bonusContexto +
                randomFactor;

            int score = (int)Math.Max(0, Math.Min(100, Math.Round(rawScore)));

            string breakdown =
                $"FACTORES: Base({BASE_SCORE}) + Stat({Math.Round(statContribution)}) - " +
                $"Dif({difficultyPenalty}) + Forma({Math.Round(formMod)}) - " +
                $"Fatiga({Math.Round(fatigueMod)}) + Conf({Math.Round(confidenceMod)}) - " +
                $"Presión({Math.Round(effectivePressure)}) + Azar({randomFactor})";

            return new ScoreResult { score = score, breakdown = breakdown };
        }

        public static int CalcChance(DecisionOption option, Player player, DecisionContext context)
        {
            return CalculateScore(option, player, context).score;
        }

        public class DecisionResult
        {
            public ResultadoDecision resultado;
            public int               score;
            public string            narrativo;
            public string            debugInfo;
        }

        public static DecisionResult ResolveDecision(DecisionOption option, Player player, DecisionContext context)
        {
            var calc = CalculateScore(option, player, context);
            int score = calc.score;

            ResultadoDecision resultado;
            string narrativo;

            if (score >= 85)
            {
                resultado = ResultadoDecision.PERFECTO;
                narrativo = "¡Ejecución magistral!";
            }
            else if (score >= 65)
            {
                resultado = ResultadoDecision.EXITO;
                narrativo = "Buena ejecución.";
            }
            else if (score >= 41)
            {
                resultado = ResultadoDecision.PARCIAL;
                narrativo = "Ejecución forzada, ventaja perdida.";
            }
            else if (score >= 16)
            {
                resultado = ResultadoDecision.FALLO;
                narrativo = "Error en la ejecución.";
            }
            else
            {
                bool highRisk      = option.riesgo >= 0.3f;
                bool extremeFatiga = player.estado.fatiga >= 85f;
                bool highPressure  = context.presionSituacional >= 40f;

                if (score <= 15 && (highRisk || extremeFatiga || highPressure))
                {
                    resultado = ResultadoDecision.CRITICO_FALLO;
                    narrativo = "¡Desastre absoluto!";
                }
                else
                {
                    resultado = ResultadoDecision.FALLO;
                    narrativo = "Fallo grave salvado in extremis.";
                }
            }

            return new DecisionResult
            {
                resultado = resultado,
                score     = score,
                narrativo = narrativo,
                debugInfo = calc.breakdown
            };
        }
    }
}

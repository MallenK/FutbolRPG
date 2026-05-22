using System;
using System.Collections.Generic;

namespace FutbolRPG.Engine
{
    public enum Posicion
    {
        PORTERO,
        DEFENSA_CENTRAL,
        LATERAL,
        MEDIOCENTRO,
        MEDIAPUNTA,
        EXTREMO,
        DELANTERO
    }

    public enum ResultadoDecision
    {
        CRITICO_FALLO,
        FALLO,
        PARCIAL,
        EXITO,
        PERFECTO
    }

    public enum LogType
    {
        INFO,
        MATCH,
        SEASON,
        INJURY,
        AWARD
    }

    public enum TipoDecision
    {
        AGRESIVO,
        EQUILIBRADO,
        SEGURO,
        TECNICO,
        TACTICO,
        FISICO
    }

    public enum StatKey
    {
        // Técnicos
        control, pase, tiro, regate, cabeceo,
        // Físicos
        resistencia, velocidad, aceleracion, fuerza,
        // Tácticos
        posicionamiento, vision, decisiones
    }

    [Serializable]
    public class StatsTecnicos
    {
        public int control;
        public int pase;
        public int tiro;
        public int regate;
        public int cabeceo;

        public int GetStat(string key)
        {
            switch (key)
            {
                case "control":     return control;
                case "pase":        return pase;
                case "tiro":        return tiro;
                case "regate":      return regate;
                case "cabeceo":     return cabeceo;
                default:            return 0;
            }
        }

        public StatsTecnicos Clone() => new StatsTecnicos
        {
            control = control, pase = pase, tiro = tiro,
            regate = regate, cabeceo = cabeceo
        };
    }

    [Serializable]
    public class StatsFisicos
    {
        public int resistencia;
        public int velocidad;
        public int aceleracion;
        public int fuerza;

        public int GetStat(string key)
        {
            switch (key)
            {
                case "resistencia": return resistencia;
                case "velocidad":   return velocidad;
                case "aceleracion": return aceleracion;
                case "fuerza":      return fuerza;
                default:            return 0;
            }
        }

        public StatsFisicos Clone() => new StatsFisicos
        {
            resistencia = resistencia, velocidad = velocidad,
            aceleracion = aceleracion, fuerza = fuerza
        };
    }

    [Serializable]
    public class StatsTacticos
    {
        public int posicionamiento;
        public int vision;
        public int decisiones;

        public int GetStat(string key)
        {
            switch (key)
            {
                case "posicionamiento": return posicionamiento;
                case "vision":          return vision;
                case "decisiones":      return decisiones;
                default:                return 0;
            }
        }

        public StatsTacticos Clone() => new StatsTacticos
        {
            posicionamiento = posicionamiento, vision = vision, decisiones = decisiones
        };
    }

    [Serializable]
    public class StatsMentales
    {
        public int disciplina;
        public int confianza;
        public int presion;

        public int GetStat(string key)
        {
            switch (key)
            {
                case "disciplina": return disciplina;
                case "confianza":  return confianza;
                case "presion":    return presion;
                default:           return 0;
            }
        }

        public StatsMentales Clone() => new StatsMentales
        {
            disciplina = disciplina, confianza = confianza, presion = presion
        };
    }

    [Serializable]
    public class EstadoJugador
    {
        public float fatiga;       // 0-100
        public float forma;        // 0-100
        public float moral;        // 0-100
        public float riesgoLesion; // %

        public EstadoJugador Clone() => new EstadoJugador
        {
            fatiga = fatiga, forma = forma,
            moral = moral, riesgoLesion = riesgoLesion
        };
    }

    [Serializable]
    public class Confianza
    {
        public float entrenador;
        public float vestuario;
        public float reputacion;

        public Confianza Clone() => new Confianza
        {
            entrenador = entrenador, vestuario = vestuario, reputacion = reputacion
        };
    }

    [Serializable]
    public class StatsTemporada
    {
        public int   partidosJugados;
        public int   goles;
        public int   asistencias;
        public float valoracionMedia;

        public StatsTemporada Clone() => new StatsTemporada
        {
            partidosJugados = partidosJugados, goles = goles,
            asistencias = asistencias, valoracionMedia = valoracionMedia
        };
    }

    [Serializable]
    public class MatchStats
    {
        public int   minutos;
        public int   goles;
        public int   asistencias;
        public int   tiros;
        public int   pasesCompletados;
        public int   robos;
        public float valoracion;
    }

    [Serializable]
    public class MatchEvent
    {
        public int    minuto;
        public string tipo;     // "GOL" | "ASISTENCIA"
        public string subtipo;
        public string descripcion;
    }

    [Serializable]
    public class MatchRecord
    {
        public int         temporada;
        public int         jornada;
        public string      competicion; // "LIGA" | "COPA"
        public string      rival;
        public string      resultado;
        public bool        jugado;
        public int         minutos;
        public MatchStats  stats;
        public List<MatchEvent> eventos = new List<MatchEvent>();
        public string      detallesExtra;
    }

    [Serializable]
    public class SeasonSummary
    {
        public int            temporada;
        public string         club;
        public StatsTemporada stats;
        public List<string>   premios  = new List<string>();
        public int            posicionLiga;
        public string         campeonLiga;
        public string         campeonCopa;
        public List<string>   logros   = new List<string>();
    }

    [Serializable]
    public class WorldState
    {
        public List<string> equiposPrimera      = new List<string>();
        public List<string> equiposSegunda      = new List<string>();
        public List<string> campeonesHistoricos = new List<string>();

        public WorldState Clone()
        {
            return new WorldState
            {
                equiposPrimera      = new List<string>(equiposPrimera),
                equiposSegunda      = new List<string>(equiposSegunda),
                campeonesHistoricos = new List<string>(campeonesHistoricos)
            };
        }
    }

    [Serializable]
    public class SeasonHistory
    {
        public List<MatchRecord>   historialPartidos      = new List<MatchRecord>();
        public List<SeasonSummary> resumenesTemporadas    = new List<SeasonSummary>();
        public int                 lesionesSufridas;
        public int                 semanasLesionado;
        public List<string>        eventosImportantes     = new List<string>();
    }

    [Serializable]
    public class Carrera
    {
        public string         club;
        public string         rol; // "Reserva" | "Rotación" | "Titular" | "Estrella"
        public int            temporada;
        public List<string>   etiquetas             = new List<string>();
        public StatsTemporada estadisticasTemporada = new StatsTemporada();
        public SeasonHistory  historial             = new SeasonHistory();
        public WorldState     mundo                 = new WorldState();
    }

    [Serializable]
    public class PersonalData
    {
        public string nombre;
        public int    edad;
        public string nacionalidad;
        public string genero;
        public string piernaDominante;
        public int    altura;
        public int    peso;
        public int    dorsal;
        public string fechaNacimiento;
        public string cantera;
        public string representante;
    }

    [Serializable]
    public class Player
    {
        public string            id;
        public PersonalData      personal              = new PersonalData();
        public Posicion          posicionPrincipal;
        public List<Posicion>    posicionesSecundarias = new List<Posicion>();

        public StatsTecnicos     tecnicos  = new StatsTecnicos();
        public StatsFisicos      fisicos   = new StatsFisicos();
        public StatsTacticos     tacticos  = new StatsTacticos();
        public StatsMentales     mentales  = new StatsMentales();

        public EstadoJugador     estado    = new EstadoJugador();
        public Confianza         confianza = new Confianza();
        public Carrera           carrera   = new Carrera();

        public int GetStat(string key)
        {
            int v = tecnicos.GetStat(key);
            if (v != 0) return v;
            v = fisicos.GetStat(key);
            if (v != 0) return v;
            return tacticos.GetStat(key);
        }

        public Player DeepClone()
        {
            var json = UnityEngine.JsonUtility.ToJson(this);
            return UnityEngine.JsonUtility.FromJson<Player>(json);
        }
    }

    [Serializable]
    public class DecisionContext
    {
        public float dificultadBase;
        public float presionSituacional;
        public float bonusContexto;
    }

    [Serializable]
    public class DecisionOption
    {
        public string        id;
        public string        texto;
        public TipoDecision  tipo;
        public string        statPrincipal;
        public float         pesoStat;
        public float         riesgo;
    }

    public class LogEntry
    {
        public string  mensaje;
        public LogType tipo;
    }
}

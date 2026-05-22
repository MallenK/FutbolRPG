using System.Collections.Generic;
using UnityEngine;

namespace FutbolRPG.Engine
{
    public static class DatabaseData
    {
        public static readonly List<string> TeamsPrimeraBase = new List<string>
        {
            "Real Madrid", "FC Barcelona", "Atlético de Madrid", "Girona FC", "Athletic Club",
            "Real Sociedad", "Real Betis", "Villarreal CF", "Valencia CF", "Sevilla FC",
            "CA Osasuna", "Getafe CF", "Celta de Vigo", "RCD Mallorca", "Deportivo Alavés",
            "UD Las Palmas", "Rayo Vallecano", "CD Leganés", "Real Valladolid", "RCD Espanyol"
        };

        public static readonly List<string> TeamsSegundaBase = new List<string>
        {
            "Cádiz CF", "Granada CF", "UD Almería", "Real Oviedo", "Racing de Santander",
            "Real Sporting", "Levante UD", "SD Eibar", "Burgos CF", "Racing de Ferrol",
            "Elche CF", "CD Tenerife", "Albacete BP", "Real Zaragoza", "FC Cartagena",
            "CD Mirandés", "SD Huesca", "Córdoba CF", "Málaga CF", "CD Castellón",
            "Deportivo de La Coruña", "CD Eldense"
        };

        public static readonly List<string> RealPlayersPool = new List<string>
        {
            "Kylian Mbappé", "Erling Haaland", "Jude Bellingham", "Vinícius Jr", "Lamine Yamal",
            "Rodri Hernández", "Kevin De Bruyne", "Harry Kane", "Mohamed Salah", "Bukayo Saka",
            "Jamal Musiala", "Florian Wirtz", "Cole Palmer", "Phil Foden", "Lautaro Martínez",
            "Antoine Griezmann", "Robert Lewandowski", "Pedri", "Gavi", "Nico Williams"
        };

        public static readonly List<string> TeamPlayersPool = new List<string>
        {
            "Isi Palazón", "Álvaro García", "Óscar Trejo", "Unai López", "Florian Lejeune",
            "Sergio Camello", "Jorge de Frutos", "Abdul Mumin", "Ivan Balliu", "Pacha Espino"
        };

        public static readonly List<string> GoalTypes = new List<string>
        {
            "Disparo raso", "Cabeza", "Volea", "Tiro lejano",
            "Penalti", "Rebote", "Vaselina", "Jugada individual"
        };

        public static readonly List<string> AssistTypes = new List<string>
        {
            "Pase filtrado", "Centro lateral", "Pase de la muerte",
            "Balón parado", "Toque sutil"
        };

        private static System.Random _rng = new System.Random();

        public static T GetRandomElement<T>(List<T> list)
        {
            if (list == null || list.Count == 0) return default;
            return list[_rng.Next(list.Count)];
        }

        public static int GetRandomInt(int min, int max)
        {
            return _rng.Next(min, max + 1);
        }

        public static float GetRandomFloat()
        {
            return (float)_rng.NextDouble();
        }
    }
}

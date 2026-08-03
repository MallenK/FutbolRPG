// engine/database.ts

export const TEAMS_PRIMERA_BASE = [
  "Real Madrid", "FC Barcelona", "Atlético de Madrid", "Girona FC", "Athletic Club",
  "Real Sociedad", "Real Betis", "Villarreal CF", "Valencia CF", "Sevilla FC",
  "CA Osasuna", "Getafe CF", "Celta de Vigo", "RCD Mallorca", "Deportivo Alavés",
  "UD Las Palmas", "Rayo Vallecano", "CD Leganés", "Real Valladolid", "RCD Espanyol"
];

export const TEAMS_SEGUNDA_BASE = [
  "Cádiz CF", "Granada CF", "UD Almería", "Real Oviedo", "Racing de Santander",
  "Real Sporting", "Levante UD", "SD Eibar", "Burgos CF", "Racing de Ferrol",
  "Elche CF", "CD Tenerife", "Albacete BP", "Real Zaragoza", "FC Cartagena",
  "CD Mirandés", "SD Huesca", "Córdoba CF", "Málaga CF", "CD Castellón",
  "Deportivo de La Coruña", "CD Eldense" // Extra para pool
];

export const REAL_PLAYERS_POOL = [
  "Kylian Mbappé", "Erling Haaland", "Jude Bellingham", "Vinícius Jr", "Lamine Yamal",
  "Rodri Hernández", "Kevin De Bruyne", "Harry Kane", "Mohamed Salah", "Bukayo Saka",
  "Jamal Musiala", "Florian Wirtz", "Cole Palmer", "Phil Foden", "Lautaro Martínez",
  "Antoine Griezmann", "Robert Lewandowski", "Pedri", "Gavi", "Nico Williams"
];

export const TEAM_PLAYERS_POOL = [
  "Isi Palazón", "Álvaro García", "Óscar Trejo", "Unai López", "Florian Lejeune",
  "Sergio Camello", "Jorge de Frutos", "Abdul Mumin", "Ivan Balliu", "Pacha Espino"
];

// Generadores de "Sabor" para goles/asistencias
export const GOAL_TYPES = ["Disparo raso", "Cabeza", "Volea", "Tiro lejano", "Penalti", "Rebote", "Vaselina", "Jugada individual"];
export const ASSIST_TYPES = ["Pase filtrado", "Centro lateral", "Pase de la muerte", "Balón parado", "Toque sutil"];

export const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
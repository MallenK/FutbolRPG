using System;
using System.IO;
using UnityEngine;
using FutbolRPG.Engine;

namespace FutbolRPG.Data
{
    [Serializable]
    public class SaveData
    {
        public Player player;
        public string saveDate;
        public int    saveVersion = 1;
    }

    public static class SaveSystem
    {
        private static readonly string SavePath =
            Path.Combine(Application.persistentDataPath, "career_save.json");

        public static void Save(Player player)
        {
            var data = new SaveData
            {
                player    = player,
                saveDate  = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                saveVersion = 1
            };

            string json = JsonUtility.ToJson(data, prettyPrint: true);
            File.WriteAllText(SavePath, json);
            Debug.Log($"[SaveSystem] Guardado en: {SavePath}");
        }

        public static Player Load()
        {
            if (!File.Exists(SavePath))
            {
                Debug.Log("[SaveSystem] No existe guardado, nuevo jugador.");
                return null;
            }

            string json = File.ReadAllText(SavePath);
            var data = JsonUtility.FromJson<SaveData>(json);

            if (data == null || data.player == null)
            {
                Debug.LogWarning("[SaveSystem] Guardado corrupto, reseteando.");
                return null;
            }

            Debug.Log($"[SaveSystem] Cargado. Fecha guardado: {data.saveDate}");
            return data.player;
        }

        public static bool HasSave() => File.Exists(SavePath);

        public static void DeleteSave()
        {
            if (File.Exists(SavePath))
            {
                File.Delete(SavePath);
                Debug.Log("[SaveSystem] Guardado eliminado.");
            }
        }
    }
}

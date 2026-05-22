# FutbolRPG — Unity Setup Guide

## Requisitos

- Unity **2022.3 LTS** (descargar desde Unity Hub)
- Módulos a instalar en Unity Hub:
  - Android Build Support (para móvil)
  - iOS Build Support (para iPhone)
  - WebGL Build Support

## Paso 1 — Crear proyecto Unity

1. Abrir Unity Hub → New Project
2. Elegir plantilla: **2D (URP)**
3. Nombre: `FutbolRPG`
4. Unity Version: 2022.3.x LTS

## Paso 2 — Copiar los scripts

Copia toda la carpeta `UnityAssets/Scripts/` a `Assets/Scripts/` dentro del proyecto Unity.

```
FutbolRPG/                     ← Proyecto Unity
└── Assets/
    └── Scripts/
        ├── Engine/             ← copiar aquí
        │   ├── GameTypes.cs
        │   ├── DatabaseData.cs
        │   ├── PlayerService.cs
        │   ├── DecisionEngine.cs
        │   ├── MatchEngine.cs
        │   ├── EventsEngine.cs
        │   ├── CompetitionEngine.cs
        │   └── CareerEngine.cs
        └── Data/
            └── GameSaveData.cs
```

## Paso 3 — Estructura de Escenas

Crear estas escenas en `Assets/Scenes/`:
- `MainMenu.unity`
- `CareerHub.unity`
- `Match.unity`
- `SeasonSummary.unity`

## Paso 4 — Controlador principal (GameManager)

Crear `Assets/Scripts/GameManager.cs` como MonoBehaviour singleton:

```csharp
using UnityEngine;
using FutbolRPG.Engine;
using FutbolRPG.Data;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }
    public Player CurrentPlayer { get; private set; }

    void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        CurrentPlayer = SaveSystem.Load() ?? PlayerService.CreateDefaultPlayer();
    }

    public void SimulateNextMatch()
    {
        var result = CareerEngine.RunNextMatch(CurrentPlayer);
        CurrentPlayer = result.player;
        SaveSystem.Save(CurrentPlayer);
        // Pasar logs a UI
    }

    public void SimulateSeason()
    {
        var result = CareerEngine.RunRestOfSeason(CurrentPlayer);
        CurrentPlayer = result.player;
        SaveSystem.Save(CurrentPlayer);
    }
}
```

## Paso 5 — Vista 2D del Partido (MatchVisualizer)

Crear `Assets/Scripts/Match/MatchVisualizer.cs`:
- Sprite del campo: asset gratuito en Unity Asset Store ("Soccer Field Top Down")
- Jugadores: círculos coloreados con `SpriteRenderer` + `TextMeshPro` para número
- Animar movimiento entre posiciones durante cada turno con `DOTween` o `Coroutine`

## Paso 6 — UI con UI Toolkit

Crear paneles UXML en `Assets/UI/`:
- `CareerHubPanel.uxml` — stats + botones
- `MatchPanel.uxml` — campo + log + decisiones
- `SeasonSummaryPanel.uxml` — tabla + premios

## Packages recomendados (Package Manager)

| Package | Uso |
|---------|-----|
| TextMeshPro | Texto de calidad |
| Input System | Táctil + teclado |
| DOTween (Asset Store) | Animaciones fluidas |
| 2D Sprite | Ya incluido en URP |

## Build Settings

### Android
- File → Build Settings → Android
- Player Settings → Package Name: `com.tuNombre.futbolrpg`
- Minimum API: 24 (Android 7.0)

### WebGL
- File → Build Settings → WebGL
- Player Settings → Compression: Brotli
- Publishing Settings → Enable Exceptions: None (para tamaño mínimo)

### PC
- File → Build Settings → Windows/Mac/Linux
- Architecture: x86_64

## Estructura de Namespaces

```
FutbolRPG.Engine    ← toda la lógica del juego
FutbolRPG.Data      ← guardado / carga
FutbolRPG.UI        ← controladores de pantalla (por crear)
FutbolRPG.Match     ← visualización 2D (por crear)
```

## Tests del Engine

Crear `Assets/Tests/EditMode/EngineTests.cs`:

```csharp
using NUnit.Framework;
using FutbolRPG.Engine;

public class EngineTests
{
    [Test]
    public void CreateDefaultPlayer_HasCorrectStats()
    {
        var p = PlayerService.CreateDefaultPlayer();
        Assert.AreEqual("Rayo Vallecano", p.carrera.club);
        Assert.AreEqual(75, p.tecnicos.tiro);
    }

    [Test]
    public void SimulateMatch_UpdatesPlayerStats()
    {
        var p = PlayerService.CreateDefaultPlayer();
        var result = MatchEngine.SimulateMatch(p);
        Assert.IsNotNull(result.player);
        Assert.Greater(result.player.carrera.estadisticasTemporada.partidosJugados, 0);
    }

    [Test]
    public void RunRestOfSeason_Completes15Matches()
    {
        var p = PlayerService.CreateDefaultPlayer();
        var result = CareerEngine.RunRestOfSeason(p);
        Assert.GreaterOrEqual(result.player.carrera.temporada, 2);
    }
}
```

Ejecutar: Window → General → Test Runner → EditMode → Run All

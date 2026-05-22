# Plan: FutbolRPG → Unity Migration

## Context

FutbolRPG es un RPG de carrera futbolística construido en React/TypeScript (~1.573 líneas). El objetivo es portarlo a Unity como videojuego profesional con:
- Vista 2D top-down del partido (césped + sprites de jugadores)
- Multi-plataforma: PC, Mobile (Android/iOS), WebGL
- Mecánicas expandidas (fichajes, entrenamiento, diálogos)

**¿Hay que reescribir todo?** Sí, obligatoriamente. TypeScript no corre en Unity. Pero la lógica del engine (1.500 líneas) es un *port* directo a C# — mismos algoritmos, mismos datos, equivalencia 1:1. El trabajo nuevo es la capa visual y UI.

---

## Decisiones de arquitectura

| Decisión | Elección | Razón |
|----------|----------|-------|
| Unity version | **2022.3 LTS** | Soporte mobile/WebGL estable, LTS = menos bugs |
| Render pipeline | **URP** | Necesario para multi-plataforma óptima |
| UI system | **Unity UI Toolkit** (USS/UXML) | Moderno, responsive, mejor para mobile |
| Datos estáticos | **ScriptableObjects** | Equipos, jugadores archivados sin código |
| Arquitectura código | **Service Locator + ScriptableObjects** | Simple, sin frameworks complejos |
| Save system | **JSON + Application.persistentDataPath** | Portátil, legible, sin deps externas |

---

## Estado actual

| Fase | Estado | Archivos |
|------|--------|----------|
| Fase 1 — Setup Unity | ⏳ Pendiente (requiere Unity Hub) | — |
| Fase 2 — Port Engine C# | ✅ Completado | `UnityAssets/Scripts/Engine/` |
| Fase 3 — Sistema de datos | ✅ Completado (parcial) | `UnityAssets/Scripts/Data/GameSaveData.cs` |
| Fase 4 — Visualización 2D | ⏳ Pendiente | — |
| Fase 5 — UI / Pantallas | ⏳ Pendiente | — |
| Fase 6 — Mecánicas expandidas | ⏳ Pendiente | — |
| Fase 7 — Multi-plataforma | ⏳ Pendiente | — |

### Scripts C# ya creados (listos para copiar a Unity)

```
UnityAssets/Scripts/
├── Engine/
│   ├── GameTypes.cs          ← enums + clases de datos (types.ts)
│   ├── DatabaseData.cs       ← equipos, jugadores, constantes (database.ts)
│   ├── PlayerService.cs      ← creación y actualización jugador (player.ts)
│   ├── DecisionEngine.cs     ← resolución de decisiones (decision.ts)
│   ├── MatchEngine.cs        ← simulación de partido (match.ts)
│   ├── EventsEngine.cs       ← eventos de carrera (events.ts)
│   ├── CompetitionEngine.cs  ← liga, copa, ascensos (competition.ts)
│   └── CareerEngine.cs       ← orquestador temporada/carrera (career.ts)
└── Data/
    └── GameSaveData.cs       ← save/load JSON en persistentDataPath
```

---

## Fases de implementación

### Fase 1 — Setup Unity (1-2 días) ⏳

- Instalar Unity Hub → Unity 2022.3 LTS
- Nuevo proyecto: plantilla **2D (URP)**
- Instalar packages: TextMeshPro, Input System, DOTween
- Crear escenas: `MainMenu`, `CareerHub`, `Match`, `SeasonSummary`
- Copiar `UnityAssets/Scripts/` → `Assets/Scripts/`
- Crear `GameManager.cs` singleton (template en `UnityAssets/README-Unity-Setup.md`)

Estructura de carpetas Unity:
```
Assets/
├── Scripts/
│   ├── Engine/         ← port de engine/ (ya creados)
│   ├── UI/             ← controllers de pantallas
│   ├── Match/          ← visualización 2D
│   └── Data/           ← ScriptableObjects
├── Prefabs/
├── Scenes/
├── Sprites/
└── UI/
```

### Fase 2 — Port del Engine a C# ✅ COMPLETADO

Port 1:1 de los módulos TypeScript → C# estático. Lógica 100% portada.

### Fase 3 — Sistema de datos (1-2 días) ⏳ parcial

- [x] `GameSaveData.cs` — Save/Load JSON
- [ ] `TeamSO.cs` — ScriptableObject por equipo (nombre, división, prestige, colores)
- [ ] `PlayerArchetypeSO.cs` — arquetipos de stats iniciales
- [ ] `GameConfigSO.cs` — constantes del juego

### Fase 4 — Visualización 2D del partido (5-7 días) ⏳

- **Campo:** Sprite top-down del campo de fútbol (Asset Store gratuito)
- **Jugadores:** Sprites circulares con número/color de equipo
- **`MatchVisualizer.cs`:** Lee eventos del `MatchEngine` y los anima
  - Movimiento de jugadores por el campo durante cada turno
  - Animación de GOL (jugador celebra, efecto de balón)
  - Flash visual cuando ocurre decisión del jugador
- **`DecisionUI.cs`:** Panel de 3 botones que aparece en cada turno
- **`MatchCamera.cs`:** Cámara fija top-down, adapta aspect ratio

### Fase 5 — UI / Pantallas (5-7 días) ⏳

Pantallas con UI Toolkit (UXML + USS):

| Pantalla | Contenido |
|----------|-----------|
| **MainMenu** | Logo, Nueva Carrera, Continuar, Ajustes |
| **CareerHub** | Stats del jugador, próximo partido, botones de acción |
| **MatchScreen** | Campo 2D + log de eventos + panel de decisión |
| **SeasonSummary** | Tabla, premios, stats de temporada |
| **PlayerStats** | Desglose completo de atributos (radar chart opcional) |
| **History** | Historial de temporadas anteriores |

Mobile: layouts verticales, botones táctiles grandes (min 44px).

### Fase 6 — Mecánicas expandidas (7-10 días) ⏳

1. **Mercado de fichajes**
   - Ofertas de otros equipos al finalizar temporada
   - Negociación de contrato (sueldo, duración, cláusula)
   - Sistema de agente (acepta/rechaza ofertas)

2. **Sistema de entrenamiento**
   - Entre partidos: elegir área a entrenar (técnica / física / táctica)
   - Coste: fatiga. Ganancia: +stat pequeño acumulativo

3. **Diálogos con personajes**
   - Entrenador, director deportivo, compañeros
   - Árbol de diálogo simple con 2-3 opciones por conversación
   - Afectan moral, confianza entrenador, vestuario

4. **Más eventos de carrera**
   - Entrevistas de prensa (con elecciones que afectan reputación)
   - Lesiones con minijuego de recuperación
   - Rumores de traspaso

### Fase 7 — Multi-plataforma & polish (3-5 días) ⏳

- **Android:** AndroidManifest, iconos, resoluciones, Input System táctil
- **iOS:** Xcode setup, provisioning profiles
- **WebGL:** Compresión Brotli, template HTML personalizado
- **PC:** Build estándar Windows/Mac/Linux
- Audio: SFX básicos (gol, fallo, celebración), música de fondo loop

---

## Estimación total

| Fase | Días estimados | Estado |
|------|---------------|--------|
| Setup | 1-2 | ⏳ |
| Port engine C# | 3-5 | ✅ |
| Sistema de datos | 1-2 | 🔄 parcial |
| Visualización 2D | 5-7 | ⏳ |
| UI/Pantallas | 5-7 | ⏳ |
| Mecánicas nuevas | 7-10 | ⏳ |
| Multi-plataforma | 3-5 | ⏳ |
| **RESTANTE** | **~24-36 días** | |

---

## Respuesta a la pregunta original

**¿Hay que reescribir todo?**
- **Lógica del juego (engine):** Port directo, ~80% equivalente 1:1 en C#. No se rediseña, se traduce. ✅ Ya hecho.
- **UI/Visual:** Reescritura total — React no existe en Unity. Diseño nuevo, no reproducción de código.
- **Datos (equipos, stats):** Se mueven a ScriptableObjects — mismos valores, formato diferente.

**Ratio reutilización conceptual:** ~60% (la lógica). **Ratio reutilización de código:** 0% (TypeScript ≠ C#).

---

## Verificación

1. Tests unitarios en C# (`EditMode Tests`) para `MatchEngine`, `DecisionEngine`, `CompetitionEngine`
2. Simular 1 temporada completa en Editor sin UI — verificar mismos resultados estadísticos que la versión web
3. Build a cada plataforma y probar decisiones de partido en táctil vs teclado
4. Profiler de Unity para detectar GC spikes durante simulación de temporada

# Modelos 3D — pipeline manual con Meshy (plan gratuito)

FutbolRPG ya usa modelos 3D reales en varios sitios, con dos orígenes distintos:

- **Procedural a mano** (`Dice3D.tsx`, `TrophyScene.tsx`, `FieldScene.tsx`): geometría de Three.js pura, sin ningún archivo — el "look" low-poly/flatShading nace del propio código.
- **Paquete externo** (`player/character-h.glb`): modelo gratuito de Kenney (CC0), cargado con `useGLTF`.

Meshy es un **tercer origen**, para piezas puntuales que no vale la pena tallar a mano (un trofeo por competición, un balón con más detalle, una insignia por tipo de evento) pero que sí conviene generar en el mismo lenguaje visual low-poly que ya tiene el resto — no fotorrealista.

## Por qué es manual (plan gratuito)

El plan gratuito de Meshy (100 créditos/mes) no da acceso a su API ni a su servidor MCP — eso exige el plan Pro (20 $/mes). Así que el flujo es: generar en la web de Meshy a mano, exportar, y traer el archivo aquí. Nada de esto bloquea el resto del pipeline: una vez el archivo está en `public/models/`, el código lo consume exactamente igual que si viniera de una API.

## Ajustes a usar en meshy.ai al generar (para no gastar créditos en un resultado que no sirva)

1. **Modo Low Poly activado**, con un objetivo de **3.000–8.000 triángulos** — encaja con el resto de la app (mobile-first, nada fotorrealista) y pesa poco en una red móvil.
2. **Textura de 1K** como máximo (no 2K/4K) — no hace falta más para un objeto pequeño en pantalla, y reduce el peso del `.glb`.
3. **Exportar en formato GLB** (no GLTF+bin+texturas sueltas, ni FBX, ni OBJ) — es el único formato que `@react-three/drei` (`useGLTF`) lee directamente sin conversión, y empaqueta texturas + geometría en un solo archivo.
4. Si el resultado sale con textura PBR "realista" y no combina con el flatShading del resto: probar primero "Style: Cartoon/Stylized" en el generador antes de gastar otro crédito en texturizar; si aun así no cuaja, se puede ignorar la textura del material en el código y quedarse solo con la geometría (`material.map = null`, aplicar un color plano de `TIER_HEX` — exactamente lo que ya hace `TrophyScene.tsx` con `flatShading`).

## Dónde va cada archivo

```
public/models/
  player/            → ya existe (Kenney)
  dice/              → dado(s) — ver dice-d20 en models-3d.ts
  trophies/          → un .glb por competición (liga/copa/europa/seleccion)
  match/             → balón, portería, elementos de campo
  events/            → insignias por tipo de evento de temporada
```

Nombra el archivo en minúsculas con guiones, sin espacios: `d20-arcade.glb`, `trophy-copa.glb`, `ball-classic.glb`.

## Cómo se conecta al código (una sola fuente de verdad)

Todo modelo, exista ya o no, se declara en **`src/lib/models-3d.ts`** — no hardcodees rutas sueltas dentro de un componente. Cada entrada tiene un flag `ready`: mientras no hayas puesto el archivo real, `ready: false` y el componente sigue usando su versión procedural actual (nadie ve una ruta rota). Para activar un modelo nuevo:

1. Exporta el `.glb` desde meshy.ai con los ajustes de arriba.
2. Cópialo a la subcarpeta que le toque, con el nombre de la tabla de arriba.
3. En `models-3d.ts`, cambia esa entrada a `ready: true`.
4. Si el componente todavía no sabe leer esa entrada (solo `dice-d20` lo hace de momento, ver `Dice3D.tsx`), pídemelo y lo conecto siguiendo el mismo patrón.

No hace falta tocar nada más — ni añadir dependencias, ni escribir loaders nuevos.

## Licencia

Cualquier modelo de esta carpeta generado con Meshy (plan gratuito) queda bajo **CC BY 4.0**: se puede usar comercialmente, pero exige dar crédito a Meshy. Ver `MESHY-LICENSE.txt` en esta misma carpeta — no hace falta un archivo de licencia por modelo, esa nota cubre a todos los que vengan de Meshy (se distinguen por `source: "meshy"` en `models-3d.ts`).

Si alguna vez generas un modelo a partir de una imagen de referencia que no sea tuya (no de un prompt de texto), el uso comercial de ese modelo concreto depende de que tengas derecho sobre esa imagen — revísalo antes de activarlo (`ready: true`).

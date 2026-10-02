# FutbolRPG — Guía de lanzamiento y crecimiento

Documento de trabajo para ir tachando por fases. Cuatro bloques: (1) Google login en producción,
(2) monetización con anuncios, (3) estudio de comportamiento de usuario, (4) marca y redes.
Los datos concretos de terceros (umbrales de redes publicitarias, límites de planes gratuitos)
cambian a menudo: **verifícalos en la web oficial antes de decidir**.

Orden recomendado: 1 → 3 → 4 → 2. Medir y tener tráfico antes de poner anuncios; los anuncios
sin tráfico no pagan nada y empeoran la primera impresión.

---

## 0. Aviso crítico antes de monetizar: Vercel Hobby

El plan **Hobby de Vercel es solo para uso personal no comercial**. Mostrar anuncios o cobrar
(Stripe/premium) es uso comercial. Antes de activar ADs hay que elegir una de estas:

| Opción | Coste aprox. | Nota |
|---|---|---|
| Vercel Pro | ~20 USD/mes por usuario | Lo más simple, sin migrar nada |
| Cloudflare Pages/Workers | gratis/bajo | Requiere adaptar el despliegue de Next.js |
| Netlify / Railway / VPS | variable | Más trabajo de migración |

Decisión pendiente: ______. Hasta que se tome, no activar ADs ni Stripe en producción.

---

## 1. Google login en producción

El código ya está listo (`src/lib/auth.ts`, botones en `login` y `register`). Falta configuración.

### 1.1 Credenciales en Google Cloud
- [ ] Crear proyecto en Google Cloud Console.
- [ ] **Pantalla de consentimiento OAuth** → tipo Externo. Nombre de app, logo, email de soporte,
      dominio de la app, enlaces a **política de privacidad** y **términos** (obligatorios para publicar).
- [ ] Scopes: solo los básicos (`openid`, `email`, `profile`). No pedir más: evita la verificación larga.
- [ ] **Credenciales → ID de cliente OAuth → Aplicación web**.
  - Redirect URI local: `http://localhost:3000/api/auth/callback/google`
  - Redirect URI prod: `https://TU-DOMINIO/api/auth/callback/google`
  - Orígenes JS: `http://localhost:3000` y `https://TU-DOMINIO`
- [ ] **Publicar la app** (pasar de "Testing" a "In production"). En Testing solo entran los
      usuarios de prueba y los tokens caducan a los 7 días. Con scopes básicos no exige revisión pesada.

### 1.2 Variables de entorno
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BETTER_AUTH_URL=https://TU-DOMINIO
NEXT_PUBLIC_BETTER_AUTH_URL=https://TU-DOMINIO
BETTER_AUTH_SECRET=<ya existente>
```
- [ ] Añadirlas en local (`.env.local`) y en el panel del hosting (Production **y** Preview si se usa).
- [ ] Redeploy. `NEXT_PUBLIC_*` se incrusta en el build: sin redeploy no se aplica.
- [ ] Si se cambia de dominio (o se pone dominio propio), **añadir la nueva redirect URI en Google**.

### 1.3 Decisiones de producto a cerrar
- [ ] **Vinculación de cuentas**: qué pasa si alguien ya tiene email+contraseña y entra con Google
      con el mismo email. Configurar `account.accountLinking` en Better Auth
      (`trustedProviders: ["google"]`) para vincular automáticamente, ya que Google verifica el email.
- [ ] **Invitado → Google**: comprobar que la carrera del invitado se conserva (`onLinkAccount` /
      `migrarDatosDeInvitado`). Probar el flujo completo y añadir un test e2e.
- [ ] `callbackURL` del botón de registro lleva a `/create-player`; si el usuario ya tenía jugador
      debería ir a `/dashboard`. Revisar.

### 1.4 Prueba antes de dar por buena
1. Cuenta Google nueva → entra → crea jugador.
2. Misma cuenta, cerrar sesión, volver a entrar → mismo jugador.
3. Email que ya existe con contraseña → comportamiento esperado.
4. Invitado que juega una temporada y entra con Google → conserva la carrera.
5. En móvil (Safari iOS y Chrome Android): el redirect funciona y no se queda en blanco.

---

## 2. Monetización con anuncios

### 2.1 Requisitos legales y técnicos (previos a cualquier red)
- [ ] **Política de privacidad y de cookies** reales (qué se recoge, con quién se comparte, derechos RGPD).
- [ ] **Banner de consentimiento (CMP)**. Para servir anuncios personalizados en el EEE/Reino Unido
      se exige un CMP certificado por Google/TCF (p. ej. el de Google, Cookiebot, Didomi, Funding Choices).
      Sin consentimiento, solo anuncios no personalizados.
- [ ] Los scripts de analítica y anuncios **no se cargan hasta que el usuario consiente**.
- [ ] Fichero `ads.txt` en la raíz (`public/ads.txt`) con la línea que te dé la red.
- [ ] Avisar a menores: el juego puede atraer público joven. Revisar la política de la red sobre
      contenido dirigido a menores antes de activar anuncios personalizados.

### 2.2 Qué red usar (de menos a más exigente)
| Etapa | Opción | Comentario |
|---|---|---|
| Arranque | **Google AdSense** | Fácil de pedir, pero rechaza sitios con "poco contenido útil": una app tras login con casi nada de texto público suele suspender. Hace falta contenido público (guías, blog, rankings). |
| Juegos | Redes de juegos (Google AdSense for Games / H5, AdinPlay, Playwire, etc.) | Formatos pensados para juegos, incluidos anuncios con recompensa. Pedir condiciones y mínimos. |
| Crecimiento | Ezoic, Mediavine, Raptive | Exigen volumen mínimo de sesiones/páginas vistas; pagan mucho mejor. Verifica umbrales vigentes. |

### 2.3 Dónde colocar anuncios sin destruir el juego
Regla: **nunca interrumpir una decisión ni un partido**. El juego vive del flujo de tensión.
- ✅ Pantalla de resumen post-partido / resumen de temporada (momento de calma).
- ✅ Ranking, actividad, mercado (páginas de lectura).
- ✅ Banner discreto en dashboard, tamaño reservado (sin saltos de layout).
- ✅ **Anuncio con recompensa opcional**: "ver un anuncio para repetir un dado / recuperar energía /
      bonus de XP". Es el formato que mejor encaja en un RPG y el usuario lo elige.
- ❌ Intersticiales a mitad de partido, popups al entrar, anuncios sobre botones de opción.

### 2.4 Sinergia con Premium (ya existe `isPremium` y Stripe)
- Premium = **sin anuncios** (es un argumento de venta real).
- Condicionar la carga del script de anuncios a `!user.isPremium` en un único componente
  (`<AdSlot />`), no repartido por las páginas. Mismo criterio que `src/lib/premium.ts`.
- Medir si los anuncios empujan o frenan la conversión a Premium.

### 2.5 Rendimiento
La app usa three.js y escenas pesadas. Los anuncios añaden JS y desplazamientos de layout.
- [ ] Reservar altura fija de cada hueco (evita CLS).
- [ ] Carga diferida (`lazy`) de los anuncios; no en la primera pantalla.
- [ ] Medir Core Web Vitals antes y después. Si empeoran, quitar huecos.

### 2.6 Qué esperar
El ingreso por visita es pequeño (céntimos por mil impresiones, muy variable por país y formato).
Con poco tráfico el ingreso será simbólico: **tráfico primero**. Hacer una proyección propia:
`visitas/mes × páginas por visita × anuncios por página × RPM / 1000`.

---

## 3. Estudio de comportamiento de usuario

### 3.1 Herramientas (todas con plan gratuito, verificar límites)
| Necesidad | Herramienta |
|---|---|
| Embudos, retención, eventos propios, feature flags | **PostHog** (cloud UE para RGPD) |
| Mapas de calor y grabaciones de sesión | **Microsoft Clarity** (gratis) o grabaciones de PostHog |
| Tráfico, fuentes, SEO | **Google Search Console** + analítica básica (GA4 o Vercel/Cloudflare Analytics) |
| Rendimiento real | Vercel Speed Insights / web-vitals |
| Errores | Sentry (gratis para volumen bajo) |

Instalar **una** herramienta principal (PostHog) y una de sesiones (Clarity). No amontonar cinco.
Todo detrás del banner de consentimiento. Enmascarar campos sensibles en las grabaciones.

### 3.2 El embudo de FutbolRPG (eventos a registrar)
```
visita landing
  → clic "Jugar" / "Continuar como invitado" / "Google"      (login_method)
  → registro o sesión creada                                  (signup_completed)
  → jugador creado                                            (player_created)
  → primer partido iniciado / terminado                       (match_started, match_finished)
  → primera temporada completada                              (season_completed)
  → vuelve al día siguiente (D1) / a los 7 días (D7)          (retención)
  → invita a alguien / comparte su carrera                    (share_clicked)
  → compra Premium                                            (premium_purchased)
```
Propiedades útiles en cada evento: `isGuest`, fuente/UTM, dispositivo, número de temporada, posición del jugador.

### 3.3 Métricas que importan (y sus preguntas)
| Métrica | Pregunta que responde |
|---|---|
| % que llega a `player_created` | ¿El registro o la creación de jugador es demasiado larga? |
| % que termina el primer partido | ¿El tutorial/primer partido engancha? |
| Retención D1 / D7 / D30 | ¿Hay motivo para volver? (el dato más importante) |
| Invitados que se convierten en registrados | ¿Cuándo es buen momento para pedir cuenta? |
| Sesiones por usuario y duración | ¿Se juega en sesiones cortas (móvil) o largas? |
| Dónde se abandona (pantalla de salida) | Cuello de botella concreto |
| Ingreso por usuario (ads + premium) | ¿Compensa el anuncio frente al riesgo de abandono? |

### 3.4 Método de trabajo (ciclo quincenal)
1. Mirar el embudo, encontrar **la mayor caída**.
2. Ver 10–15 grabaciones de sesiones que abandonan en ese punto.
3. Formular una hipótesis ("el formulario pide demasiado") y un cambio pequeño.
4. Lanzar con feature flag / A/B (PostHog) a una parte de usuarios.
5. Medir 1–2 semanas, quedarse con lo que mejora, anotar el resultado.
6. Entrevistas: preguntar a 5–10 jugadores reales (Discord, encuesta de 3 preguntas al terminar la primera temporada).

### 3.5 Privacidad y RGPD (no opcional)
- Consentimiento previo, política actualizada con las herramientas usadas.
- Región UE en proveedores cuando sea posible; no enviar emails ni datos personales como propiedades de eventos.
- Respetar "Do Not Track" / retirada de consentimiento.
- Si hay menores entre los usuarios, evitar perfiles publicitarios.

---

## 4. Tráfico: SEO y bucles virales

El juego está tras login y casi todo son client components: **Google no ve nada**. Para tener
muchas visitas hay que crear superficie pública:

### 4.1 SEO
- [ ] Landing pública con texto real (qué es, cómo se juega, capturas) y metadatos/Open Graph.
- [ ] Palabras clave en español (y catalán si aplica): "simulador de carrera de futbolista",
      "juego de fútbol por navegador", "modo carrera online gratis". Investigar con Search Console + Google Trends.
- [ ] **Blog/guías** públicas: "cómo subir de división", "mejores posiciones", "guía del mercado".
      Sirven a la vez para SEO y para que AdSense y similares acepten el sitio.
- [ ] **Páginas públicas indexables**: ranking, perfil público de jugador, hall of fame. Cada
      carrera destacada es una URL que posiciona.
- [ ] `sitemap.xml`, `robots.txt`, datos estructurados, imagen OG dinámica (`next/og`).

### 4.2 Bucles virales (lo que realmente escala)
- **Tarjeta de carrera compartible**: imagen OG autogenerada con el jugador, estadísticas y gloria
  ("Mi delantero llegó a Primera con 87 de media"). Botón "Compartir" tras cada hito.
- **Retos y rivalidad**: enlace "supera mi carrera", ranking entre amigos.
- **Códigos de invitación** con recompensa para ambos.
- **Resumen de temporada** pensado para captura de pantalla (diseño bonito, marca visible).
- Notificaciones/emails de retorno (con consentimiento): "Empieza la nueva temporada", "Te han adelantado en el ranking".

---

## 5. Marca, publicidad y redes

### 5.1 Base de marca (hacer primero, en un documento de una página)
- **Propuesta**: ¿qué sensación vende FutbolRPG? Ej.: *"Tu leyenda, decidida por los dados"*.
- **Público**: jugadores de FIFA/FC Career y Football Manager, 16–35 años, hispanohablantes primero.
- **Tono**: cercano, de vestuario, con humor; épico en los hitos (títulos, fichajes).
- **Identidad**: nombre/logo definitivo, paleta, tipografía, estilo de ilustración, mascota o motivo
  recurrente (el dado). Ya hay estilo visual en el juego: extraerlo en una mini guía de estilo.
- **Reglas de uso de escudos/equipos reales**: evitar logos y nombres con derechos de autor/marca
  (la identidad visual debe ser propia). Riesgo legal real al hacer publicidad.

### 5.2 Pilares de contenido (alimentan el proyecto de hyperframes)
1. **Carreras reales de la comunidad**: "Esta carrera pasó de Tercera a Balón de Oro" (vídeo 20–30 s
   con datos del jugador).
2. **Momentos de dados**: el penalti decisivo, el 1 contra 1 fallido. Clips cortos tipo highlight.
3. **Ranking semanal**: top 5 con animación.
4. **Tutorial/consejos**: "3 errores que arruinan tu carrera".
5. **Novedades y changelog** presentados como "fichajes" o "parches".
6. **Comunidad**: reacciones, retos, encuestas.

### 5.3 Canales (en orden de prioridad)
| Canal | Para qué | Cadencia inicial |
|---|---|---|
| **TikTok / Reels / Shorts** | Descubrimiento, vídeo corto vertical | 3–5/semana (mismo vídeo en los tres) |
| **Discord** | Comunidad, feedback, retención | Mantener vivo, eventos semanales |
| **Reddit** | Nichos de fútbol/simulación | Participar de verdad; leer reglas de autopromoción |
| **X (Twitter)** | Noticias, memes, ligar con eventos reales | Diario, ligero |
| **Instagram** | Imagen de marca, stories con retos | 2–3/semana |
| **YouTube (largo)** | Devlogs, "mi carrera en directo" | Cuando haya recursos |

Empezar con **2 canales** (TikTok/Reels + Discord). Mejor constante y bien hecho que presente en todo.

### 5.4 Calendario ligado al fútbol real
Aprovechar picos de atención: inicio de liga, mercado de fichajes, Champions, Balón de Oro, Navidad,
finales. Publicar contenido temático con 1–2 semanas de preparación.

### 5.5 Publicidad de pago (cuando haya retención demostrada)
- **No pagar por tráfico hasta que D1/D7 sean sanos**: si los jugadores no vuelven, la publicidad solo quema dinero.
- Presupuesto de prueba pequeño (p. ej. 5–10 €/día), una plataforma (TikTok Ads o Meta), 3–4 creatividades.
- Objetivo: **coste por jugador creado** (`player_created`), no por clic. Comparar con el valor
  esperado por usuario (ads + premium) antes de escalar.
- Enlaces con UTM en todo para saber qué campaña trae qué usuarios.
- **Creadores/streamers pequeños**: ofrecer premium gratis o código a 10–20 microcreadores de fútbol
  suele rendir más que anuncios, y se mide con códigos.

### 5.6 Relación con el proyecto de hyperframes
Proyecto aparte, pero este repo debe **exponerle datos**: un endpoint o script que devuelva
los hitos compartibles (carreras destacadas, ranking semanal, changelog) para que las plantillas
de vídeo se rellenen automáticamente. Dejar anotado qué datos hacen falta cuando se monte.

---

## 6. Hoja de ruta por fases

| Fase | Objetivo | Entregables |
|---|---|---|
| **A. Base legal y técnica** | Poder lanzar sin riesgos | Decidir hosting (§0), Google login en prod (§1), política de privacidad/cookies, CMP |
| **B. Medir** | Saber qué pasa | PostHog + Clarity, eventos del embudo (§3.2), panel semanal |
| **C. Visibilidad** | Primeras visitas | Landing pública, SEO básico, guías, tarjeta de carrera compartible, Discord, 2 canales sociales |
| **D. Retención** | Que vuelvan | Mejoras guiadas por datos, emails/notificaciones, eventos semanales |
| **E. Monetizar** | Ingresos | Anuncios con recompensa + banners discretos, Premium sin anuncios, red mejor al subir el tráfico |
| **F. Escalar** | Más tráfico | Creadores, publicidad de pago con coste por jugador medido |

## 7. Panel semanal (10 minutos)
Visitas · registros · jugadores creados · % primera temporada · D1/D7 · ingresos ads · conversiones Premium ·
vídeos publicados y el que mejor funcionó · 3 comentarios de jugadores · **una** mejora para la semana siguiente.

## 8. Pendientes que necesito decidir
- [ ] Hosting para uso comercial (§0).
- [ ] Dominio propio (mejora marca, SEO y confianza de Google/redes publicitarias).
- [ ] Nombre/logo definitivo y revisión de derechos (escudos, nombres reales).
- [ ] Idiomas objetivo (español, catalán, inglés).
- [ ] Presupuesto mensual para herramientas y publicidad.

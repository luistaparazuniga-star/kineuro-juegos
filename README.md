# Kineuro_juegos

Catálogo de juegos de fisioterapia y salud psicológica de Kineurog: cada
juego usa la cámara del celular/tablet como sensor de movimiento. Toda la
app —perfiles, catálogo y los 10 juegos— vive en una sola página
(`index.html` en la raíz), pensada para publicarse en `games.kineurog.com`.
Cada juego mantiene su propia mecánica, puntaje y estadísticas de forma
independiente (ver [Perfiles, puntos y logros](#perfiles-puntos-y-logros));
lo único compartido es la "carcasa" de cámara/HUD/resultados.

Antes de jugar, cada paciente crea (o elige) su **perfil**: queda guardado
en el dispositivo, acumula puntos por sesión, sube de nivel, desbloquea
logros y nuevos juegos. La lógica de perfiles/puntos/logros vive en
[`shared/js/profiles.js`](shared/js/profiles.js) y es la que consultan
todos los juegos al terminar una sesión — es el punto de partida para,
más adelante, mover esos datos a una base real y poder comparar
estadísticas entre pacientes.

## Juegos

- [`atrapa-estrellas`](atrapa-estrellas) — alcance de brazo/hombro:
  el paciente atrapa estrellas que aparecen alrededor de su cuerpo.
  Nivel 1.
- [`topos-traviesos`](topos-traviesos) — reflejos y control de impulsos:
  golpear topos que aparecen y desaparecen, evitando las bombas. Nivel 1.
- [`secuencia-veloz`](secuencia-veloz) — atención y coordinación en orden:
  tocar números en secuencia (1, 2, 3…) lo más rápido posible. Nivel 2.
- [`estatua`](estatua) — equilibrio y control postural: se mueve
  libremente y se congela por completo cuando se le indica; mide qué tan
  quieto se mantiene. Útil también para control de impulsos (TDAH). Nivel 2.
- [`derriba-conos`](derriba-conos) — desplazamientos laterales rápidos:
  moverse de un lado a otro para derribar conos que aparecen en los
  extremos. Nivel 2.
- [`ritmo-activo`](ritmo-activo) — resistencia y movimiento continuo:
  cruzar de un lado a otro sin parar para sumar repeticiones. Nivel 3.
- [`esquiva-rayos`](esquiva-rayos) — agilidad y reacción de todo el
  cuerpo: ubicarse dentro del hueco de un rayo antes de que se dispare.
  Nivel 3.
- [`rebote-total`](rebote-total) — reacción visomotora estilo arcade:
  controlar una barra con el cuerpo para no dejar caer la pelota. Nivel 3.
- [`salto-del-canguro`](salto-del-canguro) — salto y coordinación de
  piernas: saltar cuando se indica, dentro de la ventana de tiempo. Nivel 4.
- [`patada-certera`](patada-certera) — coordinación de piernas y brazos:
  objetivos altos con la mano, objetivos bajos levantando la rodilla.
  Nivel 4.

Cada carpeta de juego solo tiene un `js/game.js` (la mecánica: spawn de
objetivos, colisiones, puntaje) que la app importa dinámicamente según la
entrada de ese juego en `shared/js/profiles.js` (`GAMES`). Todo lo demás —
cámara, countdown, HUD, pantalla de resultados, sonido/música, presets por
tipo de paciente— es la "carcasa" común en [`shared/js`](shared/js) y
[`shared/css`](shared/css); ver especialmente `gameShell.js` (el runner) y
`app.js` (perfiles + catálogo + selección de juego).

## Perfiles, puntos y logros

- Perfil: nombre, avatar, tipo de paciente (niño / adulto / adulto mayor /
  deportista) y un objetivo u observación libre (ej. "rehabilitación de
  hombro").
- Cada sesión jugada otorga puntos según precisión y puntaje; los puntos
  suben de nivel al perfil, y cada juego define desde qué nivel está
  desbloqueado (`unlockLevel` en `shared/js/profiles.js`).
- Los logros (`shared/js/profiles.js`, objeto `ACHIEVEMENTS`) se calculan
  sobre las estadísticas acumuladas del perfil — agregar uno nuevo es
  sumar una entrada con su condición, no tocar cada juego.
- Todo esto hoy se guarda en `localStorage` (por dispositivo). El módulo
  está separado a propósito para que, cuando haga falta ver el progreso
  de un paciente desde cualquier dispositivo o cruzar estadísticas entre
  varios, el cambio sea reemplazar las funciones de `profiles.js` por
  llamadas a una API — sin tocar los juegos.

## Publicar en games.kineurog.com

El dominio `kineurog.com` está en Squarespace, que no permite redirigir una
subcarpeta (`kineurog.com/games/...`) hacia otro servidor. La forma simple
es usar un **subdominio** (`games.kineurog.com`), que sí se puede conectar
a GitHub Pages o Vercel.

### 1. GitHub Pages — activar (una sola vez)

En este repo: **Settings → Pages → Build and deployment → Source** →
"Deploy from a branch" → **Branch**: `main`, carpeta `/(root)` → **Save**.
El archivo `CNAME` en la raíz del repo ya tiene `games.kineurog.com`
cargado, así que GitHub va a ofrecer ese dominio personalizado
automáticamente.

### 2. Squarespace — agregar el subdominio (una sola vez)

En el panel de Squarespace: **Settings → Domains → kineurog.com → DNS
Settings** → **Add Record**:

| Tipo  | Host    | Datos                        |
|-------|---------|-------------------------------|
| CNAME | `games` | `kineuroecosystem.github.io.` |

(Si en cambio se despliega con Vercel, el mismo registro CNAME apunta a
`cname.vercel-dns.com` en lugar de `kineuroecosystem.github.io.` — Vercel
muestra el valor exacto al agregar el dominio en el proyecto.)

## Probar localmente

```bash
python3 -m http.server 8080
# abrir http://localhost:8080
```

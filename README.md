# Kineuro_juegos

Catálogo de juegos de fisioterapia y salud psicológica de Kineurog: cada
juego usa la cámara del celular/tablet como sensor de movimiento y vive en
su propia carpeta en la raíz de este repo, pensado para publicarse en
`games.kineurog.com`.

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
  Desbloqueado desde el nivel 1.
- [`estatua`](estatua) — equilibrio y control postural: se mueve
  libremente y se congela por completo cuando se le indica; mide qué tan
  quieto se mantiene. Útil también para control de impulsos (TDAH).
  Se desbloquea en el nivel 2.

Cada carpeta de juego tiene su propio README con el detalle técnico.

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

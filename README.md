# Kineuro_juegos

Colección de juegos de fisioterapia de Kineurog. Cada juego vive en su
propia carpeta en la raíz de este repo y es una app web estática (sin
build), pensada para publicarse en `games.kineurog.com/<nombre-del-juego>`.

## Juegos

- [`atrapa-estrellas`](atrapa-estrellas) — usa la cámara del celular/tablet
  como sensor de movimiento: el paciente alcanza estrellas en pantalla
  moviendo los brazos. Ver el README de esa carpeta para el detalle.

## Publicar en games.kineurog.com

El dominio `kineurog.com` está en Squarespace, que no permite redirigir una
subcarpeta (`kineurog.com/games/...`) hacia otro servidor. La forma simple
es usar un **subdominio** (`games.kineurog.com`), que si se puede conectar
a GitHub Pages. Son dos pasos, uno en cada lado:

### 1. GitHub — activar Pages (una sola vez)

En este repo: **Settings → Pages → Build and deployment → Source** →
"Deploy from a branch" → **Branch**: `main`, carpeta `/(root)` → **Save**.
El archivo `CNAME` en la raíz del repo ya tiene `games.kineurog.com`
cargado, así que GitHub va a ofrecer ese dominio personalizado
automáticamente (o se puede escribir a mano en el campo "Custom domain" de
esa misma pantalla).

### 2. Squarespace — agregar el subdominio (una sola vez)

En el panel de Squarespace: **Settings → Domains → kineurog.com → DNS
Settings** (a veces aparece como "Advanced settings") → **Add Record**:

| Tipo  | Host    | Datos                        |
|-------|---------|-------------------------------|
| CNAME | `games` | `kineuroecosystem.github.io.` |

Guardar. La propagación puede tardar unos minutos hasta un par de horas.

Una vez hechos los dos pasos, el juego queda en:
**`https://games.kineurog.com/atrapa-estrellas/`**

(y `https://games.kineurog.com/` queda como portada con el listado de
juegos, para cuando se agreguen más).

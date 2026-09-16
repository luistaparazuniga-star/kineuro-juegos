# Estatua

Juego de equilibrio y control postural. Usa la cámara frontal del
celular/tablet (MediaPipe Pose Landmarker, corre en el navegador, el video
nunca sale del dispositivo) para medir cuánto se mueve el paciente.

Alterna entre dos fases:

- **Moveté** (unos segundos): el paciente se mueve libremente.
- **Quieto** (duración según dificultad): el paciente debe congelarse por
  completo. El juego mide el desplazamiento de nariz, hombros, caderas y
  muñecas cuadro a cuadro; si el movimiento promedio supera la tolerancia
  de la dificultad elegida, la congelada se rompe.

Sirve para dos cosas distintas según el paciente:

- **Equilibrio / control postural** (adulto mayor, post-ACV): mantenerse
  quieto de pie es en sí mismo un ejercicio de estabilidad.
- **Control de impulsos / atención** (niños, TDAH): el "juego de las
  estatuas" clásico, pero medido objetivamente en vez de a ojo.

Ruta pensada: `games.kineurog.com/estatua`.

## Métricas que registra

- Congeladas exitosas / rotas (precisión).
- Racha máxima de congeladas exitosas seguidas.
- Estabilidad promedio (0-100%): qué tan por debajo de la tolerancia se
  mantuvo el movimiento durante las congeladas.

Al terminar la sesión, estos datos se guardan en el perfil activo vía
[`shared/js/profiles.js`](../shared/js/profiles.js).

## Requisitos

- Servir por HTTPS (o `localhost` para pruebas) — los navegadores exigen un
  contexto seguro para `getUserMedia` (acceso a cámara).
- Conexión a internet al iniciar una sesión (descarga el modelo de
  seguimiento corporal desde un CDN la primera vez).

## Probar localmente

```bash
# desde la raíz del repo
python3 -m http.server 8080
# abrir http://localhost:8080, crear/elegir un perfil y tocar la tarjeta
# "Estatua" en el catálogo
```

## Estructura

Este juego (como los otros nueve) no tiene su propia página: vive dentro de
la app de una sola página en la raíz del repo (`index.html` +
[`shared/js/app.js`](../shared/js/app.js) y
[`shared/js/gameShell.js`](../shared/js/gameShell.js)), que se encarga de la
cámara, el countdown, el HUD (incluido el aviso "¡Quieto!/¡Moveté!") y la
pantalla de resultados. Esta carpeta solo contiene la mecánica propia del
juego:

```
js/game.js   Lógica de fases mover/congelar y detección de movimiento.
             Se importa dinámicamente desde el shell (ver la entrada
             "estatua" en shared/js/profiles.js).
```

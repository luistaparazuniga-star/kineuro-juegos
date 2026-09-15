# Atrapa las Estrellas

Juego de fisioterapia que usa la cámara frontal de un celular/tablet como
sensor de movimiento (MediaPipe Pose Landmarker, corre en el navegador, el
video nunca sale del dispositivo). El paciente mueve los brazos para
alcanzar estrellas en pantalla; al final se muestra puntaje, precisión y
amplitud de movimiento alcanzada.

Ruta pensada: `games.kineurog.com/atrapa-estrellas`.

## Requisitos

- Servir por HTTPS (o `localhost` para pruebas) — los navegadores exigen un
  contexto seguro para `getUserMedia` (acceso a cámara).
- Conexión a internet al iniciar una sesión (descarga el modelo de
  seguimiento corporal desde un CDN la primera vez).

## Probar localmente

```bash
cd atrapa-estrellas
python3 -m http.server 8080
# abrir http://localhost:8080
```

## Estructura

```
index.html          Pantallas de la app (menú, juego, resultados)
css/style.css        Estilos, responsive para celular/tablet
js/main.js            Máquina de estados, cámara, loop del juego
js/poseTracker.js     Envoltorio sobre MediaPipe Pose Landmarker
js/landmarks.js       Índices de los puntos del cuerpo (sin dependencias externas)
js/game.js             Lógica del juego: spawn de estrellas, colisiones, puntaje
js/sound.js            Sonidos generados con Web Audio (sin archivos de audio)
```

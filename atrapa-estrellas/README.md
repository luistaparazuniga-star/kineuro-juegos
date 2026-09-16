# Atrapa las Estrellas

Juego de fisioterapia que usa la cámara frontal de un celular/tablet como
sensor de movimiento (MediaPipe Pose Landmarker, corre en el navegador, el
video nunca sale del dispositivo). El paciente mueve los brazos para
alcanzar estrellas en pantalla; al final se muestra puntaje, precisión y
amplitud de movimiento alcanzada.

Este juego (como los otros nueve) no tiene su propia página: vive dentro de
la app de una sola página en la raíz del repo (`index.html` +
[`shared/js/app.js`](../shared/js/app.js) y
[`shared/js/gameShell.js`](../shared/js/gameShell.js)), que se encarga de la
cámara, el countdown, el HUD y la pantalla de resultados. Esta carpeta solo
contiene la mecánica propia del juego:

```
js/game.js   Lógica del juego: spawn de estrellas, colisiones, puntaje,
             combos, partículas. Se importa dinámicamente desde el shell
             (ver la entrada "atrapa-estrellas" en shared/js/profiles.js).
```

## Requisitos

- Servir por HTTPS (o `localhost` para pruebas) — los navegadores exigen un
  contexto seguro para `getUserMedia` (acceso a cámara).
- Conexión a internet al iniciar una sesión (descarga el modelo de
  seguimiento corporal desde un CDN la primera vez).

Al terminar la sesión, el puntaje se guarda en el perfil activo vía
[`shared/js/profiles.js`](../shared/js/profiles.js), que otorga puntos y
puede desbloquear logros/nivel.

## Probar localmente

```bash
# desde la raíz del repo
python3 -m http.server 8080
# abrir http://localhost:8080, crear/elegir un perfil y tocar la tarjeta
# "Atrapa las Estrellas" en el catálogo
```

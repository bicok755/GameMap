import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  get,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";

// Configuración de Firebase (rellena con tus credenciales reales si las tienes)
const firebaseConfig = {
  // Tu configuración aquí
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Lógica del juego (puedes adaptar esto o poner el código que ya tenías)
const mapa = document.getElementById("mapa");
const size = 8;
let jugador = { x: 0, y: 0 };

function renderMapa() {
  mapa.innerHTML = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const celda = document.createElement("div");
      celda.className = "celda cesped";
      if (x === jugador.x && y === jugador.y) {
        celda.classList.add("jugador");
        celda.textContent = "😃";
      }
      mapa.appendChild(celda);
    }
  }
}

function mover(dx, dy) {
  jugador.x = Math.max(0, Math.min(size - 1, jugador.x + dx));
  jugador.y = Math.max(0, Math.min(size - 1, jugador.y + dy));
  renderMapa();
}

// Eventos de botones
document.getElementById("up").onclick = () => mover(0, -1);
document.getElementById("down").onclick = () => mover(0, 1);
document.getElementById("left").onclick = () => mover(-1, 0);
document.getElementById("right").onclick = () => mover(1, 0);

renderMapa();

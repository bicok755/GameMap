alert("El JavaScript se está ejecutando");
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  get,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCuz3aFUEd5ltVJzqDphvo3Y2AwAJv_Wt8",
  authDomain: "mapa-20bb9.firebaseapp.com",
  databaseURL: "https://mapa-20bb9-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "mapa-20bb9",
  storageBucket: "mapa-20bb9.appspot.com",
  messagingSenderId: "38423210148",
  appId: "1:38423210148:web:35b7c8bcbed5c1b2091e31"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const playerId = localStorage.getItem("jugadorId") || Math.random().toString(36).substring(2);
localStorage.setItem("jugadorId", playerId);

const jugadorRef = ref(db, `jugadores/${playerId}`);
onDisconnect(jugadorRef).remove(); // ✅ Borra al jugador si se desconecta

const mapaDiv = document.getElementById('mapa');
const ancho = 8;
const alto = 8;
const celdas = [];

const mapaFijo = [
  "CCCCCCCC",
  "CCCAACCC",
  "CCCCCACC",
  "CCCRCCCC",
  "CCCCCCCC",
  "CCCAACCC",
  "CCCCCRCC",
  "CCCCCCCC"
];

const mapaArray = mapaFijo.map(fila => fila.split(''));

// Crear el mapa visual
for (let y = 0; y < alto; y++) {
  for (let x = 0; x < ancho; x++) {
    const div = document.createElement('div');
    div.classList.add('celda');

    const tipo = mapaArray[y][x];
    if (tipo === 'C') {
      div.classList.add('cesped');
      div.textContent = "🌿";
    } else if (tipo === 'A') {
      div.classList.add('arbol');
      div.textContent = "🌳";
    } else if (tipo === 'R') {
      div.classList.add('roca');
      div.textContent = "🪨";
    }

    mapaDiv.appendChild(div);
    celdas.push(div);
  }
}

let posX = 1;
let posY = 1;

function dibujarJugadores(jugadores) {
  for (let i = 0; i < celdas.length; i++) {
    const y = Math.floor(i / ancho);
    const x = i % ancho;
    const tipo = mapaArray[y][x];
    celdas[i].textContent = tipo === 'C' ? "🌿" : tipo === 'A' ? "🌳" : "🪨";
    celdas[i].classList.remove('jugador');
  }

  for (const id in jugadores) {
    const p = jugadores[id];
    if (p && typeof p.x === 'number' && typeof p.y === 'number') {
      const index = p.y * ancho + p.x;
      if (celdas[index]) {
        celdas[index].textContent = id === playerId ? '🧍' : '👤';
        celdas[index].classList.add('jugador');
      }
    }
  }
}

function actualizarPosicion() {
  set(jugadorRef, { x: posX, y: posY });
}

function esTransitable(x, y) {
  return x >= 0 && x < ancho && y >= 0 && y < alto && mapaArray[y][x] === 'C';
}

function mover(dir) {
  let nx = posX;
  let ny = posY;
  if (dir === 'up') ny--;
  else if (dir === 'down') ny++;
  else if (dir === 'left') nx--;
  else if (dir === 'right') nx++;

  if (esTransitable(nx, ny)) {
    posX = nx;
    posY = ny;
    actualizarPosicion();
  }
}

document.getElementById('up').onclick = () => mover('up');
document.getElementById('down').onclick = () => mover('down');
document.getElementById('left').onclick = () => mover('left');
document.getElementById('right').onclick = () => mover('right');

// Inicializa y sincroniza la posición del jugador
get(jugadorRef).then(snapshot => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    if (esTransitable(data.x, data.y)) {
      posX = data.x;
      posY = data.y;
    }
  } else {
    do {
      posX = Math.floor(Math.random() * ancho);
      posY = Math.floor(Math.random() * alto);
    } while (!esTransitable(posX, posY));
  }

  actualizarPosicion();

  onValue(ref(db, 'jugadores'), (snapshot) => {
    const data = snapshot.val() || {};
    dibujarJugadores(data);
  });
});

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

const INVENTARIO_SIZE = 36;

// Crear inventario inicial: 3 bloques rojos, resto vacío.
function inventarioInicial() {
  const inv = Array(INVENTARIO_SIZE).fill(null);
  inv[0] = { tipo: "rojo", cantidad: 1 };
  inv[1] = { tipo: "rojo", cantidad: 1 };
  inv[2] = { tipo: "rojo", cantidad: 1 };
  return inv;
}

// Crear visualización del inventario
function dibujarInventario(inventario) {
  let invDiv = document.getElementById('inventario');
  if (!invDiv) {
    invDiv = document.createElement('div');
    invDiv.id = 'inventario';
    // Estilo básico, puedes mover esto a tu CSS si prefieres
    invDiv.style.display = "grid";
    invDiv.style.gridTemplateColumns = "repeat(9, 32px)";
    invDiv.style.gridGap = "4px";
    invDiv.style.margin = "12px 0";
    document.body.insertBefore(invDiv, mapaDiv.nextSibling);
  }
  invDiv.innerHTML = '';
  for (let i = 0; i < INVENTARIO_SIZE; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot-inventario';
    slot.style.width = '32px';
    slot.style.height = '32px';
    slot.style.border = '1px solid #999';
    slot.style.borderRadius = '5px';
    slot.style.display = 'flex';
    slot.style.alignItems = 'center';
    slot.style.justifyContent = 'center';
    slot.style.background = '#f5f5f5';
    if (inventario[i] && inventario[i].tipo === 'rojo') {
      slot.textContent = "🟥";
      slot.title = "Bloque rojo (" + inventario[i].cantidad + ")";
    }
    invDiv.appendChild(slot);
  }
}

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
let inventarioJugador = inventarioInicial();

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
  set(jugadorRef, { x: posX, y: posY, inventario: inventarioJugador });
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

// Inicializa y sincroniza la posición del jugador y el inventario
get(jugadorRef).then(snapshot => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    if (esTransitable(data.x, data.y)) {
      posX = data.x;
      posY = data.y;
    }
    // Inventario: si existe y es válido, lo usamos, si no, lo inicializamos
    if (data.inventario && Array.isArray(data.inventario) && data.inventario.length === INVENTARIO_SIZE) {
      inventarioJugador = data.inventario;
    } else {
      inventarioJugador = inventarioInicial();
    }
  } else {
    do {
      posX = Math.floor(Math.random() * ancho);
      posY = Math.floor(Math.random() * alto);
    } while (!esTransitable(posX, posY));
    inventarioJugador = inventarioInicial();
  }

  actualizarPosicion();
  dibujarInventario(inventarioJugador);

  onValue(ref(db, 'jugadores'), (snapshot) => {
    const data = snapshot.val() || {};
    dibujarJugadores(data);
    // Actualizar inventario si el nuestro cambia desde la base de datos
    if (data[playerId] && data[playerId].inventario) {
      inventarioJugador = data[playerId].inventario;
      dibujarInventario(inventarioJugador);
    }
  });
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  get,
  onDisconnect,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";

const firebaseConfig = {
  // ...tu configuración...
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

let playerId = new URLSearchParams(location.search).get('jugadorId');
if (!playerId) {
  playerId = localStorage.getItem("jugadorId") || Math.random().toString(36).substring(2);
  localStorage.setItem("jugadorId", playerId);
}

const jugadorRef = ref(db, `jugadores/${playerId}`);
onDisconnect(jugadorRef).remove();

const mapaDiv = document.getElementById('mapa');
const ancho = 8;
const alto = 8;
const celdas = [];

const INVENTARIO_SIZE = 36;
const BLOQUE_ROJO = "B";
const BLOQUE_MADERA = "M";
const SEMILLA = "S";
const ARBOL = "A";
const MAX_STACK = 999;

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

function copiarMapa(filas) {
  return filas.map(fila => fila.split(''));
}

const mapaGlobalRef = ref(db, "mapaGlobal");
let mapaArray = copiarMapa(mapaFijo);

function inventarioInicial() {
  const inv = Array(INVENTARIO_SIZE).fill(null);
  inv[0] = { tipo: "rojo", cantidad: 3 };
  return inv;
}

let inventarioJugador = inventarioInicial();
let slotSeleccionado = null;
let jugadoresActuales = {};

function dibujarInventario(inventario) {
  let invDiv = document.getElementById('inventario');
  if (!invDiv) {
    invDiv = document.createElement('div');
    invDiv.id = 'inventario';
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
    slot.style.border = slotSeleccionado === i ? '2px solid #e53935' : '1px solid #999';
    slot.style.cursor = inventario[i] ? 'pointer' : 'default';
    slot.style.borderRadius = '5px';
    slot.style.display = 'flex';
    slot.style.alignItems = 'center';
    slot.style.justifyContent = 'center';
    slot.style.background = '#f5f5f5';
    if (inventario[i]) {
      if (inventario[i].tipo === 'rojo') {
        slot.textContent = "🟥";
        slot.title = "Bloque rojo (" + inventario[i].cantidad + ")";
      } else if (inventario[i].tipo === 'arbol') {
        slot.textContent = "🌳";
        slot.title = "Árbol (" + inventario[i].cantidad + ")";
      } else if (inventario[i].tipo === 'madera') {
        slot.textContent = "🪵";
        slot.title = "Madera (" + inventario[i].cantidad + ")";
      } else if (inventario[i].tipo === 'semilla') {
        slot.textContent = "🌱";
        slot.title = "Semilla de árbol (" + inventario[i].cantidad + ")";
      }
      if (inventario[i].cantidad > 1) {
        const cantidadSpan = document.createElement('span');
        cantidadSpan.textContent = ' ' + inventario[i].cantidad;
        cantidadSpan.style.fontSize = "13px";
        cantidadSpan.style.color = "#222";
        slot.appendChild(cantidadSpan);
      }
      slot.onclick = () => {
        slotSeleccionado = (slotSeleccionado === i) ? null : i;
        dibujarInventario(inventarioJugador);
      };
    }
    invDiv.appendChild(slot);
  }
}

// --- MAPA ---

let posX = 1;
let posY = 1;

function esTransitable(x, y) {
  return x >= 0 && x < ancho && y >= 0 && y < alto && (mapaArray[y][x] === 'C');
}

function esVacio(x, y) {
  return x >= 0 && x < ancho && y >= 0 && y < alto && (mapaArray[y][x] === 'C');
}

function esBloqueRojo(x, y) {
  return x >= 0 && x < ancho && y >= 0 && y < alto && (mapaArray[y][x] === BLOQUE_ROJO);
}

// Permite colocar o recoger en cruz o en diagonal (adyacentes 8-direcciones)
function adyacente(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1 && !(x1 === x2 && y1 === y2);
}

function hayJugadorEn(x, y) {
  for (const id in jugadoresActuales) {
    const p = jugadoresActuales[id];
    if (p && typeof p.x === 'number' && typeof p.y === 'number') {
      if (p.x === x && p.y === y) return true;
    }
  }
  return false;
}

function dibujarMapa() {
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = y * ancho + x;
      const div = celdas[i];
      div.className = 'celda';
      const tipo = mapaArray[y][x];
      if (tipo === 'C') {
        div.classList.add('cesped');
        div.textContent = "🌿";
      } else if (tipo === ARBOL) {
        div.classList.add('arbol');
        div.textContent = "🌳";
      } else if (tipo === 'R') {
        div.classList.add('roca');
        div.textContent = "🪨";
      } else if (tipo === BLOQUE_ROJO) {
        div.classList.add('bloque-rojo');
        div.textContent = "🟥";
      } else if (tipo === BLOQUE_MADERA) {
        div.classList.add('madera');
        div.textContent = "🪵";
      } else if (tipo === SEMILLA) {
        div.classList.add('semilla');
        div.textContent = "🌱";
      }
      div.classList.remove('jugador');
      div.onclick = () => manejarClickCelda(x, y);
    }
  }
}

function dibujarJugadores(jugadores) {
  jugadoresActuales = jugadores;
  dibujarMapa();
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

// --- GESTIÓN DE SEMILLAS QUE CRECEN ---

function ponerSemilla(x, y) {
  // Deja la semilla en el mapa y agenda su crecimiento en 15s
  mapaArray[y][x] = SEMILLA;
  actualizarMapaYJugador();

  // Guardar en la base de datos cuándo debe crecer
  // Se guarda en /semillas/x_y: {x, y, timestamp}
  const semillasRef = ref(db, "semillas/" + x + "_" + y);
  const crecerEn = Date.now() + 15000;
  set(semillasRef, {x, y, crecerEn});

  setTimeout(() => {
    // Volver a consultar si sigue la semilla y si ya es hora de crecer
    get(semillasRef).then(snapshot => {
      const data = snapshot.val();
      if (data && data.crecerEn <= Date.now()) {
        // Solo crece si sigue siendo semilla
        if (mapaArray[y][x] === SEMILLA) {
          mapaArray[y][x] = ARBOL;
          set(mapaGlobalRef, mapaArray.map(fila => fila.join('')));
        }
        set(semillasRef, null); // quitamos la info de la semilla
      }
    });
  }, 15500);
}

// --- MANEJO DE CLICK EN CELDA ---

function manejarClickCelda(x, y) {
  // PONER bloque rojo
  if (
    slotSeleccionado !== null &&
    inventarioJugador[slotSeleccionado] &&
    inventarioJugador[slotSeleccionado].tipo === 'rojo' &&
    inventarioJugador[slotSeleccionado].cantidad > 0 &&
    esVacio(x, y) &&
    adyacente(posX, posY, x, y) &&
    !hayJugadorEn(x, y)
  ) {
    mapaArray[y][x] = BLOQUE_ROJO;
    inventarioJugador[slotSeleccionado].cantidad -= 1;
    if (inventarioJugador[slotSeleccionado].cantidad === 0) {
      inventarioJugador[slotSeleccionado] = null;
      slotSeleccionado = null;
    }
    actualizarMapaYJugador();
    return;
  }
  // RECOGER bloque rojo
  if (
    esBloqueRojo(x, y) &&
    adyacente(posX, posY, x, y)
  ) {
    let stackIdx = inventarioJugador.findIndex(
      s => s && s.tipo === "rojo" && s.cantidad < MAX_STACK
    );
    if (stackIdx !== -1) {
      inventarioJugador[stackIdx].cantidad += 1;
      mapaArray[y][x] = "C";
      actualizarMapaYJugador();
      return;
    }
    const libre = inventarioJugador.findIndex(s => !s);
    if (libre !== -1) {
      inventarioJugador[libre] = { tipo: "rojo", cantidad: 1 };
      mapaArray[y][x] = "C";
      actualizarMapaYJugador();
    } else {
      alert("¡Inventario lleno!");
    }
    return;
  }
  // RECOGER árbol: da 4 madera y 1 semilla
  if (
    mapaArray[y][x] === ARBOL &&
    adyacente(posX, posY, x, y)
  ) {
    let maderaRestante = 4, semillaRestante = 1;
    // Apila madera
    while (maderaRestante > 0) {
      let maderaStack = inventarioJugador.findIndex(
        s => s && s.tipo === "madera" && s.cantidad < MAX_STACK
      );
      if (maderaStack !== -1) {
        const porMeter = Math.min(MAX_STACK - inventarioJugador[maderaStack].cantidad, maderaRestante);
        inventarioJugador[maderaStack].cantidad += porMeter;
        maderaRestante -= porMeter;
      } else {
        const libre = inventarioJugador.findIndex(s => !s);
        if (libre !== -1) {
          const porMeter = Math.min(MAX_STACK, maderaRestante);
          inventarioJugador[libre] = { tipo: "madera", cantidad: porMeter };
          maderaRestante -= porMeter;
        } else {
          alert("¡Inventario lleno! Solo recogiste parte de la madera.");
          break;
        }
      }
    }
    // Apila semilla
    if (semillaRestante > 0) {
      let semillaStack = inventarioJugador.findIndex(
        s => s && s.tipo === "semilla" && s.cantidad < MAX_STACK
      );
      if (semillaStack !== -1) {
        inventarioJugador[semillaStack].cantidad += semillaRestante;
      } else {
        const libre = inventarioJugador.findIndex(s => !s);
        if (libre !== -1) {
          inventarioJugador[libre] = { tipo: "semilla", cantidad: semillaRestante };
        } else {
          alert("¡Inventario lleno! No pudiste recoger semillas.");
        }
      }
    }
    mapaArray[y][x] = "C";
    actualizarMapaYJugador();
    return;
  }
  // RECOGER madera suelta del mapa
  if (
    mapaArray[y][x] === BLOQUE_MADERA &&
    adyacente(posX, posY, x, y)
  ) {
    let stackIdx = inventarioJugador.findIndex(
      s => s && s.tipo === "madera" && s.cantidad < MAX_STACK
    );
    if (stackIdx !== -1) {
      inventarioJugador[stackIdx].cantidad += 1;
      mapaArray[y][x] = "C";
      actualizarMapaYJugador();
      return;
    }
    const libre = inventarioJugador.findIndex(s => !s);
    if (libre !== -1) {
      inventarioJugador[libre] = { tipo: "madera", cantidad: 1 };
      mapaArray[y][x] = "C";
      actualizarMapaYJugador();
    } else {
      alert("¡Inventario lleno!");
    }
    return;
  }
  // PONER madera como objeto (tipo suelto)
  if (
    slotSeleccionado !== null &&
    inventarioJugador[slotSeleccionado] &&
    inventarioJugador[slotSeleccionado].tipo === 'madera' &&
    inventarioJugador[slotSeleccionado].cantidad > 0 &&
    esVacio(x, y) &&
    adyacente(posX, posY, x, y) &&
    !hayJugadorEn(x, y)
  ) {
    mapaArray[y][x] = BLOQUE_MADERA;
    inventarioJugador[slotSeleccionado].cantidad -= 1;
    if (inventarioJugador[slotSeleccionado].cantidad === 0) {
      inventarioJugador[slotSeleccionado] = null;
      slotSeleccionado = null;
    }
    actualizarMapaYJugador();
    return;
  }
  // PONER semilla de árbol
  if (
    slotSeleccionado !== null &&
    inventarioJugador[slotSeleccionado] &&
    inventarioJugador[slotSeleccionado].tipo === 'semilla' &&
    inventarioJugador[slotSeleccionado].cantidad > 0 &&
    esVacio(x, y) &&
    adyacente(posX, posY, x, y) &&
    !hayJugadorEn(x, y)
  ) {
    inventarioJugador[slotSeleccionado].cantidad -= 1;
    if (inventarioJugador[slotSeleccionado].cantidad === 0) {
      inventarioJugador[slotSeleccionado] = null;
      slotSeleccionado = null;
    }
    ponerSemilla(x, y);
    return;
  }
  // RECOGER semilla del mapa (por si existiera, aunque no se deja nunca suelta, solo por si acaso)
  if (
    mapaArray[y][x] === SEMILLA &&
    adyacente(posX, posY, x, y)
  ) {
    let stackIdx = inventarioJugador.findIndex(
      s => s && s.tipo === "semilla" && s.cantidad < MAX_STACK
    );
    if (stackIdx !== -1) {
      inventarioJugador[stackIdx].cantidad += 1;
      mapaArray[y][x] = "C";
      actualizarMapaYJugador();
      return;
    }
    const libre = inventarioJugador.findIndex(s => !s);
    if (libre !== -1) {
      inventarioJugador[libre] = { tipo: "semilla", cantidad: 1 };
      mapaArray[y][x] = "C";
      actualizarMapaYJugador();
    } else {
      alert("¡Inventario lleno!");
    }
    return;
  }
}

// --- Sincronización MAPA+JUGADOR ---

function actualizarMapaYJugador() {
  set(mapaGlobalRef, mapaArray.map(fila => fila.join('')));
  set(jugadorRef, { x: posX, y: posY, inventario: inventarioJugador });
  dibujarInventario(inventarioJugador);
}

// --- Movimiento ---

function mover(dir) {
  let nx = posX;
  let ny = posY;
  if (dir === 'up') ny--;
  else if (dir === 'down') ny++;
  else if (dir === 'left') nx--;
  else if (dir === 'right') nx++;
  if (esTransitable(nx, ny) && !hayJugadorEn(nx, ny)) {
    posX = nx;
    posY = ny;
    set(jugadorRef, { x: posX, y: posY, inventario: inventarioJugador });
  }
}

document.getElementById('up').onclick = () => mover('up');
document.getElementById('down').onclick = () => mover('down');
document.getElementById('left').onclick = () => mover('left');
document.getElementById('right').onclick = () => mover('right');

// --- Inicialización visual ---

for (let y = 0; y < alto; y++) {
  for (let x = 0; x < ancho; x++) {
    const div = document.createElement('div');
    div.classList.add('celda');
    mapaDiv.appendChild(div);
    celdas.push(div);
  }
}

// --- Sincronización ---

get(mapaGlobalRef).then(snapshot => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    if (Array.isArray(data) && data.length === alto) {
      mapaArray = copiarMapa(data);
    }
  } else {
    set(mapaGlobalRef, mapaFijo);
    mapaArray = copiarMapa(mapaFijo);
  }
});

onValue(mapaGlobalRef, (snapshot) => {
  const data = snapshot.val();
  if (Array.isArray(data) && data.length === alto) {
    mapaArray = copiarMapa(data);
  }
});

get(jugadorRef).then(snapshot => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    if (typeof data.x === "number" && typeof data.y === "number") {
      posX = data.x;
      posY = data.y;
    }
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
  set(jugadorRef, { x: posX, y: posY, inventario: inventarioJugador });
  dibujarInventario(inventarioJugador);

  onValue(ref(db, 'jugadores'), (snapshot) => {
    const data = snapshot.val() || {};
    dibujarJugadores(data);
    if (data[playerId] && data[playerId].inventario) {
      inventarioJugador = data[playerId].inventario;
      dibujarInventario(inventarioJugador);
    }
  });
});

// --- Sincroniza semillas para crecer si se reinicia la página ---
onValue(ref(db, "semillas"), (snapshot) => {
  const semillas = snapshot.val() || {};
  for (const key in semillas) {
    const s = semillas[key];
    if (s && s.crecerEn && Date.now() > s.crecerEn) {
      if (mapaArray[s.y][s.x] === SEMILLA) {
        mapaArray[s.y][s.x] = ARBOL;
        set(mapaGlobalRef, mapaArray.map(fila => fila.join('')));
      }
      set(ref(db, "semillas/" + key), null);
    } else if (s && s.crecerEn && Date.now() < s.crecerEn) {
      // Agenda crecimiento si hay semillas pendientes
      setTimeout(() => {
        get(ref(db, "semillas/" + key)).then(snapshot => {
          const data = snapshot.val();
          if (data && data.crecerEn <= Date.now()) {
            if (mapaArray[data.y][data.x] === SEMILLA) {
              mapaArray[data.y][data.x] = ARBOL;
              set(mapaGlobalRef, mapaArray.map(fila => fila.join('')));
            }
            set(ref(db, "semillas/" + key), null);
          }
        });
      }, s.crecerEn - Date.now() + 500);
    }
  }
});

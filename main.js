// --- DATOS Y MODELO ---
const OBJETOS = {
  ROJO:   { id: 1, icono: "🟥", tipo: "bloque" },
  MADERA: { id: 2, icono: "🪵", tipo: "bloque" },
  SEMILLA:{ id: 3, icono: "🌱", tipo: "item"  },
  ARBOL:  { id: 4, icono: "🌳", tipo: "bloque" }
};
const ID_TO_OBJ = Object.fromEntries(Object.values(OBJETOS).map(o => [o.id, o]));
const MAP_ANCHO = 8, MAP_ALTO = 8;
let mapa = [
  [0,0,0,0,0,0,0,0],
  [0,0,4,4,0,0,0,0],
  [0,0,0,0,4,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,4,4,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
];
let inventario = Array(36).fill(null);
inventario[0] = { id: OBJETOS.ROJO.id, cantidad: 3 };
let jugador = { x: 1, y: 1 };
let selectedSlot = 0;

// --- FUNCIONES INVENTARIO ---
function agregarAlInventario(id, cantidad) {
  while (cantidad > 0) {
    let slot = inventario.find(s => s && s.id === id && s.cantidad < 999);
    if (slot) {
      let espacio = 999 - slot.cantidad;
      let meter = Math.min(espacio, cantidad);
      slot.cantidad += meter;
      cantidad -= meter;
    } else {
      let libre = inventario.findIndex(s => !s);
      if (libre === -1) break;
      let meter = Math.min(999, cantidad);
      inventario[libre] = { id, cantidad: meter };
      cantidad -= meter;
    }
  }
}
function quitarDelInventario(id) {
  let slot = inventario.find(s => s && s.id === id && s.cantidad > 0);
  if (slot) {
    slot.cantidad--;
    if (slot.cantidad === 0) {
      inventario[inventario.indexOf(slot)] = null;
    }
    return true;
  }
  return false;
}

// --- FUNCIONES BLOQUES ---
function obtenerDrops(id) {
  if (id === OBJETOS.ARBOL.id) {
    return [
      { id: OBJETOS.MADERA.id, cantidad: 4 },
      { id: OBJETOS.SEMILLA.id, cantidad: 1 }
    ];
  }
  return [{ id, cantidad: 1 }];
}
function adyacente(x1, y1, x2, y2) {
  return Math.max(Math.abs(x1-x2), Math.abs(y1-y2)) === 1;
}
function destruirBloque(x, y) {
  if (!adyacente(jugador.x, jugador.y, x, y)) return;
  let id = mapa[y][x];
  if (!id) return;
  let drops = obtenerDrops(id);
  drops.forEach(drop => agregarAlInventario(drop.id, drop.cantidad));
  mapa[y][x] = 0;
  render();
}
function ponerBloque(x, y, id) {
  if (!adyacente(jugador.x, jugador.y, x, y)) return;
  if (mapa[y][x] !== 0) return;
  if (!quitarDelInventario(id)) return;
  mapa[y][x] = id;
  render();
  if (id === OBJETOS.SEMILLA.id) {
    setTimeout(() => {
      if (mapa[y][x] === OBJETOS.SEMILLA.id) {
        mapa[y][x] = OBJETOS.ARBOL.id;
        render();
      }
    }, 15000);
  }
}

// --- RENDER ---
function render() {
  // MAPA
  const mapaDiv = document.getElementById('mapa');
  mapaDiv.innerHTML = "";
  for (let y = 0; y < MAP_ALTO; y++) {
    for (let x = 0; x < MAP_ANCHO; x++) {
      let celda = document.createElement('div');
      celda.className = 'celda';
      let id = mapa[y][x];
      if (id === 0) celda.classList.add('cesped');
      if (jugador.x === x && jugador.y === y) {
        celda.classList.add('jugador');
        celda.textContent = "🧍";
      } else if (id) {
        celda.textContent = ID_TO_OBJ[id].icono;
      }
      celda.onclick = function() {
        if (jugador.x === x && jugador.y === y) return;
        if (id === 0 && selectedSlot !== null && inventario[selectedSlot]) {
          ponerBloque(x, y, inventario[selectedSlot].id);
        } else if (id > 0) {
          destruirBloque(x, y);
        }
      };
      mapaDiv.appendChild(celda);
    }
  }
  // INVENTARIO
  const invDiv = document.getElementById('inventario');
  invDiv.innerHTML = "";
  for (let i = 0; i < 36; i++) {
    let slot = document.createElement('div');
    slot.className = 'slot-inventario' + (selectedSlot === i ? ' selected' : '');
    if (inventario[i]) {
      let obj = ID_TO_OBJ[inventario[i].id];
      slot.textContent = obj.icono;
      if (inventario[i].cantidad > 1) {
        const cant = document.createElement('span');
        cant.className = 'cantidad';
        cant.textContent = inventario[i].cantidad;
        slot.appendChild(cant);
      }
    }
    slot.onclick = () => {
      selectedSlot = (selectedSlot === i ? null : i);
      render();
    };
    invDiv.appendChild(slot);
  }
}
render();

// --- MOVIMIENTO ---
function mover(dx, dy) {
  let nx = jugador.x + dx, ny = jugador.y + dy;
  if (nx >= 0 && nx < MAP_ANCHO && ny >= 0 && ny < MAP_ALTO) {
    jugador.x = nx; jugador.y = ny;
    render();
  }
}
document.getElementById("btn-up").onclick = () => mover(0,-1);
document.getElementById("btn-down").onclick = () => mover(0,1);
document.getElementById("btn-left").onclick = () => mover(-1,0);
document.getElementById("btn-right").onclick = () => mover(1,0);

// --- SWIPE PARA MOVER ---
let touchStartX, touchStartY;
document.getElementById('mapa').addEventListener('touchstart', ev => {
  if (ev.touches.length === 1) {
    touchStartX = ev.touches[0].clientX;
    touchStartY = ev.touches[0].clientY;
  }
});
document.getElementById('mapa').addEventListener('touchend', ev => {
  if (typeof touchStartX === "number" && ev.changedTouches.length === 1) {
    let dx = ev.changedTouches[0].clientX - touchStartX;
    let dy = ev.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
      if (Math.abs(dx) > Math.abs(dy)) mover(dx > 0 ? 1 : -1, 0);
      else mover(0, dy > 0 ? 1 : -1);
    }
  }
  touchStartX = touchStartY = null;
});

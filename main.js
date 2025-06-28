// ----- CONSTANTES Y DATOS DE OBJETOS -----
const OBJETOS = {
  ROJO:   { id: 1, nombre: "Bloque Rojo", icono: "🟥", tipo: "bloque" },
  MADERA: { id: 2, nombre: "Bloque de Madera", icono: "🪵", tipo: "bloque" },
  SEMILLA:{ id: 3, nombre: "Semilla de Árbol", icono: "🌱", tipo: "item" },
  ARBOL:  { id: 4, nombre: "Árbol", icono: "🌳", tipo: "bloque" }
};
const ID_TO_OBJ = Object.fromEntries(Object.values(OBJETOS).map(o => [o.id, o]));

// 0 = vacío, 1 = bloque rojo, 2 = madera, 3 = semilla, 4 = árbol
const ancho = 8, alto = 8;
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

// ----- FUNCIONES DE INVENTARIO -----
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

// ----- FUNCIONES DE BLOQUES Y DROPS -----
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

// ----- RENDER -----
function render() {
  // Mapa
  const mapaDiv = document.getElementById('mapa');
  mapaDiv.innerHTML = "";
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      let celda = document.createElement('div');
      celda.className = 'celda';
      celda.style.width = celda.style.height = "32px";
      celda.style.display = "inline-block";
      celda.style.border = "1px solid #ccc";
      celda.style.textAlign = "center";
      celda.style.verticalAlign = "middle";
      celda.style.fontSize = "25px";
      celda.style.background = (jugador.x === x && jugador.y === y) ? "#ffe082" : "#fafafa";
      let id = mapa[y][x];
      celda.textContent = id ? ID_TO_OBJ[id].icono : "";
      celda.onclick = function() {
        if (id === 0 && selectedSlot !== null && inventario[selectedSlot]) {
          ponerBloque(x, y, inventario[selectedSlot].id);
        } else if (id > 0) {
          destruirBloque(x, y);
        }
      };
      mapaDiv.appendChild(celda);
    }
    mapaDiv.appendChild(document.createElement('br'));
  }
  // Inventario
  const invDiv = document.getElementById('inventario');
  invDiv.innerHTML = "";
  for (let i = 0; i < 36; i++) {
    let slot = document.createElement('div');
    slot.className = 'slot-inventario';
    slot.style.width = slot.style.height = "32px";
    slot.style.display = "inline-block";
    slot.style.border = (selectedSlot === i ? "2px solid #2196f3" : "1px solid #888");
    slot.style.margin = "2px";
    slot.style.textAlign = "center";
    slot.style.verticalAlign = "middle";
    slot.style.fontSize = "22px";
    slot.style.background = "#fff";
    if (inventario[i]) {
      let obj = ID_TO_OBJ[inventario[i].id];
      slot.textContent = obj.icono + (inventario[i].cantidad > 1 ? " " + inventario[i].cantidad : "");
      slot.title = obj.nombre + " (" + inventario[i].cantidad + ")";
    }
    slot.onclick = () => {
      selectedSlot = (selectedSlot === i ? null : i);
      render();
    };
    invDiv.appendChild(slot);
    if ((i+1)%9===0) invDiv.appendChild(document.createElement('br'));
  }
}
let selectedSlot = 0;

// ----- MOVIMIENTO -----
function mover(dx, dy) {
  let nx = jugador.x + dx, ny = jugador.y + dy;
  if (nx >= 0 && nx < ancho && ny >= 0 && ny < alto) {
    jugador.x = nx; jugador.y = ny;
    render();
  }
}

// ----- UI BÁSICA -----
window.onload = function() {
  if (!document.getElementById('ui')) {
    const ui = document.createElement('div');
    ui.id = "ui";
    ui.innerHTML = `
      <div>
        <button onclick="mover(0,-1)">⬆️</button>
        <button onclick="mover(-1,0)">⬅️</button>
        <button onclick="mover(1,0)">➡️</button>
        <button onclick="mover(0,1)">⬇️</button>
      </div>
      <div id="mapa"></div>
      <div style="margin:8px 0 4px 0;font-weight:bold">Inventario</div>
      <div id="inventario"></div>
    `;
    document.body.appendChild(ui);
  }
  render();
};
window.mover = mover; // para los botones

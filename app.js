const STORAGE_KEY = "rastreosya_registros_v1";

const DEFAULT_RECORDS = [
  {
    id: "REG-101",
    modulo: "Inventario SKU",
    codigo: "SKU-104",
    descripcion: "Cajas corrugadas reforzadas · Almacén Central",
    cantidad: 45,
    minimo: 20,
    tarifa: 8.5,
    totalEstimado: 382.5,
    estado: "Disponible"
    
  },
  {
    id: "REG-102",
    modulo: "Guía / Envío",
    codigo: "GUIA-882",
    descripcion: "Despacho paquetería comercial · Ruta Valencia",
    cantidad: 12,
    minimo: 15,
    tarifa: 24.0,
    totalEstimado: 288.0,
    estado: "Reorden / Atención"
  },
  {
    id: "REG-103",
    modulo: "Ruta / Flota",
    codigo: "RUTA-07",
    descripcion: "Unidad Furgón N° 07 · Tramo Caracas - Valencia",
    cantidad: 4,
    minimo: 6,
    tarifa: 110.0,
    totalEstimado: 440.0,
    estado: "Crítico"
  }
];

const form = document.getElementById("operacion-form");
const moduloInput = document.getElementById("modulo");
const codigoInput = document.getElementById("codigo");
const descripcionInput = document.getElementById("descripcion");
const cantidadInput = document.getElementById("cantidad");
const minimoInput = document.getElementById("minimo");
const tarifaInput = document.getElementById("tarifa");

const previewEstado = document.getElementById("preview-estado");
const previewTotal = document.getElementById("preview-total");
const feedbackEl = document.getElementById("form-feedback");

const btnLimpiar = document.getElementById("btn-limpiar");
const btnExportar = document.getElementById("btn-exportar");
const btnResetDemo = document.getElementById("btn-reset-demo");
const buscarInput = document.getElementById("buscar-registro");
const filtroModuloSelect = document.getElementById("filtro-modulo");
const tablaBody = document.getElementById("tabla-registros-body");

const kpiTotalRegistros = document.getElementById("kpi-total-registros");
const kpiTotalUnidades = document.getElementById("kpi-total-unidades");
const kpiAlertasStock = document.getElementById("kpi-alertas-stock");
const kpiValorEstimado = document.getElementById("kpi-valor-estimado");

let registros = [];

function clasificarEstado(cantidad, minimo) {
  if (cantidad <= Math.floor(minimo * 0.75) || cantidad === 0) {
    return "Crítico";
  }
  if (cantidad < minimo) {
    return "Reorden / Atención";
  }
  return "Disponible";
}

function calcularTotal(cantidad, tarifa) {
  const total = cantidad * tarifa;
  return Number.isFinite(total) ? Number(total.toFixed(2)) : 0;
}

function formatoMoneda(valor) {
  return `$${Number(valor || 0).toFixed(2)}`;
}

function guardarEnStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

async function cargarRegistrosIniciales() {
  const guardado = localStorage.getItem(STORAGE_KEY);
  if (guardado) {
    try {
      const parsed = JSON.parse(guardado);
      if (Array.isArray(parsed) && parsed.length > 0) {
        registros = parsed;
        renderizarTodo();
        return;
      }
    } catch {
      // Si el JSON en localStorage está corrupto, se continua con data.json o DEFAULT_RECORDS
    }
  }

  try {
    const respuesta = await fetch("data.json", { cache: "no-store" });
    if (respuesta.ok) {
      const dataJson = await respuesta.json();
      if (Array.isArray(dataJson) && dataJson.length > 0) {
        registros = dataJson;
        guardarEnStorage();
        renderizarTodo();
        return;
      }
    }
  } catch {
    // Fallback si se abre fuera de un servidor HTTP
  }

  registros = [...DEFAULT_RECORDS];
  guardarEnStorage();
  renderizarTodo();
}

function actualizarVistaPrevia() {
  const cantidad = Number(cantidadInput.value);
  const minimo = Number(minimoInput.value);
  const tarifa = Number(tarifaInput.value);

  const cantidadValida = Number.isFinite(cantidad) && cantidad >= 0;
  const minimoValido = Number.isFinite(minimo) && minimo >= 0;
  const tarifaValida = Number.isFinite(tarifa) && tarifa >= 0;

  if (!cantidadValida || !minimoValido || !tarifaValida || (cantidad === 0 && tarifa === 0)) {
    previewEstado.textContent = "Pendiente de cálculo";
    previewTotal.textContent = "$0.00";
    return;
  }

  const total = calcularTotal(cantidad, tarifa);
  const estado = clasificarEstado(cantidad, minimo);

  previewEstado.textContent = estado;
  previewTotal.textContent = formatoMoneda(total);
}

function mostrarFeedback(mensaje, tipo = "error") {
  feedbackEl.textContent = mensaje;
  feedbackEl.className = `feedback ${tipo}`;
}

function validarFormulario() {
  const codigo = codigoInput.value.trim();
  const descripcion = descripcionInput.value.trim();
  const cantidad = Number(cantidadInput.value);
  const minimo = Number(minimoInput.value);
  const tarifa = Number(tarifaInput.value);

  if (!codigo) {
    return { ok: false, msg: "Ingresa un código, SKU o guía válido." };
  }
  if (!descripcion) {
    return { ok: false, msg: "Ingresa una descripción, destino o unidad." };
  }
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return { ok: false, msg: "La cantidad debe ser un número entero mayor o igual a 1." };
  }
  if (!Number.isInteger(minimo) || minimo < 0) {
    return { ok: false, msg: "El stock mínimo debe ser un número entero mayor o igual a 0." };
  }
  if (!Number.isFinite(tarifa) || tarifa <= 0) {
    return { ok: false, msg: "La tarifa o costo unitario debe ser mayor a 0." };
  }

  return {
    ok: true,
    data: {
      id: `REG-${Date.now().toString().slice(-5)}`,
      modulo: moduloInput.value,
      codigo: codigo.toUpperCase(),
      descripcion,
      cantidad,
      minimo,
      tarifa: Number(tarifa.toFixed(2)),
      totalEstimado: calcularTotal(cantidad, tarifa),
      estado: clasificarEstado(cantidad, minimo)
    }
  };
}

function badgeClaseEstado(estado) {
  if (estado === "Disponible") return "status-badge status-ok";
  if (estado === "Reorden / Atención") return "status-badge status-warn";
  return "status-badge status-crit";
}

function renderizarMetricas() {
  const totalRegistros = registros.length;
  const totalUnidades = registros.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
  const alertasStock = registros.filter((item) => item.estado !== "Disponible").length;
  const valorEstimado = registros.reduce((acc, item) => acc + Number(item.totalEstimado || 0), 0);

  kpiTotalRegistros.textContent = String(totalRegistros);
  kpiTotalUnidades.textContent = String(totalUnidades);
  kpiAlertasStock.textContent = String(alertasStock);
  kpiValorEstimado.textContent = formatoMoneda(valorEstimado);
}

function escaparTexto(texto) {
  const div = document.createElement("div");
  div.textContent = String(texto ?? "");
  return div.innerHTML;
}

function renderizarTabla() {
  const termino = buscarInput.value.trim().toLowerCase();
  const moduloSeleccionado = filtroModuloSelect.value;

  const filtrados = registros.filter((item) => {
    const coincideModulo = moduloSeleccionado === "TODOS" || item.modulo === moduloSeleccionado;
    const coincideTexto =
      !termino ||
      String(item.codigo).toLowerCase().includes(termino) ||
      String(item.descripcion).toLowerCase().includes(termino);
    return coincideModulo && coincideTexto;
  });

  if (filtrados.length === 0) {
    tablaBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; color:#556575; padding:1.25rem;">
          No hay registros que coincidan con el filtro actual.
        </td>
      </tr>
    `;
    return;
  }

  tablaBody.innerHTML = filtrados
    .map(
      (item) => `
      <tr>
        <td>${escaparTexto(item.modulo)}</td>
        <td><strong>${escaparTexto(item.codigo)}</strong></td>
        <td>${escaparTexto(item.descripcion)}</td>
        <td>${escaparTexto(item.cantidad)}</td>
        <td>${escaparTexto(item.minimo)}</td>
        <td>${escaparTexto(formatoMoneda(item.totalEstimado))}</td>
        <td><span class="${badgeClaseEstado(item.estado)}">${escaparTexto(item.estado)}</span></td>
        <td>
          <button type="button" class="btn-delete" data-id="${escaparTexto(item.id)}" aria-label="Eliminar registro ${escaparTexto(item.codigo)}">
            Eliminar
          </button>
        </td>
      </tr>
    `
    )
    .join("");
}

function renderizarTodo() {
  renderizarMetricas();
  renderizarTabla();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const resultado = validarFormulario();

  if (!resultado.ok) {
    mostrarFeedback(resultado.msg, "error");
    return;
  }

  registros.unshift(resultado.data);
  guardarEnStorage();
  renderizarTodo();
  form.reset();
  actualizarVistaPrevia();
  mostrarFeedback(`Registro ${resultado.data.codigo} guardado correctamente.`, "success");
});

[cantidadInput, minimoInput, tarifaInput].forEach((input) => {
  input.addEventListener("input", actualizarVistaPrevia);
});

btnLimpiar.addEventListener("click", () => {
  form.reset();
  actualizarVistaPrevia();
  mostrarFeedback("", "success");
});

buscarInput.addEventListener("input", renderizarTabla);
filtroModuloSelect.addEventListener("change", renderizarTabla);

tablaBody.addEventListener("click", (event) => {
  const boton = event.target.closest(".btn-delete");
  if (!boton) return;

  const id = boton.getAttribute("data-id");
  registros = registros.filter((item) => item.id !== id);
  guardarEnStorage();
  renderizarTodo();
  mostrarFeedback("Registro eliminado.", "success");
});

btnExportar.addEventListener("click", () => {
  const lineas = [
    "RASTREOSYA LOGÍSTICA - RESUMEN OPERATIVO",
    `Fecha: ${new Date().toLocaleString("es-VE")}`,
    `Registros totales: ${registros.length}`,
    `Unidades totales: ${registros.reduce((acc, r) => acc + Number(r.cantidad || 0), 0)}`,
    `Alertas de stock/reorden: ${registros.filter((r) => r.estado !== "Disponible").length}`,
    `Valor estimado total: ${formatoMoneda(registros.reduce((acc, r) => acc + Number(r.totalEstimado || 0), 0))}`,
    "----------------------------------------",
    ...registros.map(
      (r) => `[${r.modulo}] ${r.codigo} | ${r.descripcion} | Cant: ${r.cantidad}/${r.minimo} | ${formatoMoneda(r.totalEstimado)} | ${r.estado}`
    )
  ];

  const blob = new Blob([lineas.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "resumen-rastreosya.txt";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
  mostrarFeedback("Resumen .txt descargado.", "success");
});

btnResetDemo.addEventListener("click", async () => {
  localStorage.removeItem(STORAGE_KEY);
  await cargarRegistrosIniciales();
  mostrarFeedback("Base de datos restaurada a los valores iniciales.", "success");
});

cargarRegistrosIniciales();
actualizarVistaPrevia();

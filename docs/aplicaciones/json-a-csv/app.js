"use strict";

const input = document.querySelector("#json-input");
const fileInput = document.querySelector("#file");
const flattenInput = document.querySelector("#flatten");
const delimiterInput = document.querySelector("#delimiter");
const convertButton = document.querySelector("#convert");
const exampleButton = document.querySelector("#example");
const clearButton = document.querySelector("#clear");
const copyButton = document.querySelector("#copy");
const status = document.querySelector("#status");
const summary = document.querySelector("#summary");
const preview = document.querySelector("#preview");
const downloadArea = document.querySelector("#download-area");
const download = document.querySelector("#download");
const engine = window.ResueltoEnLoteJsonToCsv;
let downloadUrl = null;
let lastCsv = "";

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = `status ${kind}`.trim();
}

function renderPreview(result) {
  preview.replaceChildren();
  const table = document.createElement("table");
  table.className = "preview-table";
  const rows = [result.headers, ...result.rows.slice(0, 12)];
  rows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    row.forEach((value) => {
      const cell = document.createElement(rowIndex === 0 ? "th" : "td");
      cell.textContent = value;
      tr.append(cell);
    });
    table.append(tr);
  });
  preview.append(table);
  if (result.rows.length > 12) {
    const note = document.createElement("p");
    note.className = "muted";
    note.textContent = `Vista previa de 12 filas; el CSV descargado contiene las ${result.rows.length} filas.`;
    preview.append(note);
  }
}

async function loadFile(file) {
  if (!file) return;
  input.value = await file.text();
  setStatus(`${file.name} cargado. Pulsa «Convertir a CSV».`);
  convertButton.disabled = false;
}

function convert() {
  convertButton.disabled = true;
  downloadArea.hidden = true;
  setStatus("Convirtiendo el JSON en tu navegador…");
  try {
    const value = engine.parseJson(input.value);
    const result = engine.convertJson(value, { flatten: flattenInput.checked });
    const delimiter = delimiterInput.value === "tab" ? "\t" : delimiterInput.value;
    lastCsv = engine.toCsv(result, delimiter);
    renderPreview(result);
    summary.textContent = `${result.records} objetos → ${result.rows.length} filas · ${result.headers.length} columnas${result.flatten ? " · campos anidados aplanados" : ""}`;
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(new Blob([lastCsv], { type: "text/csv;charset=utf-8" }));
    download.href = downloadUrl;
    download.download = "datos_convertidos.csv";
    downloadArea.hidden = false;
    setStatus("Conversión terminada. El CSV está listo para descargar.", "success");
  } catch (error) {
    setStatus(error.message || String(error), "error");
  } finally {
    convertButton.disabled = !input.value.trim();
  }
}

async function copyCsv() {
  if (!lastCsv) return;
  try {
    await navigator.clipboard.writeText(lastCsv.replace(/^\ufeff/, ""));
    setStatus("CSV copiado al portapapeles.", "success");
  } catch {
    setStatus("No se ha podido copiar automáticamente; usa la descarga.", "warning");
  }
}

function loadExample() {
  input.value = JSON.stringify([
    { id: 101, cliente: "Ana", pedido: { estado: "enviado", importe: 25.5 } },
    { id: 102, cliente: "Luis", pedido: { estado: "pendiente", importe: 40 }, etiquetas: ["nuevo", "web"] }
  ], null, 2);
  flattenInput.checked = true;
  convertButton.disabled = false;
  setStatus("Ejemplo cargado: incluye un objeto anidado y una lista.");
}

function clearAll() {
  input.value = "";
  fileInput.value = "";
  convertButton.disabled = true;
  preview.replaceChildren();
  summary.textContent = "Todavía no hay resultados.";
  downloadArea.hidden = true;
  lastCsv = "";
  setStatus("Pega un JSON o selecciona un archivo.");
}

input.addEventListener("input", () => { convertButton.disabled = !input.value.trim(); });
fileInput.addEventListener("change", () => loadFile(fileInput.files[0]).catch((error) => setStatus(error.message, "error")));
convertButton.addEventListener("click", convert);
exampleButton.addEventListener("click", loadExample);
clearButton.addEventListener("click", clearAll);
copyButton.addEventListener("click", copyCsv);
window.addEventListener("pagehide", () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); });

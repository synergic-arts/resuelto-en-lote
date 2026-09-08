"use strict";

const fileInput = document.querySelector("#file");
const delimiterInput = document.querySelector("#delimiter");
const headerInput = document.querySelector("#has-header");
const trimInput = document.querySelector("#trim-cells");
const collapseInput = document.querySelector("#collapse-spaces");
const emptyInput = document.querySelector("#remove-empty");
const duplicateInput = document.querySelector("#remove-duplicates");
const ignoreCaseInput = document.querySelector("#ignore-case");
const columnsBox = document.querySelector("#duplicate-columns");
const cleanButton = document.querySelector("#clean");
const exampleButton = document.querySelector("#example");
const clearButton = document.querySelector("#clear");
const status = document.querySelector("#status");
const summary = document.querySelector("#summary");
const preview = document.querySelector("#preview");
const downloadArea = document.querySelector("#download-area");
const download = document.querySelector("#download");
const engine = window.ResueltoEnLoteCsvCleaner;
let currentFile = null;
let downloadUrl = null;

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = `status ${kind}`.trim();
}

function delimiter() {
  if (delimiterInput.value !== "auto") return delimiterInput.value;
  return currentFile && currentFile._detectedDelimiter ? currentFile._detectedDelimiter : ",";
}

function renderColumns(headers) {
  columnsBox.replaceChildren();
  if (!headers.length) {
    columnsBox.textContent = "Selecciona un archivo para elegir columnas.";
    return;
  }
  const note = document.createElement("p");
  note.className = "muted";
  note.textContent = "Si no marcas ninguna, se comparará la fila completa.";
  columnsBox.append(note);
  headers.forEach((header, index) => {
    const label = document.createElement("label");
    label.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = String(index);
    input.checked = index === 0;
    label.append(input, document.createTextNode(` ${header || `Columna ${index + 1}`}`));
    columnsBox.append(label);
  });
}

async function loadFile(file) {
  currentFile = file || null;
  if (!currentFile) {
    cleanButton.disabled = true;
    renderColumns([]);
    setStatus("Selecciona un archivo CSV.");
    return;
  }
  const text = await currentFile.text();
  currentFile._detectedDelimiter = engine.detectDelimiter(text);
  const rows = engine.parseCsv(text, delimiter());
  const model = rows.length && headerInput.checked ? rows[0] : (rows[0] || []);
  renderColumns(headerInput.checked ? model : Array.from({ length: Math.max(1, ...rows.map((row) => row.length)) }, (_, i) => `Columna ${i + 1}`));
  cleanButton.disabled = !rows.length;
  setStatus(`${currentFile.name}: ${rows.length} filas preparadas.`);
}

function selectedKeyIndices() {
  return [...columnsBox.querySelectorAll('input[type="checkbox"]:checked')].map((input) => Number(input.value));
}

function displayPreview(rows) {
  preview.replaceChildren();
  const table = document.createElement("table");
  table.className = "preview-table";
  const shown = rows.slice(0, 16);
  for (const [rowIndex, row] of shown.entries()) {
    const tr = document.createElement("tr");
    for (const cell of row) {
      const node = document.createElement(rowIndex === 0 && headerInput.checked ? "th" : "td");
      node.textContent = cell;
      tr.append(node);
    }
    table.append(tr);
  }
  preview.append(table);
  if (rows.length > shown.length) {
    const note = document.createElement("p");
    note.className = "muted";
    note.textContent = `Vista previa de ${shown.length} filas; el archivo descargado contiene todas.`;
    preview.append(note);
  }
}

async function clean() {
  if (!currentFile) return;
  cleanButton.disabled = true;
  setStatus("Limpiando el archivo en tu navegador…");
  try {
    const rows = engine.parseCsv(await currentFile.text(), delimiter());
    const report = engine.cleanRows(rows, {
      hasHeader: headerInput.checked,
      trimCells: trimInput.checked,
      collapseSpaces: collapseInput.checked,
      removeEmptyRows: emptyInput.checked,
      removeDuplicates: duplicateInput.checked,
      ignoreCase: ignoreCaseInput.checked,
      keyIndices: selectedKeyIndices()
    });
    summary.textContent = `${report.rowsInput} filas de datos → ${report.rowsOutput} · ${report.emptyRowsRemoved} vacías quitadas · ${report.duplicatesRemoved} duplicadas quitadas · ${report.trimmedCells} celdas normalizadas`;
    displayPreview(report.rows);
    const blob = new Blob([engine.toCsv(report.rows)], { type: "text/csv;charset=utf-8" });
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(blob);
    download.href = downloadUrl;
    download.download = `${currentFile.name.replace(/\.[^.]+$/, "")}_limpio.csv`;
    downloadArea.hidden = false;
    setStatus("Limpieza terminada. El original no ha cambiado.", "success");
  } catch (error) {
    setStatus(`No se ha podido limpiar: ${error.message || error}`, "error");
  } finally {
    cleanButton.disabled = !currentFile;
  }
}

async function loadExample() {
  const csv = "email;nombre;estado\n ana@example.com ; Ana ; activo\n\nANA@example.com;Ana;activo\n luis@example.com; Luis  ; pendiente\n";
  await loadFile(new File([csv], "contactos_desordenados.csv", { type: "text/csv" }));
  delimiterInput.value = ";";
  setStatus("Ejemplo cargado: hay una fila vacía, espacios sobrantes y un contacto repetido.");
}

function clearAll() {
  fileInput.value = "";
  currentFile = null;
  cleanButton.disabled = true;
  renderColumns([]);
  preview.replaceChildren();
  summary.textContent = "Todavía no hay resultados.";
  downloadArea.hidden = true;
  setStatus("Selecciona un archivo CSV.");
}

fileInput.addEventListener("change", () => loadFile(fileInput.files[0]).catch((error) => setStatus(error.message, "error")));
headerInput.addEventListener("change", () => { if (currentFile) loadFile(currentFile).catch((error) => setStatus(error.message, "error")); });
delimiterInput.addEventListener("change", () => { if (currentFile) loadFile(currentFile).catch((error) => setStatus(error.message, "error")); });
cleanButton.addEventListener("click", clean);
exampleButton.addEventListener("click", () => loadExample().catch((error) => setStatus(error.message, "error")));
clearButton.addEventListener("click", clearAll);
window.addEventListener("pagehide", () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); });

renderColumns([]);

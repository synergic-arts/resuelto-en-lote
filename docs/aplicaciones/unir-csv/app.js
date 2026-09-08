"use strict";

const MAX_FILES = 100;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;
const filesInput = document.querySelector("#files");
const delimiterInput = document.querySelector("#delimiter");
const mergeButton = document.querySelector("#merge");
const clearButton = document.querySelector("#clear");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
let downloadUrl = null;

function setStatus(message, kind) {
  status.textContent = message;
  status.className = "status" + (kind ? " " + kind : "");
}

function clearDownload() {
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
  results.replaceChildren();
}

function selectedDelimiter(text) {
  if (delimiterInput.value !== "auto") {
    return delimiterInput.value === "tab" ? "\t" : delimiterInput.value;
  }
  return ResueltoEnLoteCsv.detectDelimiter(text);
}

async function mergeFiles() {
  const files = [...filesInput.files];
  if (!files.length) return;
  if (files.length > MAX_FILES) {
    setStatus("Selecciona como maximo " + MAX_FILES + " archivos.", "error");
    return;
  }
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    setStatus("El lote supera el maximo recomendado de 200 MB.", "error");
    return;
  }
  clearDownload();
  mergeButton.disabled = true;
  filesInput.disabled = true;
  delimiterInput.disabled = true;
  try {
    const entries = [];
    for (const [index, file] of files.entries()) {
      setStatus("Leyendo " + (index + 1) + " de " + files.length + ": " + file.name);
      entries.push({ name: file.name, text: await file.text() });
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    const delimiter = selectedDelimiter(entries[0].text);
    const merged = ResueltoEnLoteCsv.mergeCsvFiles(entries, delimiter);
    if (!merged.headers.length) {
      setStatus("No se han encontrado cabeceras ni filas de datos.", "error");
      return;
    }
    const csv = ResueltoEnLoteCsv.toCsv(merged.headers, merged.rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    downloadUrl = URL.createObjectURL(blob);
    const item = document.createElement("li");
    item.className = "result-item";
    const summary = document.createElement("span");
    summary.textContent = merged.fileCount + " archivos unidos � " + merged.rowCount + " filas � " + merged.headers.length + " columnas";
    const link = document.createElement("a");
    link.className = "button secondary";
    link.href = downloadUrl;
    link.download = "datos-unidos.csv";
    link.textContent = "Descargar CSV";
    item.append(summary, link);
    results.append(item);
    setStatus("Listo: se ha creado un CSV nuevo. Los originales no han cambiado.");
  } catch (error) {
    setStatus("No se ha podido unir el lote: " + (error.message || error), "error");
  } finally {
    mergeButton.disabled = filesInput.files.length === 0;
    filesInput.disabled = false;
    delimiterInput.disabled = false;
  }
}

filesInput.addEventListener("change", () => {
  clearDownload();
  const count = filesInput.files.length;
  mergeButton.disabled = count === 0;
  setStatus(count ? count + " archivos preparados." : "Selecciona uno o varios archivos CSV.");
});

clearButton.addEventListener("click", () => {
  filesInput.value = "";
  clearDownload();
  mergeButton.disabled = true;
  setStatus("Seleccion y resultados eliminados. Los originales no han cambiado.");
});

mergeButton.addEventListener("click", () => mergeFiles());
window.addEventListener("pagehide", clearDownload);

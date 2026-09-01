"use strict";

const MAX_FILES = 100;
const MAX_TOTAL_BYTES = 250 * 1024 * 1024;
const WORKER_TIMEOUT_MS = 120000;

const filesInput = document.querySelector("#files");
const fileList = document.querySelector("#file-list");
const summary = document.querySelector("#summary");
const mergeButton = document.querySelector("#merge");
const clearButton = document.querySelector("#clear");
const status = document.querySelector("#status");
const downloadArea = document.querySelector("#download-area");
const downloadLink = document.querySelector("#download");
const resultSummary = document.querySelector("#result-summary");
const core = window.ResueltoEnLoteCore;

let items = [];
let nextId = 1;
let resultUrl = "";
let activeWorker = null;
let busy = false;

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = `status ${kind}`.trim();
}

function clearResult() {
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  resultUrl = "";
  downloadLink.removeAttribute("href");
  downloadArea.hidden = true;
  resultSummary.textContent = "";
}

function totalBytes() {
  return items.reduce((total, item) => total + item.file.size, 0);
}

function setBusy(value) {
  busy = value;
  filesInput.disabled = value;
  clearButton.disabled = value;
  mergeButton.disabled = value || items.length < 2;
  renderList();
}

function moveItem(index, offset) {
  const destination = index + offset;
  if (busy || destination < 0 || destination >= items.length) return;
  [items[index], items[destination]] = [items[destination], items[index]];
  clearResult();
  renderList();
  setStatus("Orden actualizado. Revisa la lista antes de unir los documentos.");
}

function removeItem(index) {
  if (busy) return;
  items.splice(index, 1);
  clearResult();
  renderList();
  setStatus(items.length ? "Documento eliminado de la lista." : "Elige los documentos que quieres unir.");
}

function actionButton(label, title, disabled, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "small secondary";
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", title);
  button.disabled = disabled;
  button.addEventListener("click", action);
  return button;
}

function renderList() {
  fileList.replaceChildren();
  items.forEach((item, index) => {
    const row = document.createElement("li");
    row.className = "file-row";
    const description = document.createElement("span");
    description.textContent = `${index + 1}. ${item.file.name} · ${core.formatBytes(item.file.size)}`;
    const actions = document.createElement("span");
    actions.className = "file-actions";
    actions.append(
      actionButton("↑", `Subir ${item.file.name}`, busy || index === 0, () => moveItem(index, -1)),
      actionButton("↓", `Bajar ${item.file.name}`, busy || index === items.length - 1, () => moveItem(index, 1)),
      actionButton("Quitar", `Quitar ${item.file.name}`, busy, () => removeItem(index))
    );
    row.append(description, actions);
    fileList.append(row);
  });
  const count = items.length;
  summary.textContent = count
    ? `${count} ${count === 1 ? "documento" : "documentos"} · ${core.formatBytes(totalBytes())} en total`
    : "Todavía no has seleccionado documentos.";
  mergeButton.disabled = busy || count < 2;
}

function looksLikePdf(file) {
  return file.type === "application/pdf" || file.name.toLocaleLowerCase("es").endsWith(".pdf");
}

async function hasPdfHeader(file) {
  const bytes = await file.slice(0, 1024).arrayBuffer();
  const prefix = new TextDecoder("latin1").decode(bytes);
  return prefix.includes("%PDF-");
}

async function addFiles(files) {
  const candidates = [...files].filter(looksLikePdf);
  const checks = await Promise.all(candidates.map(async (file) => ({ file, valid: await hasPdfHeader(file) })));
  const accepted = checks.filter((item) => item.valid).map((item) => item.file);
  const rejected = files.length - accepted.length;
  if (rejected) {
    setStatus(`${rejected} ${rejected === 1 ? "archivo no parece" : "archivos no parecen"} un PDF válido y no se ha añadido.`, "warning");
  }
  if (items.length + accepted.length > MAX_FILES) {
    setStatus(`No se pueden añadir más de ${MAX_FILES} documentos.`, "error");
    return;
  }
  const nextTotal = totalBytes() + accepted.reduce((total, file) => total + file.size, 0);
  if (nextTotal > MAX_TOTAL_BYTES) {
    setStatus("La selección supera 250 MB. Divide el trabajo en varios grupos para evitar que el navegador se quede sin memoria.", "error");
    return;
  }
  for (const file of accepted) items.push({ id: nextId++, file });
  clearResult();
  renderList();
  if (!rejected && items.length === 1) setStatus("Añade al menos otro PDF para poder unirlos.");
  else if (!rejected && items.length > 1) setStatus("Revisa el orden y pulsa «Unir PDF».");
}

async function readInputs() {
  const payload = [];
  for (const [index, item] of items.entries()) {
    setStatus(`Leyendo ${index + 1} de ${items.length}: ${item.file.name}`);
    const bytes = await item.file.arrayBuffer();
    const prefix = new TextDecoder("latin1").decode(bytes.slice(0, Math.min(bytes.byteLength, 1024)));
    if (!prefix.includes("%PDF-")) {
      throw new Error(`${item.file.name} no contiene una cabecera PDF válida.`);
    }
    payload.push({ name: item.file.name, bytes });
  }
  return payload;
}

function workerError(message) {
  if (activeWorker) activeWorker.terminate();
  activeWorker = null;
  setBusy(false);
  setStatus(message, "error");
}

async function mergeFiles() {
  if (busy || items.length < 2) return;
  clearResult();
  setBusy(true);
  let payload;
  try {
    payload = await readInputs();
  } catch (error) {
    setBusy(false);
    setStatus(error.message || "No se han podido leer los documentos.", "error");
    return;
  }

  setStatus("Preparando el proceso aislado de combinación…");
  activeWorker = new Worker("worker.js");
  const timeout = window.setTimeout(() => {
    workerError("La combinación ha superado dos minutos y se ha detenido para proteger el navegador. Prueba con menos documentos.");
  }, WORKER_TIMEOUT_MS);

  activeWorker.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data.type === "progress") {
      setStatus(`Combinados ${data.completed} de ${data.total} documentos · ${data.pageCount} páginas.`);
      return;
    }
    window.clearTimeout(timeout);
    if (data.type === "error") {
      workerError(data.message || "No se han podido combinar los documentos.");
      return;
    }
    if (data.type !== "done" || !(data.bytes instanceof ArrayBuffer) || data.bytes.byteLength === 0) {
      workerError("El proceso no ha devuelto un PDF válido.");
      return;
    }
    const blob = new Blob([data.bytes], { type: "application/pdf" });
    resultUrl = URL.createObjectURL(blob);
    downloadLink.href = resultUrl;
    resultSummary.textContent = `${data.inputCount} documentos · ${data.pageCount} páginas · ${core.formatBytes(blob.size)}`;
    downloadArea.hidden = false;
    activeWorker.terminate();
    activeWorker = null;
    setBusy(false);
    setStatus("PDF unido correctamente. Descárgalo y revisa todas las páginas antes de usarlo.");
  });

  activeWorker.addEventListener("error", () => {
    window.clearTimeout(timeout);
    workerError("El proceso aislado ha fallado. Comprueba los PDF o prueba con un grupo más pequeño.");
  });

  activeWorker.postMessage({ type: "merge", files: payload }, payload.map((item) => item.bytes));
}

filesInput.addEventListener("change", async () => {
  const selected = [...filesInput.files];
  filesInput.disabled = true;
  setStatus("Comprobando los documentos seleccionados…");
  try {
    await addFiles(selected);
  } catch (_error) {
    setStatus("No se han podido leer uno o varios documentos. Comprueba que sigan disponibles y vuelve a intentarlo.", "error");
  } finally {
    filesInput.value = "";
    filesInput.disabled = busy;
  }
});

mergeButton.addEventListener("click", () => {
  mergeFiles().catch((error) => workerError(error.message || "No se ha podido iniciar la combinación."));
});

clearButton.addEventListener("click", () => {
  items = [];
  filesInput.value = "";
  clearResult();
  renderList();
  setStatus("Lista eliminada. Los documentos originales no han cambiado.");
});

window.addEventListener("pagehide", () => {
  if (activeWorker) activeWorker.terminate();
  clearResult();
});

renderList();

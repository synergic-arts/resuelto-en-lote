"use strict";

const MAX_BYTES = 250 * 1024 * 1024;
const WORKER_TIMEOUT_MS = 120000;

const fileInput = document.querySelector("#file");
const fileSummary = document.querySelector("#file-summary");
const pagesInput = document.querySelector("#pages");
const pageHelp = document.querySelector("#page-help");
const extractButton = document.querySelector("#extract");
const clearButton = document.querySelector("#clear");
const status = document.querySelector("#status");
const downloadArea = document.querySelector("#download-area");
const downloadLink = document.querySelector("#download");
const resultSummary = document.querySelector("#result-summary");
const core = window.ResueltoEnLoteCore;

let selectedFile = null;
let resultUrl = "";
let worker = null;
let workerTimer = 0;
let pageCount = 0;
let busy = false;

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = `status ${kind}`.trim();
}

function clearResult() {
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  resultUrl = "";
  downloadLink.removeAttribute("href");
  resultSummary.textContent = "";
  downloadArea.hidden = true;
}

function looksLikePdf(file) {
  return file && (file.type === "application/pdf" || file.name.toLocaleLowerCase("es").endsWith(".pdf"));
}

async function hasPdfHeader(file) {
  const bytes = await file.slice(0, 1024).arrayBuffer();
  return new TextDecoder("latin1").decode(bytes).includes("%PDF-");
}

function parsePageSelection(value, maximum) {
  if (!value.trim()) throw new Error("Escribe al menos una página.");
  const pages = [];
  for (const rawPart of value.split(",")) {
    const part = rawPart.trim();
    if (!part) continue;
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    const single = part.match(/^\d+$/);
    if (!range && !single) throw new Error(`No entiendo «${part}». Usa páginas como 2 o rangos como 2-5.`);
    const start = Number(range ? range[1] : part);
    const end = Number(range ? range[2] : part);
    if (start < 1 || end < start || end > maximum) throw new Error(`Las páginas deben estar entre 1 y ${maximum}.`);
    for (let page = start; page <= end; page += 1) {
      if (!pages.includes(page)) pages.push(page);
    }
  }
  if (!pages.length) throw new Error("Escribe al menos una página.");
  return pages;
}

function stopWorker() {
  if (worker) worker.terminate();
  worker = null;
  window.clearTimeout(workerTimer);
}

function setBusy(value) {
  busy = value;
  fileInput.disabled = value;
  pagesInput.disabled = value || !selectedFile;
  extractButton.disabled = value || !selectedFile || !pageCount;
  clearButton.disabled = value;
}

function readWorkerMessage(message) {
  const data = message.data || {};
  if (data.type === "ready") {
    pageCount = Number(data.pageCount) || 0;
    pagesInput.disabled = false;
    extractButton.disabled = false;
    pageHelp.textContent = `Este documento tiene ${pageCount} ${pageCount === 1 ? "página" : "páginas"}. Usa páginas sueltas y rangos, por ejemplo: 1-3, 7.`;
    setStatus("Indica las páginas y pulsa «Extraer páginas».");
    stopWorker();
    return;
  }
  if (data.type === "error") {
    stopWorker();
    setBusy(false);
    setStatus(data.message || "No se ha podido leer el PDF.", "error");
    return;
  }
}

function inspectFile() {
  stopWorker();
  worker = new Worker("worker.js");
  worker.addEventListener("message", readWorkerMessage);
  worker.addEventListener("error", () => {
    stopWorker();
    setBusy(false);
    setStatus("No se ha podido leer el PDF. Comprueba que se abre correctamente y vuelve a intentarlo.", "error");
  });
  workerTimer = window.setTimeout(() => {
    stopWorker();
    setBusy(false);
    setStatus("La lectura ha superado dos minutos. Prueba con un documento más pequeño.", "error");
  }, WORKER_TIMEOUT_MS);
  selectedFile.arrayBuffer().then((bytes) => worker.postMessage({ type: "inspect", bytes }, [bytes])).catch(() => {
    stopWorker();
    setBusy(false);
    setStatus("No se ha podido leer el archivo seleccionado.", "error");
  });
}

async function selectFile(file) {
  selectedFile = null;
  pageCount = 0;
  clearResult();
  pagesInput.value = "";
  pagesInput.disabled = true;
  extractButton.disabled = true;
  if (!file || !looksLikePdf(file)) {
    setStatus("Selecciona un archivo PDF.", "error");
    fileSummary.textContent = "Todavía no has seleccionado ningún documento.";
    return;
  }
  if (file.size > MAX_BYTES) {
    setStatus("El PDF supera 250 MB. Prueba con una copia más pequeña.", "error");
    return;
  }
  setStatus("Comprobando la estructura del PDF…");
  if (!await hasPdfHeader(file)) {
    setStatus("Este archivo no contiene una cabecera PDF válida.", "error");
    return;
  }
  selectedFile = file;
  fileSummary.textContent = `${file.name} · ${core.formatBytes(file.size)}`;
  setBusy(true);
  setStatus("Leyendo el número de páginas dentro del navegador…");
  inspectFile();
}

function extractPages() {
  if (busy || !selectedFile || !pageCount) return;
  let pages;
  try {
    pages = parsePageSelection(pagesInput.value, pageCount);
  } catch (error) {
    setStatus(error.message, "error");
    return;
  }
  clearResult();
  setBusy(true);
  setStatus(`Extrayendo ${pages.length} ${pages.length === 1 ? "página" : "páginas"}…`);
  const outputWorker = new Worker("worker.js");
  worker = outputWorker;
  workerTimer = window.setTimeout(() => {
    stopWorker();
    setBusy(false);
    setStatus("La extracción ha superado dos minutos. Prueba con menos páginas o un documento más pequeño.", "error");
  }, WORKER_TIMEOUT_MS);
  outputWorker.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data.type === "error") {
      stopWorker();
      setBusy(false);
      setStatus(data.message || "No se han podido extraer las páginas.", "error");
      return;
    }
    if (data.type !== "done" || !(data.bytes instanceof ArrayBuffer) || data.bytes.byteLength === 0) return;
    stopWorker();
    const blob = new Blob([data.bytes], { type: "application/pdf" });
    resultUrl = URL.createObjectURL(blob);
    downloadLink.href = resultUrl;
    resultSummary.textContent = `${pages.length} ${pages.length === 1 ? "página extraída" : "páginas extraídas"} · ${core.formatBytes(blob.size)}`;
    downloadArea.hidden = false;
    setBusy(false);
    setStatus("PDF nuevo creado. Comprueba sus páginas antes de archivar el original.");
  });
  outputWorker.addEventListener("error", () => {
    stopWorker();
    setBusy(false);
    setStatus("El proceso aislado ha fallado. Comprueba el PDF o prueba con menos páginas.", "error");
  });
  selectedFile.arrayBuffer().then((bytes) => outputWorker.postMessage({ type: "extract", bytes, pages }, [bytes])).catch(() => {
    stopWorker();
    setBusy(false);
    setStatus("No se ha podido leer el PDF seleccionado.", "error");
  });
}

fileInput.addEventListener("change", () => selectFile(fileInput.files[0]));
pagesInput.addEventListener("input", clearResult);
extractButton.addEventListener("click", extractPages);
clearButton.addEventListener("click", () => {
  stopWorker();
  selectedFile = null;
  pageCount = 0;
  fileInput.value = "";
  pagesInput.value = "";
  fileSummary.textContent = "Todavía no has seleccionado ningún documento.";
  pageHelp.textContent = "Puedes usar páginas sueltas y rangos, por ejemplo: 1-3, 7, 10.";
  clearResult();
  setBusy(false);
  setStatus("Lista eliminada. El documento original no ha cambiado.");
});
window.addEventListener("pagehide", () => {
  stopWorker();
  clearResult();
});

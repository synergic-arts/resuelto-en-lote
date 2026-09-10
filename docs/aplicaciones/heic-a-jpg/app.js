import { heicTo } from "../../vendor/heic-to-1.5.2-csp.min.js";

const MAX_FILES = 50;
const MAX_FILE_BYTES = 40 * 1024 * 1024;
const MAX_TOTAL_BYTES = 300 * 1024 * 1024;
const filesInput = document.querySelector("#files");
const dropZone = document.querySelector("#drop-zone");
const qualityInput = document.querySelector("#quality");
const qualityValue = document.querySelector("#quality-value");
const destinationInput = document.querySelector("#destination");
const convertButton = document.querySelector("#convert");
const clearButton = document.querySelector("#clear");
const batchSummary = document.querySelector("#batch-summary");
const compatibility = document.querySelector("#compatibility");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const logic = window.HeicToJpgLogic;
const core = window.ResueltoEnLoteCore;

let selectedFiles = [];
let objectUrls = [];

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = `status ${kind}`.trim();
}

function releaseObjectUrls() {
  for (const url of objectUrls) URL.revokeObjectURL(url);
  objectUrls = [];
}

function clearResults() {
  releaseObjectUrls();
  results.replaceChildren();
}

async function validateHeicFile(file) {
  const header = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  return logic.isHeicSignature(header);
}

async function prepareFiles(fileList) {
  const candidates = [...fileList];
  clearResults();
  try {
    const summary = logic.validateBatch(candidates, {
      maxFiles: MAX_FILES,
      maxFileBytes: MAX_FILE_BYTES,
      maxTotalBytes: MAX_TOTAL_BYTES,
    });
    const checks = await Promise.all(candidates.map(validateHeicFile));
    const invalid = candidates.filter((_, index) => !checks[index]);
    if (invalid.length) {
      throw new Error(`${invalid[0].name} no contiene una imagen HEIC o HEIF válida.`);
    }
    selectedFiles = candidates;
    batchSummary.hidden = false;
    batchSummary.textContent = `${summary.count} ${summary.count === 1 ? "foto preparada" : "fotos preparadas"} · ${core.formatBytes(summary.totalBytes)}`;
    convertButton.disabled = false;
    setStatus("Lote comprobado. Puedes iniciar la conversión.");
  } catch (error) {
    selectedFiles = [];
    filesInput.value = "";
    batchSummary.hidden = true;
    convertButton.disabled = true;
    setStatus(error.message || String(error), "error");
  }
}

function addResult(filename, sourceName, beforeBytes, blob, saved) {
  const item = document.createElement("li");
  item.className = "result-item";
  const previewUrl = URL.createObjectURL(blob);
  objectUrls.push(previewUrl);
  const preview = document.createElement("img");
  preview.src = previewUrl;
  preview.alt = `Vista previa de ${filename}`;
  const copy = document.createElement("span");
  copy.className = "result-copy";
  const title = document.createElement("strong");
  title.textContent = filename;
  const details = document.createElement("small");
  details.textContent = `${sourceName} · ${core.formatBytes(beforeBytes)} → ${core.formatBytes(blob.size)}`;
  copy.append(title, details);
  if (saved) {
    const state = document.createElement("strong");
    state.textContent = "Guardada";
    item.append(preview, copy, state);
  } else {
    const link = document.createElement("a");
    link.className = "button secondary";
    link.href = previewUrl;
    link.download = filename;
    link.textContent = "Descargar";
    item.append(preview, copy, link);
  }
  results.append(item);
}

async function nameAvailable(directory, wanted) {
  const dot = wanted.lastIndexOf(".");
  const stem = dot > 0 ? wanted.slice(0, dot) : wanted;
  const extension = dot > 0 ? wanted.slice(dot) : "";
  for (let counter = 0; counter < 10000; counter += 1) {
    const candidate = counter === 0 ? wanted : `${stem}_${counter}${extension}`;
    try {
      await directory.getFileHandle(candidate);
    } catch (error) {
      if (error.name === "NotFoundError") return candidate;
      throw error;
    }
  }
  throw new Error(`No se ha encontrado un nombre libre para ${wanted}.`);
}

async function saveBlob(directory, filename, blob) {
  const safeName = await nameAvailable(directory, filename);
  const handle = await directory.getFileHandle(safeName, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(blob);
  } finally {
    await writable.close();
  }
  return safeName;
}

async function convertAll() {
  if (!selectedFiles.length) return;
  clearResults();
  convertButton.disabled = true;
  filesInput.disabled = true;
  qualityInput.disabled = true;
  destinationInput.disabled = true;
  const quality = Number(qualityInput.value) / 100;
  let directory = null;
  if (destinationInput.value === "folder" && "showDirectoryPicker" in window) {
    try {
      directory = await window.showDirectoryPicker({ mode: "readwrite" });
    } catch (error) {
      if (error.name === "AbortError") {
        setStatus("Conversión cancelada. No se ha creado ningún archivo.");
        return;
      }
      throw error;
    }
  }

  let completed = 0;
  let failed = 0;
  for (const [fileIndex, file] of selectedFiles.entries()) {
    setStatus(`Convirtiendo ${fileIndex + 1} de ${selectedFiles.length}: ${file.name}`);
    try {
      const blob = await heicTo({ blob: file, type: "image/jpeg", quality });
      const wanted = logic.outputName(file.name);
      if (directory) {
        const savedName = await saveBlob(directory, wanted, blob);
        addResult(savedName, file.name, file.size, blob, true);
      } else {
        addResult(wanted, file.name, file.size, blob, false);
      }
      completed += 1;
    } catch (error) {
      failed += 1;
      const item = document.createElement("li");
      item.className = "result-item error";
      item.textContent = `${file.name}: no se ha podido convertir (${error.message || error}).`;
      results.append(item);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
  setStatus(`Proceso terminado: ${completed} ${completed === 1 ? "JPG creado" : "JPG creados"}${failed ? ` y ${failed} ${failed === 1 ? "archivo con error" : "archivos con error"}` : ""}.`, failed ? "warning" : "");
  convertButton.disabled = false;
  filesInput.disabled = false;
  qualityInput.disabled = false;
  destinationInput.disabled = false;
}

function reset() {
  selectedFiles = [];
  filesInput.value = "";
  batchSummary.hidden = true;
  clearResults();
  convertButton.disabled = true;
  setStatus("Añade una o varias fotos HEIC.");
}

dropZone.addEventListener("click", () => filesInput.click());
dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    filesInput.click();
  }
});
for (const eventName of ["dragenter", "dragover"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
}
dropZone.addEventListener("drop", (event) => prepareFiles(event.dataTransfer.files));
filesInput.addEventListener("change", () => prepareFiles(filesInput.files));
qualityInput.addEventListener("input", () => { qualityValue.value = `${qualityInput.value} %`; });
destinationInput.addEventListener("change", () => {
  convertButton.textContent = destinationInput.value === "folder" ? "Elegir destino y convertir" : "Convertir el lote";
});
clearButton.addEventListener("click", reset);
convertButton.addEventListener("click", () => {
  convertAll().catch((error) => {
    setStatus(`No se ha podido completar la conversión: ${error.message || error}`, "error");
    convertButton.disabled = selectedFiles.length === 0;
    filesInput.disabled = false;
    qualityInput.disabled = false;
    destinationInput.disabled = false;
  });
});

if (!("showDirectoryPicker" in window)) {
  destinationInput.querySelector('option[value="folder"]').disabled = true;
  destinationInput.value = "downloads";
  compatibility.hidden = false;
  compatibility.textContent = "Este navegador no permite elegir una carpeta. Verás un botón de descarga para cada JPG.";
  convertButton.textContent = "Convertir el lote";
}

window.addEventListener("pagehide", releaseObjectUrls);

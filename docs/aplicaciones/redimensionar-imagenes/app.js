"use strict";

const MAX_FILES = 100;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;
const filesInput = document.querySelector("#files");
const widthInput = document.querySelector("#max-width");
const heightInput = document.querySelector("#max-height");
const formatInput = document.querySelector("#format");
const resizeButton = document.querySelector("#resize");
const clearButton = document.querySelector("#clear");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const core = window.ResueltoEnLoteCore;

function outputName(filename,mime){const text=String(filename||"imagen").trim()||"imagen";const dot=text.lastIndexOf(".");const stem=dot>0?text.slice(0,dot):text;const extension=mime==="image/jpeg"?"jpg":mime==="image/png"?"png":"webp";return stem+"-redimensionada."+extension;}
let objectUrls = [];

function setStatus(message, kind) {
  status.textContent = message;
  status.className = "status" + (kind ? " " + kind : "");
}

function clearResults() {
  for (const url of objectUrls) URL.revokeObjectURL(url);
  objectUrls = [];
  results.replaceChildren();
}

function addResult(filename, beforeBytes, afterBytes, url) {
  const item = document.createElement("li");
  item.className = "result-item";
  const saved = beforeBytes > 0 ? Math.round((1 - afterBytes / beforeBytes) * 100) : 0;
  const summary = document.createElement("span");
  const change = saved >= 0 ? String(saved) + " % menos" : String(Math.abs(saved)) + " % más";
  summary.textContent = filename + " · " + core.formatBytes(beforeBytes) + " → " + core.formatBytes(afterBytes) + " · " + change;
  const link = document.createElement("a");
  link.className = "button secondary";
  link.href = url;
  link.download = filename;
  link.textContent = "Descargar";
  item.append(summary, link);
  results.append(item);
}

async function resizeFile(file, maxWidth, maxHeight, mime) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: mime !== "image/jpeg" });
    if (!context) throw new Error("El navegador no ha podido preparar el lienzo.");
    if (mime === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error("El navegador no admite este formato.")),
      mime,
      0.88
    ));
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}

async function resizeAll() {
  const files = [...filesInput.files];
  if (!files.length) return;
  const maxWidth = Number(widthInput.value);
  const maxHeight = Number(heightInput.value);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (files.length > MAX_FILES) return setStatus("Selecciona como máximo " + MAX_FILES + " imágenes.", "error");
  if (totalBytes > MAX_TOTAL_BYTES) return setStatus("El lote supera el máximo recomendado de 200 MB.", "error");
  if (!Number.isInteger(maxWidth) || !Number.isInteger(maxHeight) || maxWidth < 1 || maxHeight < 1) return setStatus("Indica una anchura y una altura válidas.", "error");
  clearResults();
  resizeButton.disabled = true;
  filesInput.disabled = true;
  widthInput.disabled = true;
  heightInput.disabled = true;
  formatInput.disabled = true;
  let completed = 0;
  let failed = 0;
  for (const [index, file] of files.entries()) {
    setStatus("Procesando " + (index + 1) + " de " + files.length + ": " + file.name);
    try {
      const result = await resizeFile(file, maxWidth, maxHeight, formatInput.value);
      const url = URL.createObjectURL(result.blob);
      objectUrls.push(url);
      addResult(outputName(file.name, formatInput.value), file.size, result.blob.size, url);
      completed += 1;
    } catch (error) {
      failed += 1;
      const item = document.createElement("li");
      item.className = "result-item error";
      item.textContent = file.name + ": " + (error.message || "no se ha podido procesar");
      results.append(item);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
  const plural = completed === 1 ? "imagen preparada" : "imágenes preparadas";
  setStatus("Proceso terminado: " + completed + " " + plural + (failed ? " y " + failed + " " + (failed === 1 ? "error" : "errores") : "") + ".", failed ? "warning" : "");
  resizeButton.disabled = filesInput.files.length === 0;
  filesInput.disabled = false;
  widthInput.disabled = false;
  heightInput.disabled = false;
  formatInput.disabled = false;
}

filesInput.addEventListener("change", () => {
  clearResults();
  const count = filesInput.files.length;
  resizeButton.disabled = count === 0;
  setStatus(count ? String(count) + " " + (count === 1 ? "imagen preparada." : "imágenes preparadas.") : "Selecciona una o varias imágenes.");
});

clearButton.addEventListener("click", () => {
  filesInput.value = "";
  clearResults();
  resizeButton.disabled = true;
  setStatus("Selección y resultados eliminados. Los originales no han cambiado.");
});

resizeButton.addEventListener("click", () => resizeAll().catch((error) => {
  setStatus("No se ha podido completar el proceso: " + (error.message || error), "error");
  resizeButton.disabled = filesInput.files.length === 0;
  filesInput.disabled = false;
  widthInput.disabled = false;
  heightInput.disabled = false;
  formatInput.disabled = false;
}));

window.addEventListener("pagehide", clearResults);

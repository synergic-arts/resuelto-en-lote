"use strict";

const filesInput = document.querySelector("#files");
const qualityInput = document.querySelector("#quality");
const qualityValue = document.querySelector("#quality-value");
const destinationInput = document.querySelector("#destination");
const convertButton = document.querySelector("#convert");
const clearButton = document.querySelector("#clear");
const compatibility = document.querySelector("#compatibility");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const core = window.ResueltoEnLoteCore;

let objectUrls = [];

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = `status ${kind}`.trim();
}

function releaseDownloads() {
  for (const url of objectUrls) URL.revokeObjectURL(url);
  objectUrls = [];
}

function clearResults() {
  releaseDownloads();
  results.replaceChildren();
}

function addResult(filename, beforeBytes, afterBytes, downloadUrl = "") {
  const item = document.createElement("li");
  item.className = "result-item";
  const summary = document.createElement("span");
  const saved = beforeBytes > 0 ? Math.round((1 - afterBytes / beforeBytes) * 100) : 0;
  summary.textContent = `${filename} · ${core.formatBytes(beforeBytes)} → ${core.formatBytes(afterBytes)} · ${saved >= 0 ? `${saved} % menos` : `${Math.abs(saved)} % más`}`;
  const state = document.createElement(downloadUrl ? "a" : "strong");
  state.textContent = downloadUrl ? "Descargar" : "Guardada";
  if (downloadUrl) {
    state.href = downloadUrl;
    state.download = filename;
    state.className = "button secondary";
  }
  item.append(summary, state);
  results.append(item);
}

async function toWebp(file, quality) {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("El navegador no ha podido preparar el lienzo de conversión.");
    context.drawImage(bitmap, 0, 0);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (value) => value ? resolve(value) : reject(new Error("El navegador no admite la conversión de esta imagen a WebP.")),
        "image/webp",
        quality
      );
    });
  } finally {
    bitmap.close();
  }
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
  const files = [...filesInput.files];
  if (!files.length) return;
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
        setStatus("Conversión cancelada: no se ha escrito ningún archivo nuevo.");
        convertButton.disabled = false;
        filesInput.disabled = false;
        qualityInput.disabled = false;
        destinationInput.disabled = false;
        return;
      }
      throw error;
    }
  }

  let completed = 0;
  let failed = 0;
  for (const [index, file] of files.entries()) {
    setStatus(`Convirtiendo ${index + 1} de ${files.length}: ${file.name}`);
    try {
      const blob = await toWebp(file, quality);
      const wanted = core.webpName(file.name);
      if (directory) {
        const savedName = await saveBlob(directory, wanted, blob);
        addResult(savedName, file.size, blob.size);
      } else {
        const url = URL.createObjectURL(blob);
        objectUrls.push(url);
        addResult(wanted, file.size, blob.size, url);
      }
      completed += 1;
    } catch (error) {
      failed += 1;
      const item = document.createElement("li");
      item.className = "result-item error";
      item.textContent = `${file.name}: ${error.message || "no se ha podido convertir"}`;
      results.append(item);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  const destination = directory ? "en la carpeta elegida" : "como descargas preparadas";
  const completedLabel = completed === 1 ? "imagen" : "imágenes";
  const failedLabel = failed === 1 ? "error" : "errores";
  setStatus(`Conversión terminada: ${completed} ${completedLabel} ${destination}${failed ? ` y ${failed} ${failedLabel}` : ""}.`, failed ? "warning" : "");
  convertButton.disabled = false;
  filesInput.disabled = false;
  qualityInput.disabled = false;
  destinationInput.disabled = false;
}

qualityInput.addEventListener("input", () => {
  qualityValue.value = `${qualityInput.value} %`;
});

destinationInput.addEventListener("change", () => {
  convertButton.textContent = destinationInput.value === "folder" ? "Elegir destino y convertir" : "Preparar descargas";
});

filesInput.addEventListener("change", () => {
  clearResults();
  const count = filesInput.files.length;
  convertButton.disabled = count === 0;
  setStatus(count ? `${count} ${count === 1 ? "imagen preparada" : "imágenes preparadas"}.` : "Selecciona una o varias imágenes.");
});

clearButton.addEventListener("click", () => {
  filesInput.value = "";
  clearResults();
  convertButton.disabled = true;
  setStatus("Selección y resultados eliminados. Los archivos originales no han cambiado.");
});

convertButton.addEventListener("click", () => {
  convertAll().catch((error) => {
    setStatus(`No se ha podido completar la conversión: ${error.message || error}`, "error");
    convertButton.disabled = filesInput.files.length === 0;
    filesInput.disabled = false;
    qualityInput.disabled = false;
    destinationInput.disabled = false;
  });
});

if (!("showDirectoryPicker" in window)) {
  destinationInput.querySelector('option[value="folder"]').disabled = true;
  destinationInput.value = "downloads";
  compatibility.hidden = false;
  compatibility.textContent = "Tu navegador no permite elegir una carpeta de destino. La aplicación preparará un botón de descarga por cada imagen convertida.";
  convertButton.textContent = "Preparar descargas";
}

window.addEventListener("pagehide", releaseDownloads);

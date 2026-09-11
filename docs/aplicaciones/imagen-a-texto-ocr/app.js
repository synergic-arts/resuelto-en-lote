"use strict";

const MAX_FILES = 10;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const filesInput = document.querySelector("#files");
const dropZone = document.querySelector("#drop-zone");
const languageInput = document.querySelector("#language");
const layoutInput = document.querySelector("#layout");
const queue = document.querySelector("#queue");
const queueCount = document.querySelector("#queue-count");
const fileList = document.querySelector("#file-list");
const clearButton = document.querySelector("#clear");
const recognizeButton = document.querySelector("#recognize");
const status = document.querySelector("#status");
const progress = document.querySelector("#progress");
const results = document.querySelector("#results");
const emptyResult = document.querySelector("#empty-result");
const copyAllButton = document.querySelector("#copy-all");
const downloadAllButton = document.querySelector("#download-all");
const logic = window.ImageToTextOcrLogic;
const core = window.ResueltoEnLoteCore;

let selectedFiles = [];
let recognizedItems = [];
let runningWorker = null;

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = `status ${kind}`.trim();
}

function setProgress(value) {
  progress.style.width = `${Math.max(0, Math.min(100, value))}%`;
}

function downloadText(name, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function validateImage(file) {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const format = logic.imageFormat(header);
  if (!format) throw new Error(`${file.name} no contiene una imagen JPG, PNG, WebP o BMP válida.`);
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    if (bitmap.width * bitmap.height > MAX_PIXELS) throw new Error(`${file.name} supera el límite de 40 megapíxeles.`);
    return { format, width: bitmap.width, height: bitmap.height };
  } finally {
    if (bitmap) bitmap.close();
  }
}

function renderQueue(details) {
  queue.hidden = false;
  queueCount.textContent = `${details.length} ${details.length === 1 ? "imagen preparada" : "imágenes preparadas"}`;
  fileList.replaceChildren();
  for (const item of details) {
    const row = document.createElement("li");
    row.textContent = `${item.file.name} · ${item.width}×${item.height} · ${core.formatBytes(item.file.size)}`;
    fileList.append(row);
  }
}

async function prepareFiles(fileListValue) {
  const candidates = [...fileListValue];
  try {
    logic.validateBatch(candidates, { maxFiles: MAX_FILES, maxFileBytes: MAX_FILE_BYTES, maxTotalBytes: MAX_TOTAL_BYTES });
    const validations = [];
    for (const file of candidates) validations.push({ file, ...(await validateImage(file)) });
    selectedFiles = candidates;
    recognizedItems = [];
    results.replaceChildren();
    emptyResult.hidden = false;
    copyAllButton.disabled = true;
    downloadAllButton.disabled = true;
    renderQueue(validations);
    recognizeButton.disabled = false;
    setProgress(0);
    setStatus("Lote comprobado. Elige el idioma y comienza el reconocimiento.");
  } catch (error) {
    selectedFiles = [];
    filesInput.value = "";
    queue.hidden = true;
    recognizeButton.disabled = true;
    setStatus(error.message || String(error), "error");
  }
}

function currentTextItems() {
  return [...results.querySelectorAll(".ocr-card")].map((card) => ({
    name: card.dataset.name,
    text: card.querySelector("textarea").value,
  }));
}

function addResult(item) {
  const card = document.createElement("article");
  card.className = "ocr-card";
  card.dataset.name = item.name;
  const heading = document.createElement("header");
  const title = document.createElement("strong");
  title.textContent = item.name;
  const confidence = document.createElement("span");
  confidence.className = "confidence";
  confidence.textContent = `Confianza estimada: ${Math.round(item.confidence)} %`;
  heading.append(title, confidence);
  const textarea = document.createElement("textarea");
  textarea.value = item.text;
  textarea.setAttribute("aria-label", `Texto reconocido de ${item.name}`);
  const actions = document.createElement("footer");
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "secondary";
  copyButton.textContent = "Copiar";
  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(textarea.value);
    setStatus(`Texto de ${item.name} copiado.`);
  });
  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "secondary";
  saveButton.textContent = "Guardar TXT";
  saveButton.addEventListener("click", () => downloadText(logic.textFilename(item.name), textarea.value));
  actions.append(copyButton, saveButton);
  card.append(heading, textarea, actions);
  results.append(card);
}

function languageCodes() {
  return languageInput.value === "spa+eng" ? ["spa", "eng"] : languageInput.value;
}

async function recognizeAll() {
  if (!selectedFiles.length || runningWorker) return;
  recognizeButton.disabled = true;
  clearButton.disabled = true;
  filesInput.disabled = true;
  languageInput.disabled = true;
  layoutInput.disabled = true;
  dropZone.classList.add("processing");
  results.replaceChildren();
  emptyResult.hidden = true;
  recognizedItems = [];
  setProgress(1);
  setStatus("Preparando el motor OCR. La primera ejecución puede tardar un poco más.");
  let fileIndex = 0;
  let phaseProgress = 0;
  try {
    runningWorker = await Tesseract.createWorker(languageCodes(), Tesseract.OEM.LSTM_ONLY, {
      workerPath: new URL("../../vendor/tesseract-7.0.0/worker.min.js", location.href).href,
      corePath: new URL("../../vendor/tesseract-7.0.0/core", location.href).href,
      langPath: new URL("../../vendor/tesseract-7.0.0/lang", location.href).href,
      workerBlobURL: false,
      gzip: false,
      logger: (message) => {
        if (message.status === "recognizing text" && Number.isFinite(message.progress)) phaseProgress = message.progress;
        const value = ((fileIndex + phaseProgress) / selectedFiles.length) * 100;
        setProgress(Math.max(2, value));
      },
    });
    await runningWorker.setParameters({ tessedit_pageseg_mode: layoutInput.value });
    for (fileIndex = 0; fileIndex < selectedFiles.length; fileIndex += 1) {
      phaseProgress = 0;
      const file = selectedFiles[fileIndex];
      setStatus(`Leyendo ${fileIndex + 1} de ${selectedFiles.length}: ${file.name}`);
      const result = await runningWorker.recognize(file);
      const item = {
        name: file.name,
        text: logic.cleanRecognizedText(result.data.text),
        confidence: Number(result.data.confidence || 0),
      };
      recognizedItems.push(item);
      addResult(item);
      setProgress(((fileIndex + 1) / selectedFiles.length) * 100);
    }
    copyAllButton.disabled = false;
    downloadAllButton.disabled = false;
    setStatus(`Proceso terminado: texto extraído de ${recognizedItems.length} ${recognizedItems.length === 1 ? "imagen" : "imágenes"}. Revisa posibles errores antes de usarlo.`);
  } catch (error) {
    setStatus(`No se ha podido completar el OCR: ${error.message || error}`, "error");
  } finally {
    if (runningWorker) await runningWorker.terminate().catch(() => {});
    runningWorker = null;
    recognizeButton.disabled = selectedFiles.length === 0;
    clearButton.disabled = false;
    filesInput.disabled = false;
    languageInput.disabled = false;
    layoutInput.disabled = false;
    dropZone.classList.remove("processing");
  }
}

function reset() {
  if (runningWorker) return;
  selectedFiles = [];
  recognizedItems = [];
  filesInput.value = "";
  queue.hidden = true;
  results.replaceChildren();
  emptyResult.hidden = false;
  recognizeButton.disabled = true;
  copyAllButton.disabled = true;
  downloadAllButton.disabled = true;
  setProgress(0);
  setStatus("Añade una o varias imágenes.");
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
window.addEventListener("paste", (event) => {
  if (runningWorker) return;
  const images = [...event.clipboardData.files].filter((file) => file.type.startsWith("image/"));
  if (!images.length) return;
  const renamed = images.map((file, index) => new File([file], `imagen-pegada-${index + 1}.${file.type.split("/")[1] || "png"}`, { type: file.type }));
  prepareFiles(renamed);
});
clearButton.addEventListener("click", reset);
recognizeButton.addEventListener("click", recognizeAll);
copyAllButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(logic.combinedText(currentTextItems()));
  setStatus("Todo el texto se ha copiado al portapapeles.");
});
downloadAllButton.addEventListener("click", () => downloadText("texto-extraido-ocr.txt", logic.combinedText(currentTextItems())));
window.addEventListener("pagehide", () => { if (runningWorker) runningWorker.terminate(); });

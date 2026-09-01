"use strict";

const MAX_FILES = 100;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;
const A4 = { portrait: [595.28, 841.89], landscape: [841.89, 595.28] };

const filesInput = document.querySelector("#files");
const fileList = document.querySelector("#file-list");
const summary = document.querySelector("#summary");
const createButton = document.querySelector("#create");
const clearButton = document.querySelector("#clear");
const pageMode = document.querySelector("#page-mode");
const marginInput = document.querySelector("#margin");
const status = document.querySelector("#status");
const downloadArea = document.querySelector("#download-area");
const downloadLink = document.querySelector("#download");
const resultSummary = document.querySelector("#result-summary");
const core = window.ResueltoEnLoteCore;

let items = [];
let nextId = 1;
let resultUrl = "";
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
    ? `${count} ${count === 1 ? "imagen" : "imágenes"} · ${core.formatBytes(totalBytes())} en total`
    : "Todavía no has seleccionado imágenes.";
  createButton.disabled = busy || count === 0;
}

function setBusy(value) {
  busy = value;
  filesInput.disabled = value;
  clearButton.disabled = value;
  pageMode.disabled = value;
  marginInput.disabled = value;
  renderList();
}

function moveItem(index, offset) {
  const destination = index + offset;
  if (busy || destination < 0 || destination >= items.length) return;
  [items[index], items[destination]] = [items[destination], items[index]];
  clearResult();
  renderList();
  setStatus("Orden actualizado. Revisa la lista antes de crear el PDF.");
}

function removeItem(index) {
  if (busy) return;
  items.splice(index, 1);
  clearResult();
  renderList();
  setStatus(items.length ? "Imagen eliminada de la lista." : "Elige las imágenes que quieres convertir.");
}

async function imageKind(file) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return "png";
  return "";
}

async function addFiles(files) {
  const checked = await Promise.all([...files].map(async (file) => ({ file, kind: await imageKind(file) })));
  const accepted = checked.filter((item) => item.kind);
  const rejected = files.length - accepted.length;
  if (items.length + accepted.length > MAX_FILES) {
    setStatus(`No se pueden añadir más de ${MAX_FILES} imágenes.`, "error");
    return;
  }
  const nextTotal = totalBytes() + accepted.reduce((total, item) => total + item.file.size, 0);
  if (nextTotal > MAX_TOTAL_BYTES) {
    setStatus("La selección supera 200 MB. Divide el trabajo en varios grupos para evitar que el navegador se quede sin memoria.", "error");
    return;
  }
  for (const item of accepted) items.push({ id: nextId++, file: item.file, kind: item.kind });
  clearResult();
  renderList();
  if (rejected) setStatus(`${rejected} ${rejected === 1 ? "archivo no es" : "archivos no son"} una imagen JPG o PNG válida y no se ha añadido.`, "warning");
  else setStatus("Revisa el orden y pulsa «Crear PDF».");
}

function pageDimensions(image) {
  const mode = pageMode.value;
  const margin = Number(marginInput.value);
  if (mode === "image") return [Math.max(72, image.width * 0.75 + margin * 2), Math.max(72, image.height * 0.75 + margin * 2)];
  if (mode === "portrait") return A4.portrait;
  if (mode === "landscape") return A4.landscape;
  return image.width > image.height ? A4.landscape : A4.portrait;
}

async function createPdf() {
  if (busy || !items.length) return;
  clearResult();
  setBusy(true);
  try {
    const pdf = await window.PDFLib.PDFDocument.create();
    for (const [index, item] of items.entries()) {
      setStatus(`Añadiendo ${index + 1} de ${items.length}: ${item.file.name}`);
      const bytes = await item.file.arrayBuffer();
      const embedded = item.kind === "jpg" ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
      const [pageWidth, pageHeight] = pageDimensions(embedded);
      const margin = Number(marginInput.value);
      const availableWidth = Math.max(1, pageWidth - margin * 2);
      const availableHeight = Math.max(1, pageHeight - margin * 2);
      const scale = Math.min(availableWidth / embedded.width, availableHeight / embedded.height);
      const width = embedded.width * scale;
      const height = embedded.height * scale;
      const page = pdf.addPage([pageWidth, pageHeight]);
      page.drawImage(embedded, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height });
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    }
    const output = await pdf.save({ addDefaultPage: false, updateFieldAppearances: false });
    const blob = new Blob([output], { type: "application/pdf" });
    resultUrl = URL.createObjectURL(blob);
    downloadLink.href = resultUrl;
    resultSummary.textContent = `${items.length} ${items.length === 1 ? "imagen" : "imágenes"} · ${items.length} ${items.length === 1 ? "página" : "páginas"} · ${core.formatBytes(blob.size)}`;
    downloadArea.hidden = false;
    setStatus("PDF creado correctamente. Descárgalo y revisa sus páginas antes de usarlo.");
  } catch (_error) {
    setStatus("No se ha podido crear el PDF. Comprueba las imágenes o prueba con un grupo más pequeño.", "error");
  } finally {
    setBusy(false);
  }
}

filesInput.addEventListener("change", async () => {
  const selected = [...filesInput.files];
  filesInput.disabled = true;
  setStatus("Comprobando las imágenes seleccionadas…");
  try {
    await addFiles(selected);
  } catch (_error) {
    setStatus("No se han podido leer una o varias imágenes. Vuelve a seleccionarlas.", "error");
  } finally {
    filesInput.value = "";
    filesInput.disabled = busy;
  }
});

createButton.addEventListener("click", () => createPdf());
clearButton.addEventListener("click", () => {
  items = [];
  filesInput.value = "";
  clearResult();
  renderList();
  setStatus("Lista eliminada. Las imágenes originales no han cambiado.");
});
window.addEventListener("pagehide", clearResult);
renderList();

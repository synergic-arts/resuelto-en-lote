"use strict";

const MAX_FILES = 5000;
const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;
const filesInput = document.querySelector("#files");
const scanButton = document.querySelector("#scan");
const clearButton = document.querySelector("#clear");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
let reportUrl = null;

function setStatus(message, kind) {
  status.textContent = message;
  status.className = "status" + (kind ? " " + kind : "");
}

function clearReport() {
  if (reportUrl) {
    URL.revokeObjectURL(reportUrl);
    reportUrl = null;
  }
  results.replaceChildren();
}

function pathFor(file) {
  return file.webkitRelativePath || file.name || "archivo";
}

function renderGroups(groups) {
  clearReport();
  if (!groups.length) {
    setStatus("No se han encontrado duplicados exactos en este lote.");
    const item = document.createElement("li");
    item.className = "result-item";
    item.textContent = "Cada grupo se compara por tama�o y SHA-256 del contenido completo.";
    results.append(item);
    return;
  }
  const totalBytes = groups.reduce((sum, group) => sum + Number(group[0].size) * (group.length - 1), 0);
  const summary = document.createElement("li");
  summary.className = "result-item";
  const heading = document.createElement("strong");
  heading.textContent = groups.length + " grupos duplicados � " + groups.reduce((sum, group) => sum + group.length, 0) + " archivos";
  const detail = document.createElement("span");
  detail.textContent = " � " + ResueltoEnLoteCore.formatBytes(totalBytes) + " en copias adicionales";
  summary.append(heading, detail);
  results.append(summary);
  groups.forEach((group, index) => {
    const item = document.createElement("li");
    item.className = "result-item";
    const title = document.createElement("strong");
    title.textContent = "Grupo " + (index + 1) + " � " + group.length + " copias � " + ResueltoEnLoteCore.formatBytes(group[0].size);
    const list = document.createElement("ul");
    list.className = "nested-list";
    for (const record of group) {
      const pathItem = document.createElement("li");
      pathItem.textContent = record.path;
      list.append(pathItem);
    }
    item.append(title, list);
    results.append(item);
  });
}

async function scanFiles() {
  const files = [...filesInput.files];
  if (!files.length) return;
  if (files.length > MAX_FILES) {
    setStatus("Selecciona como maximo " + MAX_FILES + " archivos.", "error");
    return;
  }
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    setStatus("El lote supera el maximo recomendado de 1 GB.", "error");
    return;
  }
  clearReport();
  scanButton.disabled = true;
  filesInput.disabled = true;
  try {
    const candidates = ResueltoEnLoteDuplicates.groupCandidates(files);
    const records = [];
    let processed = 0;
    for (const group of candidates) {
      for (const file of group) {
        setStatus("Comprobando " + (processed + 1) + " de " + candidates.reduce((sum, item) => sum + item.length, 0) + ": " + pathFor(file));
        const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
        records.push({ path: pathFor(file), size: file.size, hash: ResueltoEnLoteDuplicates.bytesToHex(hash) });
        processed += 1;
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
    }
    const groups = ResueltoEnLoteDuplicates.buildDuplicateGroups(records);
    renderGroups(groups);
    if (groups.length) {
      const csv = ResueltoEnLoteDuplicates.reportCsv(groups);
      reportUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const linkItem = document.createElement("li");
      linkItem.className = "result-item";
      const link = document.createElement("a");
      link.className = "button secondary";
      link.href = reportUrl;
      link.download = "duplicados-sha256.csv";
      link.textContent = "Descargar informe CSV";
      linkItem.append(link);
      results.append(linkItem);
      setStatus("Proceso terminado: revisa las rutas antes de mover cualquier copia.");
    }
  } catch (error) {
    setStatus("No se ha podido analizar el lote: " + (error.message || error), "error");
  } finally {
    scanButton.disabled = filesInput.files.length === 0;
    filesInput.disabled = false;
  }
}

filesInput.addEventListener("change", () => {
  clearReport();
  const count = filesInput.files.length;
  scanButton.disabled = count === 0;
  setStatus(count ? count + " archivos preparados." : "Selecciona una carpeta o varios archivos.");
});

clearButton.addEventListener("click", () => {
  filesInput.value = "";
  clearReport();
  scanButton.disabled = true;
  setStatus("Seleccion y resultados eliminados. Los originales no han cambiado.");
});

scanButton.addEventListener("click", () => scanFiles());
window.addEventListener("pagehide", clearReport);

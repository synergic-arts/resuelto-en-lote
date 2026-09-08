"use strict";

const inputA = document.querySelector("#file-a");
const inputB = document.querySelector("#file-b");
const modeInput = document.querySelector("#match-mode");
const headerInput = document.querySelector("#has-header");
const delimiterInput = document.querySelector("#delimiter");
const keyInput = document.querySelector("#key-column");
const compareButton = document.querySelector("#compare");
const exampleButton = document.querySelector("#example");
const clearButton = document.querySelector("#clear");
const status = document.querySelector("#status");
const summary = document.querySelector("#summary");
const results = document.querySelector("#results");
const downloadArea = document.querySelector("#download-area");
const download = document.querySelector("#download");
const engine = window.ResueltoEnLoteCsvCompare;
let files = { a: null, b: null };
let downloadUrl = null;

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = `status ${kind}`.trim();
}

function currentFiles() {
  return files.a && files.b ? files : null;
}

function setFiles(a, b) {
  files = { a, b };
  compareButton.disabled = !currentFiles();
  setStatus(currentFiles() ? `Listos: ${a.name} y ${b.name}.` : "Selecciona los dos archivos CSV.");
}

function populateKeyColumn(headers) {
  keyInput.replaceChildren();
  for (const header of headers) {
    const option = document.createElement("option");
    option.value = header;
    option.textContent = header;
    keyInput.append(option);
  }
  keyInput.disabled = modeInput.value === "position" || !headers.length;
}

function displayReport(report) {
  summary.textContent = `${report.added} añadidas · ${report.removed} eliminadas · ${report.changed} modificadas · ${report.unchanged} sin cambios`;
  results.replaceChildren();
  const visible = report.differences.slice(0, 200);
  for (const item of visible) {
    const article = document.createElement("article");
    article.className = `diff-card ${item.status}`;
    const heading = document.createElement("h3");
    heading.textContent = `${item.status === "added" ? "Añadida" : item.status === "removed" ? "Eliminada" : "Modificada"}: ${item.key}`;
    article.append(heading);
    if (item.status === "changed") {
      const list = document.createElement("ul");
      for (const change of item.changes) {
        const line = document.createElement("li");
        line.textContent = `${change.column}: «${change.before}» → «${change.after}»`;
        list.append(line);
      }
      article.append(list);
    } else {
      const details = document.createElement("p");
      details.textContent = item.status === "added" ? item.after.join(" · ") : item.before.join(" · ");
      article.append(details);
    }
    results.append(article);
  }
  if (report.differences.length > visible.length) {
    const more = document.createElement("p");
    more.className = "muted";
    more.textContent = `Se muestran las primeras ${visible.length} diferencias. El CSV descargable contiene todas.`;
    results.append(more);
  }
}

async function compare() {
  const selected = currentFiles();
  if (!selected) return;
  compareButton.disabled = true;
  downloadArea.hidden = true;
  setStatus("Leyendo y comparando los dos archivos…");
  try {
    const [textA, textB] = await Promise.all([selected.a.text(), selected.b.text()]);
    const delimiter = delimiterInput.value === "auto" ? engine.detectDelimiter(textA) : delimiterInput.value;
    const rowsA = engine.parseCsv(textA, delimiter);
    const rowsB = engine.parseCsv(textB, delimiter);
    if (!rowsA.length || !rowsB.length) throw new Error("Uno de los archivos no contiene filas legibles.");
    const report = engine.compareTables(rowsA, rowsB, {
      hasHeader: headerInput.checked,
      mode: modeInput.value,
      keyHeader: keyInput.value
    });
    displayReport(report);
    const blob = new Blob([engine.differencesCsv(report)], { type: "text/csv;charset=utf-8" });
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(blob);
    download.href = downloadUrl;
    download.download = "diferencias-csv.csv";
    downloadArea.hidden = false;
    setStatus(`Comparación terminada: ${report.differences.length} diferencias encontradas.`, report.differences.length ? "warning" : "success");
  } catch (error) {
    setStatus(`No se ha podido comparar: ${error.message || error}`, "error");
  } finally {
    compareButton.disabled = !currentFiles();
  }
}

async function loadExample() {
  const a = new File(["id;cliente;importe\n101;Ana;25\n102;Luis;40\n103;Marta;15\n"], "pedidos_ayer.csv", { type: "text/csv" });
  const b = new File(["id;cliente;importe\n101;Ana;25\n102;Luis;55\n104;Nuria;31\n"], "pedidos_hoy.csv", { type: "text/csv" });
  delimiterInput.value = ";";
  modeInput.value = "key";
  headerInput.checked = true;
  setFiles(a, b);
  const rows = engine.parseCsv(await a.text(), ";");
  populateKeyColumn(engine.tableModel(rows, true).headers);
  setStatus("Ejemplo cargado: hay una fila eliminada, una añadida y un importe modificado.");
}

function clearAll() {
  inputA.value = "";
  inputB.value = "";
  files = { a: null, b: null };
  compareButton.disabled = true;
  results.replaceChildren();
  summary.textContent = "Todavía no hay resultados.";
  downloadArea.hidden = true;
  setStatus("Selecciona los dos archivos CSV.");
}

inputA.addEventListener("change", () => {
  files.a = inputA.files[0] || null;
  compareButton.disabled = !currentFiles();
  setStatus(files.a ? `Archivo A preparado: ${files.a.name}.` : "Selecciona los dos archivos CSV.");
});
inputB.addEventListener("change", () => {
  files.b = inputB.files[0] || null;
  compareButton.disabled = !currentFiles();
  setStatus(currentFiles() ? `Listos: ${files.a.name} y ${files.b.name}.` : "Selecciona los dos archivos CSV.");
});
modeInput.addEventListener("change", () => { keyInput.disabled = modeInput.value === "position"; });
headerInput.addEventListener("change", () => { if (!headerInput.checked) keyInput.disabled = true; });
delimiterInput.addEventListener("change", () => {
  if (files.a) files.a.text().then((text) => populateKeyColumn(engine.tableModel(engine.parseCsv(text, delimiterInput.value === "auto" ? engine.detectDelimiter(text) : delimiterInput.value), headerInput.checked).headers));
});
compareButton.addEventListener("click", compare);
exampleButton.addEventListener("click", () => loadExample().catch((error) => setStatus(error.message, "error")));
clearButton.addEventListener("click", clearAll);
window.addEventListener("pagehide", () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); });

populateKeyColumn([]);

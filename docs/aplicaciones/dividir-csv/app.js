(function () {
  "use strict";

  const engine = window.ResueltoEnLoteCsvSplitter;
  const fileInput = document.querySelector("#file");
  const input = document.querySelector("#csv-input");
  const delimiterInput = document.querySelector("#delimiter");
  const rowsInput = document.querySelector("#rows-per-file");
  const headerInput = document.querySelector("#has-header");
  const repeatHeaderInput = document.querySelector("#repeat-header");
  const splitButton = document.querySelector("#split");
  const exampleButton = document.querySelector("#example");
  const clearButton = document.querySelector("#clear");
  const status = document.querySelector("#status");
  const summary = document.querySelector("#summary");
  const preview = document.querySelector("#preview");
  const downloadArea = document.querySelector("#download-area");
  const fileList = document.querySelector("#file-list");
  let baseName = "datos-divididos";
  let downloadUrls = [];

  function setStatus(message, kind = "") {
    status.textContent = message;
    status.className = `status ${kind}`.trim();
  }

  function selectedDelimiter() {
    return delimiterInput.value === "tab" ? "\t" : delimiterInput.value;
  }

  function safeBaseName(name) {
    const withoutExtension = String(name || "datos").replace(/\.[^.]+$/, "");
    return withoutExtension.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "datos";
  }

  function outputName(index, total) {
    const width = Math.max(3, String(total).length);
    return `${baseName}-parte-${String(index).padStart(width, "0")}.csv`;
  }

  function revokeDownloads() {
    downloadUrls.forEach((url) => URL.revokeObjectURL(url));
    downloadUrls = [];
  }

  function renderPreview(rows, rowCount) {
    preview.replaceChildren();
    const table = document.createElement("table");
    const visibleRows = rows.slice(0, 7);
    visibleRows.forEach((row, rowIndex) => {
      const tr = document.createElement("tr");
      row.forEach((value) => {
        const cell = document.createElement(rowIndex === 0 && headerInput.checked ? "th" : "td");
        cell.textContent = value;
        tr.append(cell);
      });
      table.append(tr);
    });
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    wrap.append(table);
    preview.append(wrap);
    if (rowCount > visibleRows.length) {
      const note = document.createElement("p");
      note.className = "muted";
      note.textContent = `Vista previa de ${visibleRows.length} filas; la división contiene ${rowCount} filas de datos.`;
      preview.append(note);
    }
  }

  function renderDownloads(result, delimiter) {
    revokeDownloads();
    fileList.replaceChildren();
    result.chunks.forEach((chunk) => {
      const name = outputName(chunk.index, result.chunks.length);
      const csv = engine.toCsv(chunk.rows, delimiter);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      downloadUrls.push(url);
      const item = document.createElement("li");
      item.className = "file-row";
      const detail = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = name;
      const note = document.createElement("small");
      note.textContent = ` · ${chunk.dataRows} ${chunk.dataRows === 1 ? "fila" : "filas"} de datos`;
      detail.append(strong, note);
      const link = document.createElement("a");
      link.className = "button small";
      link.href = url;
      link.download = name;
      link.textContent = "Descargar";
      item.append(detail, link);
      fileList.append(item);
    });
    downloadArea.hidden = false;
  }

  async function loadFile(file) {
    if (!file) return;
    input.value = await file.text();
    baseName = safeBaseName(file.name);
    splitButton.disabled = false;
    setStatus(`${file.name} está listo. Elige el tamaño de cada parte y pulsa «Dividir CSV».`);
  }

  function split() {
    downloadArea.hidden = true;
    splitButton.disabled = true;
    setStatus("Leyendo el CSV y preparando las partes en tu navegador…");
    try {
      const parsed = engine.parseCsv(input.value, delimiterInput.value);
      const result = engine.splitRows(parsed.rows, {
        rowsPerFile: rowsInput.value,
        hasHeader: headerInput.checked,
        repeatHeader: repeatHeaderInput.checked
      });
      renderPreview(result.chunks[0].rows, result.dataRows);
      renderDownloads(result, parsed.delimiter);
      const headerNote = result.hasHeader ? (result.repeatHeader ? " · cabecera repetida en cada parte" : " · cabecera solo en la primera parte") : " · sin cabecera";
      summary.textContent = `${result.dataRows} ${result.dataRows === 1 ? "fila" : "filas"} de datos → ${result.chunks.length} ${result.chunks.length === 1 ? "archivo" : "archivos"}${headerNote}`;
      setStatus(`Listo: se han creado ${result.chunks.length} archivos descargables.`, "success");
    } catch (error) {
      setStatus(error.message || String(error), "error");
    } finally {
      splitButton.disabled = !input.value.trim();
    }
  }

  function loadExample() {
    input.value = [
      "pedido,cliente,ciudad,importe",
      "1001,\"Ana, García\",Madrid,125.50",
      "1002,Luis,Valencia,84.00",
      "1003,\"María\nLópez\",Sevilla,210.00",
      "1004,Pedro,Bilbao,49.95",
      "1005,Sofía,Zaragoza,72.10"
    ].join("\n");
    baseName = "pedidos-ejemplo";
    rowsInput.value = 2;
    headerInput.checked = true;
    repeatHeaderInput.checked = true;
    splitButton.disabled = false;
    setStatus("Ejemplo cargado: incluye una coma y un salto de línea dentro de una celda.");
  }

  function clearAll() {
    revokeDownloads();
    input.value = "";
    fileInput.value = "";
    splitButton.disabled = true;
    preview.replaceChildren();
    fileList.replaceChildren();
    downloadArea.hidden = true;
    summary.textContent = "Todavía no hay resultados.";
    setStatus("Pega un CSV o selecciona un archivo.");
  }

  input.addEventListener("input", () => { splitButton.disabled = !input.value.trim(); });
  fileInput.addEventListener("change", () => loadFile(fileInput.files[0]).catch((error) => setStatus(error.message, "error")));
  splitButton.addEventListener("click", split);
  exampleButton.addEventListener("click", loadExample);
  clearButton.addEventListener("click", clearAll);
  window.addEventListener("pagehide", revokeDownloads);
})();

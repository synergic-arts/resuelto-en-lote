(function () {
  "use strict";

  const engine = window.ResueltoEnLoteCsvToJson;
  const fileInput = document.querySelector("#file");
  const input = document.querySelector("#csv-input");
  const delimiterInput = document.querySelector("#delimiter");
  const headerInput = document.querySelector("#has-header");
  const trimInput = document.querySelector("#trim");
  const prettyInput = document.querySelector("#pretty");
  const convertButton = document.querySelector("#convert");
  const exampleButton = document.querySelector("#example");
  const clearButton = document.querySelector("#clear");
  const copyButton = document.querySelector("#copy");
  const status = document.querySelector("#status");
  const summary = document.querySelector("#summary");
  const preview = document.querySelector("#preview");
  const output = document.querySelector("#json-output");
  const downloadArea = document.querySelector("#download-area");
  const download = document.querySelector("#download");
  let baseName = "datos-convertidos";
  let downloadUrl = null;
  let lastJson = "";

  function setStatus(message, kind = "") {
    status.textContent = message;
    status.className = `status ${kind}`.trim();
  }

  function revokeDownload() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }

  function renderPreview(result) {
    preview.replaceChildren();
    const table = document.createElement("table");
    const rows = [result.headers, ...result.records.slice(0, 8).map((record) => result.headers.map((header) => record[header]))];
    rows.forEach((row, rowIndex) => {
      const tr = document.createElement("tr");
      row.forEach((value) => {
        const cell = document.createElement(rowIndex === 0 ? "th" : "td");
        cell.textContent = value;
        tr.append(cell);
      });
      table.append(tr);
    });
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    wrap.append(table);
    preview.append(wrap);
    if (result.records.length > 8) {
      const note = document.createElement("p");
      note.className = "muted";
      note.textContent = `Vista previa de 8 filas; el JSON contiene los ${result.records.length} registros.`;
      preview.append(note);
    }
  }

  async function loadFile(file) {
    if (!file) return;
    input.value = await file.text();
    baseName = (file.name.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}_-]+/gu, "-") || "datos") + "-json";
    convertButton.disabled = false;
    setStatus(`${file.name} está listo. Pulsa «Convertir a JSON».`);
  }

  function convert() {
    convertButton.disabled = true;
    downloadArea.hidden = true;
    setStatus("Convirtiendo el CSV en tu navegador…");
    try {
      const parsed = engine.parseCsv(input.value, delimiterInput.value);
      const result = engine.rowsToRecords(parsed.rows, { hasHeader: headerInput.checked, trim: trimInput.checked });
      lastJson = engine.toJson(result.records, prettyInput.checked);
      output.textContent = lastJson;
      renderPreview(result);
      summary.textContent = `${result.dataRows} ${result.dataRows === 1 ? "fila" : "filas"} → ${result.records.length} ${result.records.length === 1 ? "objeto" : "objetos"} · ${result.headers.length} campos · separador ${parsed.delimiter === "\t" ? "tabulador" : parsed.delimiter}`;
      revokeDownload();
      downloadUrl = URL.createObjectURL(new Blob([lastJson], { type: "application/json;charset=utf-8" }));
      download.href = downloadUrl;
      download.download = `${baseName}.json`;
      downloadArea.hidden = false;
      setStatus("Conversión terminada. El JSON está listo para copiar o descargar.", "success");
    } catch (error) {
      output.textContent = "";
      setStatus(error.message || String(error), "error");
    } finally {
      convertButton.disabled = !input.value.trim();
    }
  }

  async function copyJson() {
    if (!lastJson) return;
    try {
      await navigator.clipboard.writeText(lastJson);
      setStatus("JSON copiado al portapapeles.", "success");
    } catch { setStatus("No se ha podido copiar automáticamente; usa la descarga.", "warning"); }
  }

  function loadExample() {
    input.value = [
      "id,nombre,ciudad,nota",
      "101,\"Ana García\",Madrid,\"Cliente nuevo\"",
      "102,Luis,Valencia,\"Pidió una devolución\"",
      "103,\"María, López\",Sevilla,\"Dijo \"\"sí\"\"\""
    ].join("\n");
    baseName = "clientes-ejemplo-json";
    headerInput.checked = true;
    trimInput.checked = true;
    prettyInput.checked = true;
    convertButton.disabled = false;
    setStatus("Ejemplo cargado: incluye una coma y comillas escapadas dentro de celdas.");
  }

  function clearAll() {
    revokeDownload();
    input.value = "";
    fileInput.value = "";
    convertButton.disabled = true;
    preview.replaceChildren();
    output.textContent = "";
    downloadArea.hidden = true;
    lastJson = "";
    summary.textContent = "Todavía no hay resultados.";
    setStatus("Pega un CSV o selecciona un archivo.");
  }

  input.addEventListener("input", () => { convertButton.disabled = !input.value.trim(); });
  fileInput.addEventListener("change", () => loadFile(fileInput.files[0]).catch((error) => setStatus(error.message, "error")));
  convertButton.addEventListener("click", convert);
  exampleButton.addEventListener("click", loadExample);
  clearButton.addEventListener("click", clearAll);
  copyButton.addEventListener("click", copyJson);
  window.addEventListener("pagehide", () => { revokeDownload(); });
})();

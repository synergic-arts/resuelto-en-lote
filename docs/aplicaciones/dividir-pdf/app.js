(function () {
  "use strict";

  const engine = window.ResueltoEnLoteSplitPdf;
  const filesInput = document.querySelector("#files");
  const modeInput = document.querySelector("#mode");
  const chunkInput = document.querySelector("#chunk-size");
  const breaksInput = document.querySelector("#breaks");
  const chunkLabel = document.querySelector("#chunk-label");
  const breaksLabel = document.querySelector("#breaks-label");
  const splitButton = document.querySelector("#split");
  const clearButton = document.querySelector("#clear");
  const status = document.querySelector("#status");
  const summary = document.querySelector("#summary");
  const plan = document.querySelector("#plan");
  const result = document.querySelector("#result");
  const downloads = document.querySelector("#downloads");
  let pdfBytes = null;
  let sourceFile = null;
  let pageCount = 0;
  let resultUrls = [];

  function setStatus(message, kind = "") {
    status.textContent = message;
    status.className = `status ${kind}`.trim();
  }

  function clearResult() {
    resultUrls.forEach((url) => URL.revokeObjectURL(url));
    resultUrls = [];
    downloads.replaceChildren();
    result.hidden = true;
  }

  function currentRanges() {
    if (!pageCount) return [];
    return engine.rangesForMode(pageCount, modeInput.value, modeInput.value === "breaks" ? breaksInput.value : chunkInput.value);
  }

  function renderPlan() {
    plan.replaceChildren();
    if (!pageCount) {
      summary.textContent = "Todavía no hay ningún PDF cargado.";
      splitButton.disabled = true;
      return;
    }
    try {
      const ranges = currentRanges();
      summary.textContent = `${pageCount} ${pageCount === 1 ? "página" : "páginas"} · se crearán ${ranges.length} ${ranges.length === 1 ? "archivo" : "archivos"}`;
      ranges.forEach((range, index) => {
        const item = document.createElement("li");
        item.textContent = `Parte ${index + 1}: páginas ${range.start}-${range.end}`;
        plan.append(item);
      });
      splitButton.disabled = false;
    } catch (error) {
      summary.textContent = "Revisa la forma de dividir el PDF.";
      splitButton.disabled = true;
      setStatus(error.message, "error");
    }
  }

  function updateModeFields() {
    const byBreaks = modeInput.value === "breaks";
    chunkInput.disabled = byBreaks || !pageCount;
    breaksInput.disabled = !byBreaks || !pageCount;
    chunkLabel.hidden = byBreaks;
    breaksLabel.hidden = !byBreaks;
    renderPlan();
  }

  async function loadPdf(file) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Selecciona un archivo PDF.");
    if (file.size > 100 * 1024 * 1024) throw new Error("El PDF supera el máximo recomendado de 100 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await PDFLib.PDFDocument.load(bytes);
    clearResult();
    pdfBytes = bytes;
    sourceFile = file;
    pageCount = pdf.getPageCount();
    renderPlan();
    updateModeFields();
    setStatus("PDF cargado. Elige cómo quieres repartir sus páginas.", "success");
  }

  async function splitPdf() {
    if (!pdfBytes || !sourceFile || !pageCount) return setStatus("Selecciona primero un PDF.", "error");
    let ranges;
    try { ranges = currentRanges(); } catch (error) { return setStatus(error.message, "error"); }
    splitButton.disabled = true;
    clearResult();
    setStatus(`Creando ${ranges.length} ${ranges.length === 1 ? "archivo" : "archivos"}...`);
    try {
      const source = await PDFLib.PDFDocument.load(pdfBytes);
      ranges.forEach((range, index) => {
        const item = document.createElement("div");
        item.className = "download-item";
        item.textContent = `Parte ${index + 1}: `;
        downloads.append(item);
      });
      for (let index = 0; index < ranges.length; index += 1) {
        const range = ranges[index];
        const output = await PDFLib.PDFDocument.create();
        const copied = await output.copyPages(source, Array.from({ length: range.end - range.start + 1 }, (_, offset) => range.start - 1 + offset));
        copied.forEach((page) => output.addPage(page));
        const bytes = await output.save();
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        resultUrls.push(url);
        const item = downloads.children[index];
        const link = document.createElement("a");
        link.className = "button";
        link.href = url;
        link.download = engine.outputName(sourceFile.name, index + 1, ranges.length);
        link.textContent = `Descargar parte ${index + 1}`;
        item.append(link);
      }
      result.hidden = false;
      setStatus(`Listo: se han creado ${ranges.length} ${ranges.length === 1 ? "archivo" : "archivos"}.`, "success");
    } catch (error) {
      clearResult();
      setStatus(`No se ha podido dividir el PDF: ${error.message || error}`, "error");
    } finally { renderPlan(); }
  }

  function clearAll() {
    clearResult();
    filesInput.value = "";
    pdfBytes = null;
    sourceFile = null;
    pageCount = 0;
    summary.textContent = "Todavía no hay ningún PDF cargado.";
    plan.replaceChildren();
    updateModeFields();
    setStatus("Selecciona un PDF.");
  }

  filesInput.addEventListener("change", () => { const file = filesInput.files[0]; if (file) loadPdf(file).catch((error) => { clearAll(); setStatus(error.message || "No se ha podido abrir el PDF.", "error"); }); });
  modeInput.addEventListener("change", () => { clearResult(); updateModeFields(); });
  chunkInput.addEventListener("input", () => { clearResult(); renderPlan(); });
  breaksInput.addEventListener("input", () => { clearResult(); renderPlan(); });
  splitButton.addEventListener("click", () => splitPdf().catch((error) => setStatus(error.message || "No se ha podido dividir el PDF.", "error")));
  clearButton.addEventListener("click", clearAll);
  window.addEventListener("pagehide", clearResult);
  updateModeFields();
})();

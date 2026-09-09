(function () {
  "use strict";

  const engine = window.ResueltoEnLoteNupPdf;
  const filesInput = document.querySelector("#files");
  const fileSummary = document.querySelector("#file-summary");
  const perSheetInput = document.querySelector("#per-sheet");
  const paperInput = document.querySelector("#paper");
  const marginInput = document.querySelector("#margin");
  const gapInput = document.querySelector("#gap");
  const borderInput = document.querySelector("#border");
  const applyButton = document.querySelector("#apply");
  const clearButton = document.querySelector("#clear");
  const status = document.querySelector("#status");
  const summary = document.querySelector("#summary");
  const plan = document.querySelector("#plan");
  const result = document.querySelector("#result");
  const download = document.querySelector("#download");
  let pdfBytes = null;
  let sourceFile = null;
  let pageCount = 0;
  let outputUrl = null;

  function setStatus(message, kind = "") {
    status.textContent = message;
    status.className = `status ${kind}`.trim();
  }

  function clearResult() {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = null;
    download.removeAttribute("href");
    result.hidden = true;
  }

  function currentPlan() {
    if (!pageCount) return null;
    const paper = engine.paperSize(paperInput.value);
    const perSheet = Number(perSheetInput.value);
    const sheets = engine.sheetCount(pageCount, perSheet);
    const margin = Number(marginInput.value);
    const gap = Number(gapInput.value);
    const slots = Array.from({ length: perSheet }, (_, index) => engine.slotRect(paper.width, paper.height, perSheet, margin, gap, index));
    return { paper, perSheet, sheets, margin, gap, slots };
  }

  function renderPlan() {
    plan.replaceChildren();
    if (!pageCount) {
      summary.textContent = "Todavía no hay ningún PDF cargado.";
      applyButton.disabled = true;
      return;
    }
    try {
      const details = currentPlan();
      summary.textContent = `${pageCount} ${pageCount === 1 ? "página" : "páginas"} → ${details.sheets} ${details.sheets === 1 ? "hoja" : "hojas"} con ${details.perSheet} por hoja`;
      for (let sheet = 0; sheet < details.sheets; sheet += 1) {
        const start = sheet * details.perSheet + 1;
        const end = Math.min((sheet + 1) * details.perSheet, pageCount);
        const item = document.createElement("li");
        item.textContent = `Hoja ${sheet + 1}: páginas ${start}-${end}`;
        plan.append(item);
      }
      applyButton.disabled = false;
    } catch (error) {
      summary.textContent = "Revisa la configuración de la cuadrícula.";
      applyButton.disabled = true;
      setStatus(error.message, "error");
    }
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
    fileSummary.textContent = `${file.name} · ${pageCount} ${pageCount === 1 ? "página" : "páginas"}`;
    renderPlan();
    setStatus("PDF cargado. Ajusta la distribución y prepara una copia para imprimir.", "success");
  }

  async function applyNup() {
    if (!pdfBytes || !sourceFile || !pageCount) return setStatus("Selecciona primero un PDF.", "error");
    let details;
    try { details = currentPlan(); } catch (error) { return setStatus(error.message, "error"); }
    applyButton.disabled = true;
    clearResult();
    setStatus(`Maquetando ${pageCount} páginas en ${details.sheets} hojas...`);
    try {
      const source = await PDFLib.PDFDocument.load(pdfBytes);
      const output = await PDFLib.PDFDocument.create();
      const embeddedPages = await output.embedPdf(pdfBytes);
      const pages = source.getPages();
      for (let sheetIndex = 0; sheetIndex < details.sheets; sheetIndex += 1) {
        const sheet = output.addPage([details.paper.width, details.paper.height]);
        const start = sheetIndex * details.perSheet;
        const end = Math.min(start + details.perSheet, pageCount);
        for (let sourceIndex = start; sourceIndex < end; sourceIndex += 1) {
          const slot = details.slots[sourceIndex - start];
          const sourceSize = pages[sourceIndex].getSize();
          const rect = engine.fitPage(sourceSize.width, sourceSize.height, slot);
          sheet.drawPage(embeddedPages[sourceIndex], rect);
          if (borderInput.checked) sheet.drawRectangle({ x: slot.x, y: slot.y, width: slot.width, height: slot.height, borderColor: PDFLib.rgb(.72, .78, .86), borderWidth: .6 });
        }
      }
      const bytes = await output.save();
      outputUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      download.href = outputUrl;
      download.download = engine.outputName(sourceFile.name);
      download.textContent = `Descargar ${engine.outputName(sourceFile.name)}`;
      result.hidden = false;
      setStatus("PDF listo. Comprueba una página antes de imprimir todo el documento.", "success");
    } catch (error) { setStatus(`No se ha podido preparar el PDF: ${error.message || error}`, "error"); }
    finally { renderPlan(); }
  }

  function clearAll() {
    clearResult();
    filesInput.value = "";
    fileSummary.textContent = "Todavía no has seleccionado ningún documento.";
    pdfBytes = null;
    sourceFile = null;
    pageCount = 0;
    plan.replaceChildren();
    renderPlan();
    setStatus("Selecciona un PDF.");
  }

  filesInput.addEventListener("change", () => { const file = filesInput.files[0]; if (file) loadPdf(file).catch((error) => { clearAll(); setStatus(error.message || "No se ha podido abrir el PDF.", "error"); }); });
  [perSheetInput, paperInput, marginInput, gapInput].forEach((input) => input.addEventListener("input", () => { clearResult(); renderPlan(); }));
  borderInput.addEventListener("change", clearResult);
  applyButton.addEventListener("click", () => applyNup().catch((error) => setStatus(error.message || "No se ha podido preparar el PDF.", "error")));
  clearButton.addEventListener("click", clearAll);
  window.addEventListener("pagehide", clearResult);
  renderPlan();
})();

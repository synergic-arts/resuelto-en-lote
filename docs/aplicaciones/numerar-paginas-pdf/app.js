(function () {
  "use strict";

  const engine = window.ResueltoEnLotePageNumbers;
  const filesInput = document.querySelector("#files");
  const positionInput = document.querySelector("#position");
  const formatInput = document.querySelector("#format");
  const startInput = document.querySelector("#start");
  const skipInput = document.querySelector("#skip");
  const fontSizeInput = document.querySelector("#font-size");
  const marginInput = document.querySelector("#margin");
  const colorInput = document.querySelector("#color");
  const applyButton = document.querySelector("#apply");
  const clearButton = document.querySelector("#clear");
  const status = document.querySelector("#status");
  const summary = document.querySelector("#summary");
  const result = document.querySelector("#result");
  const download = document.querySelector("#download");
  let pdfBytes = null;
  let sourceFile = null;
  let outputUrl = null;
  let pageCount = 0;

  function setStatus(message, kind = "") {
    status.textContent = message;
    status.className = `status ${kind}`.trim();
  }

  function clearOutput() {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = null;
    result.hidden = true;
    download.removeAttribute("href");
  }

  async function loadPdf(file) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Selecciona un archivo PDF.");
    if (file.size > 100 * 1024 * 1024) throw new Error("El PDF supera el máximo recomendado de 100 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await PDFLib.PDFDocument.load(bytes);
    pdfBytes = bytes;
    sourceFile = file;
    pageCount = pdf.getPageCount();
    summary.textContent = `${file.name} · ${pageCount} ${pageCount === 1 ? "página" : "páginas"}`;
    applyButton.disabled = false;
    setStatus("PDF cargado. Elige cómo quieres numerarlo.", "success");
  }

  async function addPageNumbers() {
    if (!pdfBytes || !sourceFile) return setStatus("Selecciona primero un PDF.", "error");
    let settings;
    try { settings = engine.normalizeSettings({ position: positionInput.value, format: formatInput.value, start: startInput.value, skip: skipInput.value, fontSize: fontSizeInput.value, margin: marginInput.value, color: colorInput.value }); }
    catch (error) { return setStatus(error.message, "error"); }
    if (settings.skip >= pageCount) return setStatus("No puedes omitir todas las páginas del PDF.", "error");
    applyButton.disabled = true;
    clearOutput();
    setStatus("Añadiendo la numeración dentro del PDF...");
    try {
      const pdf = await PDFLib.PDFDocument.load(pdfBytes);
      const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
      const color = engine.hexToRgb(settings.color);
      pdf.getPages().forEach((page, index) => {
        if (index < settings.skip) return;
        const number = settings.start + index - settings.skip;
        const label = engine.pageLabel(settings.format, number, pageCount - settings.skip + settings.start - 1);
        const width = font.widthOfTextAtSize(label, settings.fontSize);
        const place = engine.placement(page.getWidth(), page.getHeight(), width, settings.fontSize, settings.position, settings.margin);
        page.drawText(label, { x: place.x, y: place.y, size: settings.fontSize, font, color: PDFLib.rgb(color.r, color.g, color.b) });
      });
      const bytes = await pdf.save();
      outputUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      download.href = outputUrl;
      download.download = engine.outputName(sourceFile.name);
      download.textContent = `Descargar ${engine.outputName(sourceFile.name)}`;
      result.hidden = false;
      const numbered = pageCount - settings.skip;
      setStatus(`PDF listo: se han numerado ${numbered} ${numbered === 1 ? "página" : "páginas"}.`, "success");
    } catch (error) { setStatus(`No se ha podido numerar el PDF: ${error.message || error}`, "error"); }
    finally { applyButton.disabled = !pdfBytes; }
  }

  function clearAll() {
    clearOutput();
    filesInput.value = "";
    pdfBytes = null;
    sourceFile = null;
    pageCount = 0;
    applyButton.disabled = true;
    summary.textContent = "Todavía no hay ningún PDF cargado.";
    setStatus("Selecciona un PDF.");
  }

  filesInput.addEventListener("change", () => { clearOutput(); const file = filesInput.files[0]; if (file) loadPdf(file).catch((error) => { clearAll(); setStatus(error.message || "No se ha podido abrir el PDF.", "error"); }); });
  applyButton.addEventListener("click", () => addPageNumbers().catch((error) => { setStatus(error.message || "No se ha podido numerar el PDF.", "error"); applyButton.disabled = !pdfBytes; }));
  clearButton.addEventListener("click", clearAll);
  window.addEventListener("pagehide", clearOutput);
})();

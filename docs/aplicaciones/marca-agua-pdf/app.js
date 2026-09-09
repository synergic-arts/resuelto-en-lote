(function () {
  "use strict";

  const engine = window.ResueltoEnLoteWatermarkPdf;
  const filesInput = document.querySelector("#files");
  const fileSummary = document.querySelector("#file-summary");
  const watermarkText = document.querySelector("#watermark-text");
  const watermarkPreview = document.querySelector("#watermark-preview");
  const targetInput = document.querySelector("#target");
  const pageNumberInput = document.querySelector("#page-number");
  const pageNumberLabel = document.querySelector("#page-number-label");
  const positionInput = document.querySelector("#position");
  const sizeInput = document.querySelector("#size");
  const opacityInput = document.querySelector("#opacity");
  const colorInput = document.querySelector("#color");
  const marginInput = document.querySelector("#margin");
  const applyButton = document.querySelector("#apply");
  const clearButton = document.querySelector("#clear");
  const status = document.querySelector("#status");
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

  function updatePreview() {
    const value = watermarkText.value.trim() || "BORRADOR";
    watermarkPreview.textContent = value;
    watermarkPreview.style.color = colorInput.value;
    watermarkPreview.style.opacity = String(Number(opacityInput.value) / 100);
    watermarkPreview.classList.toggle("diagonal", positionInput.value === "diagonal");
  }

  function updateTarget() {
    const specific = targetInput.value === "specific";
    pageNumberInput.disabled = !specific || !pageCount;
    pageNumberLabel.hidden = !specific;
  }

  function parseColor(value) {
    const match = String(value || "").match(/^#([0-9a-f]{6})$/i);
    if (!match) throw new Error("El color elegido no es válido.");
    const hex = match[1];
    return { r: parseInt(hex.slice(0, 2), 16) / 255, g: parseInt(hex.slice(2, 4), 16) / 255, b: parseInt(hex.slice(4, 6), 16) / 255 };
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
    pageNumberInput.max = String(pageCount);
    pageNumberInput.value = String(pageCount);
    fileSummary.textContent = `${file.name} · ${pageCount} ${pageCount === 1 ? "página" : "páginas"}`;
    updateTarget();
    applyButton.disabled = false;
    setStatus("PDF cargado. Personaliza la marca y crea una copia nueva.", "success");
  }

  async function applyWatermark() {
    if (!pdfBytes || !sourceFile || !pageCount) return setStatus("Selecciona primero un PDF.", "error");
    const text = watermarkText.value.trim();
    if (!text) return setStatus("Escribe el texto que quieres añadir.", "error");
    let pages;
    try { pages = engine.pageNumbers(pageCount, targetInput.value, pageNumberInput.value); } catch (error) { return setStatus(error.message, "error"); }
    let color;
    try { color = parseColor(colorInput.value); } catch (error) { return setStatus(error.message, "error"); }
    applyButton.disabled = true;
    clearResult();
    setStatus("Añadiendo la marca de agua a la copia...");
    try {
      const pdf = await PDFLib.PDFDocument.load(pdfBytes);
      const font = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const size = engine.parseNumber(sizeInput.value, "El tamaño", 8, 160);
      const opacity = engine.parseNumber(opacityInput.value, "La opacidad", 5, 100) / 100;
      const margin = engine.parseNumber(marginInput.value, "El margen", 0);
      pages.forEach((pageNumber) => {
        const page = pdf.getPages()[pageNumber - 1];
        const pageSize = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, size);
        const position = engine.textPosition(pageSize.width, pageSize.height, textWidth, size, positionInput.value, margin);
        page.drawText(text, { x: position.x, y: position.y, size, font, color: PDFLib.rgb(color.r, color.g, color.b), opacity, rotate: PDFLib.degrees(position.rotate) });
      });
      const bytes = await pdf.save();
      outputUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      download.href = outputUrl;
      download.download = engine.outputName(sourceFile.name);
      download.textContent = `Descargar ${engine.outputName(sourceFile.name)}`;
      result.hidden = false;
      setStatus("PDF listo. Revisa la marca y descarga la copia.", "success");
    } catch (error) { setStatus(`No se ha podido crear el PDF: ${error.message || error}`, "error"); }
    finally { applyButton.disabled = false; }
  }

  function clearAll() {
    clearResult();
    filesInput.value = "";
    fileSummary.textContent = "Todavía no has seleccionado ningún documento.";
    pdfBytes = null;
    sourceFile = null;
    pageCount = 0;
    pageNumberInput.value = "1";
    pageNumberInput.removeAttribute("max");
    applyButton.disabled = true;
    updateTarget();
    setStatus("Selecciona un PDF.");
  }

  filesInput.addEventListener("change", () => { const file = filesInput.files[0]; if (file) loadPdf(file).catch((error) => { clearAll(); setStatus(error.message || "No se ha podido abrir el PDF.", "error"); }); });
  watermarkText.addEventListener("input", () => { clearResult(); updatePreview(); });
  [positionInput, opacityInput, colorInput].forEach((input) => input.addEventListener("input", () => { clearResult(); updatePreview(); }));
  [sizeInput, marginInput, pageNumberInput].forEach((input) => input.addEventListener("input", clearResult));
  targetInput.addEventListener("change", () => { clearResult(); updateTarget(); });
  applyButton.addEventListener("click", () => applyWatermark().catch((error) => setStatus(error.message || "No se ha podido crear el PDF.", "error")));
  clearButton.addEventListener("click", clearAll);
  window.addEventListener("pagehide", clearResult);
  updatePreview();
  updateTarget();
})();

(function () {
  "use strict";

  const engine = window.ResueltoEnLoteRotatePdf;
  const filesInput = document.querySelector("#files");
  const angleInput = document.querySelector("#angle");
  const pagesInput = document.querySelector("#pages");
  const applyButton = document.querySelector("#apply");
  const resetButton = document.querySelector("#reset");
  const exportButton = document.querySelector("#export");
  const clearButton = document.querySelector("#clear");
  const status = document.querySelector("#status");
  const summary = document.querySelector("#summary");
  const pageList = document.querySelector("#page-list");
  const result = document.querySelector("#result");
  const download = document.querySelector("#download");
  let pdfBytes = null;
  let sourceFile = null;
  let pageAngles = [];
  let outputUrl = null;

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

  function refreshPageRows() {
    pageList.querySelectorAll("[data-page]").forEach((row) => {
      const page = Number(row.dataset.page);
      row.querySelector(".page-angle").textContent = `${pageAngles[page] || 0}°`;
      row.classList.toggle("rotated", (pageAngles[page] || 0) !== 0);
    });
  }

  function renderPageRows(total) {
    pageList.replaceChildren();
    for (let page = 1; page <= total; page += 1) {
      const row = document.createElement("li");
      row.className = "page-row";
      row.dataset.page = String(page);
      const label = document.createElement("strong");
      label.textContent = `Página ${page}`;
      const angle = document.createElement("span");
      angle.className = "page-angle";
      angle.textContent = "0°";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary small-button";
      button.dataset.rotatePage = String(page);
      button.textContent = "↻ 90°";
      row.append(label, angle, button);
      pageList.append(row);
    }
    pageList.querySelectorAll("[data-rotate-page]").forEach((button) => button.addEventListener("click", () => {
      const page = Number(button.dataset.rotatePage);
      pageAngles[page] = engine.addRotation(pageAngles[page] || 0, 90);
      refreshPageRows();
      exportButton.disabled = false;
      setStatus(`Página ${page} girada 90°. Puedes seguir ajustando otras páginas.`);
    }));
  }

  async function loadPdf(file) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Selecciona un archivo PDF.");
    if (file.size > 100 * 1024 * 1024) throw new Error("El PDF supera el máximo recomendado de 100 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await PDFLib.PDFDocument.load(bytes);
    pdfBytes = bytes;
    sourceFile = file;
    pageAngles = Array(pdf.getPageCount()).fill(0);
    renderPageRows(pdf.getPageCount());
    summary.textContent = `${file.name} · ${pdf.getPageCount()} ${pdf.getPageCount() === 1 ? "página" : "páginas"}`;
    applyButton.disabled = false;
    exportButton.disabled = false;
    resetButton.disabled = false;
    setStatus("PDF cargado. Puedes girar todas las páginas, un rango o solo algunas.", "success");
  }

  function applyRange() {
    if (!pageAngles.length) return setStatus("Selecciona primero un PDF.", "error");
    let pages;
    try { pages = engine.parsePageRange(pagesInput.value, pageAngles.length); }
    catch (error) { return setStatus(error.message, "error"); }
    const angle = Number(angleInput.value);
    pages.forEach((page) => { pageAngles[page] = engine.addRotation(pageAngles[page] || 0, angle); });
    refreshPageRows();
    exportButton.disabled = false;
    setStatus(`${pages.length} ${pages.length === 1 ? "página actualizada" : "páginas actualizadas"}. Revisa la lista antes de descargar.`, "success");
  }

  async function exportPdf() {
    if (!pdfBytes || !sourceFile) return setStatus("Selecciona primero un PDF.", "error");
    exportButton.disabled = true;
    setStatus("Guardando la orientación dentro del PDF...");
    try {
      const pdf = await PDFLib.PDFDocument.load(pdfBytes);
      pdf.getPages().forEach((page, index) => page.setRotation(PDFLib.degrees(pageAngles[index + 1] || 0)));
      const bytes = await pdf.save();
      clearOutput();
      outputUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      download.href = outputUrl;
      download.download = engine.outputName(sourceFile.name);
      download.textContent = `Descargar ${engine.outputName(sourceFile.name)}`;
      result.hidden = false;
      setStatus("PDF listo: la orientación queda guardada en el archivo.", "success");
    } catch (error) { setStatus(`No se ha podido guardar el PDF: ${error.message || error}`, "error"); }
    finally { exportButton.disabled = false; }
  }

  function resetAngles() {
    pageAngles = pageAngles.map(() => 0);
    refreshPageRows();
    setStatus("Se han restablecido los giros.");
  }

  function clearAll() {
    clearOutput();
    filesInput.value = "";
    pageList.replaceChildren();
    pdfBytes = null;
    sourceFile = null;
    pageAngles = [];
    applyButton.disabled = true;
    exportButton.disabled = true;
    resetButton.disabled = true;
    summary.textContent = "Todavía no hay ningún PDF cargado.";
    setStatus("Selecciona un PDF.");
  }

  filesInput.addEventListener("change", () => { clearOutput(); const file = filesInput.files[0]; if (file) loadPdf(file).catch((error) => { clearAll(); setStatus(error.message || "No se ha podido abrir el PDF.", "error"); }); });
  applyButton.addEventListener("click", applyRange);
  resetButton.addEventListener("click", resetAngles);
  exportButton.addEventListener("click", () => exportPdf().catch((error) => setStatus(error.message || "No se ha podido exportar el PDF.", "error")));
  clearButton.addEventListener("click", clearAll);
  window.addEventListener("pagehide", clearOutput);
})();

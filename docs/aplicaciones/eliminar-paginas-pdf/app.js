(function () {
  "use strict";

  const engine = window.ResueltoEnLoteDeletePdfPages;
  const filesInput = document.querySelector("#files");
  const pagesInput = document.querySelector("#pages");
  const selectRangeButton = document.querySelector("#select-range");
  const deleteButton = document.querySelector("#delete");
  const clearButton = document.querySelector("#clear");
  const status = document.querySelector("#status");
  const summary = document.querySelector("#summary");
  const pageList = document.querySelector("#page-list");
  const result = document.querySelector("#result");
  const download = document.querySelector("#download");
  let pdfBytes = null;
  let sourceFile = null;
  let pageCount = 0;
  let removedPages = new Set();
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

  function updateSummary() {
    const remaining = pageCount - removedPages.size;
    summary.textContent = pageCount ? `${pageCount} ${pageCount === 1 ? "página" : "páginas"} · ${removedPages.size} para eliminar · ${remaining} ${remaining === 1 ? "se conservará" : "se conservarán"}` : "Todavía no hay ningún PDF cargado.";
    deleteButton.disabled = !pageCount || removedPages.size === 0 || remaining < 1;
  }

  function refreshPageRows() {
    pageList.querySelectorAll("[data-page]").forEach((button) => {
      const page = Number(button.dataset.page);
      const selected = removedPages.has(page);
      button.classList.toggle("selected-for-delete", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.querySelector(".page-state").textContent = selected ? "Se eliminará" : "Se conservará";
    });
    updateSummary();
  }

  function renderPageRows() {
    pageList.replaceChildren();
    for (let page = 1; page <= pageCount; page += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "page-card";
      button.dataset.page = String(page);
      button.setAttribute("aria-pressed", "false");
      const number = document.createElement("strong");
      number.textContent = `Página ${page}`;
      const state = document.createElement("span");
      state.className = "page-state";
      state.textContent = "Se conservará";
      button.append(number, state);
      button.addEventListener("click", () => { if (removedPages.has(page)) removedPages.delete(page); else removedPages.add(page); clearOutput(); refreshPageRows(); setStatus(`Selección actualizada: ${removedPages.size} ${removedPages.size === 1 ? "página marcada" : "páginas marcadas"}.`); });
      pageList.append(button);
    }
    refreshPageRows();
  }

  async function loadPdf(file) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Selecciona un archivo PDF.");
    if (file.size > 100 * 1024 * 1024) throw new Error("El PDF supera el máximo recomendado de 100 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await PDFLib.PDFDocument.load(bytes);
    pdfBytes = bytes;
    sourceFile = file;
    pageCount = pdf.getPageCount();
    removedPages = new Set();
    renderPageRows();
    updateSummary();
    deleteButton.disabled = true;
    selectRangeButton.disabled = false;
    setStatus("PDF cargado. Marca las páginas que quieras quitar.", "success");
  }

  function selectRange() {
    if (!pageCount) return setStatus("Selecciona primero un PDF.", "error");
    let pages;
    try { pages = engine.parsePageRange(pagesInput.value, pageCount); }
    catch (error) { return setStatus(error.message, "error"); }
    removedPages = new Set(pages);
    clearOutput();
    refreshPageRows();
    setStatus(`${pages.length} ${pages.length === 1 ? "página marcada" : "páginas marcadas"} para eliminar.`, "success");
  }

  async function removePages() {
    if (!pdfBytes || !sourceFile) return setStatus("Selecciona primero un PDF.", "error");
    let keep;
    try { keep = engine.remainingPages(pageCount, removedPages); }
    catch (error) { return setStatus(error.message, "error"); }
    deleteButton.disabled = true;
    setStatus("Creando una copia nueva con las páginas restantes...");
    try {
      const source = await PDFLib.PDFDocument.load(pdfBytes);
      const output = await PDFLib.PDFDocument.create();
      const copied = await output.copyPages(source, keep.map((page) => page - 1));
      copied.forEach((page) => output.addPage(page));
      const bytes = await output.save();
      clearOutput();
      outputUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      download.href = outputUrl;
      download.download = engine.outputName(sourceFile.name);
      download.textContent = `Descargar ${engine.outputName(sourceFile.name)}`;
      result.hidden = false;
      setStatus(`PDF listo: se han conservado ${keep.length} ${keep.length === 1 ? "página" : "páginas"}.`, "success");
    } catch (error) { setStatus(`No se ha podido crear el PDF: ${error.message || error}`, "error"); }
    finally { deleteButton.disabled = removedPages.size === 0 || pageCount - removedPages.size < 1; }
  }

  function clearAll() {
    clearOutput();
    filesInput.value = "";
    pagesInput.value = "";
    pageList.replaceChildren();
    pdfBytes = null;
    sourceFile = null;
    pageCount = 0;
    removedPages = new Set();
    updateSummary();
    deleteButton.disabled = true;
    selectRangeButton.disabled = true;
    setStatus("Selecciona un PDF.");
  }

  filesInput.addEventListener("change", () => { clearOutput(); const file = filesInput.files[0]; if (file) loadPdf(file).catch((error) => { clearAll(); setStatus(error.message || "No se ha podido abrir el PDF.", "error"); }); });
  selectRangeButton.addEventListener("click", selectRange);
  deleteButton.addEventListener("click", () => removePages().catch((error) => setStatus(error.message || "No se ha podido crear el PDF.", "error")));
  clearButton.addEventListener("click", clearAll);
  window.addEventListener("pagehide", clearOutput);
})();

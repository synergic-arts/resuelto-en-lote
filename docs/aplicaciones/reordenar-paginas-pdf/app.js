(function () {
  "use strict";

  const engine = window.ResueltoEnLoteReorderPdfPages;
  const filesInput = document.querySelector("#files");
  const orderInput = document.querySelector("#order");
  const applyOrderButton = document.querySelector("#apply-order");
  const invertButton = document.querySelector("#invert");
  const resetButton = document.querySelector("#reset");
  const reorderButton = document.querySelector("#reorder");
  const clearButton = document.querySelector("#clear");
  const status = document.querySelector("#status");
  const summary = document.querySelector("#summary");
  const pageList = document.querySelector("#page-list");
  const result = document.querySelector("#result");
  const download = document.querySelector("#download");
  let pdfBytes = null;
  let sourceFile = null;
  let pageCount = 0;
  let order = [];
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

  function updateControls() {
    const hasPdf = pageCount > 0;
    const changed = hasPdf && order.some((page, index) => page !== index + 1);
    summary.textContent = hasPdf ? `${pageCount} ${pageCount === 1 ? "página" : "páginas"} · orden actual: ${order.join(", ")}` : "Todavía no hay ningún PDF cargado.";
    orderInput.disabled = !hasPdf;
    applyOrderButton.disabled = !hasPdf;
    invertButton.disabled = !hasPdf;
    resetButton.disabled = !hasPdf || !changed;
    reorderButton.disabled = !hasPdf;
  }

  function renderPageRows() {
    pageList.replaceChildren();
    order.forEach((page, index) => {
      const row = document.createElement("article");
      row.className = "page-row";
      row.setAttribute("aria-label", `Posición ${index + 1}, página ${page}`);
      const label = document.createElement("div");
      label.className = "page-label";
      const position = document.createElement("span");
      position.className = "page-position";
      position.textContent = `Posición ${index + 1}`;
      const pageNumber = document.createElement("strong");
      pageNumber.textContent = `Página ${page}`;
      label.append(position, pageNumber);

      const controls = document.createElement("div");
      controls.className = "row-actions";
      const up = document.createElement("button");
      up.type = "button";
      up.className = "secondary compact-button";
      up.textContent = "↑ Subir";
      up.disabled = index === 0;
      up.setAttribute("aria-label", `Subir la página ${page}`);
      up.addEventListener("click", () => changePosition(index, -1));
      const down = document.createElement("button");
      down.type = "button";
      down.className = "secondary compact-button";
      down.textContent = "↓ Bajar";
      down.disabled = index === order.length - 1;
      down.setAttribute("aria-label", `Bajar la página ${page}`);
      down.addEventListener("click", () => changePosition(index, 1));
      controls.append(up, down);
      row.append(label, controls);
      pageList.append(row);
    });
    orderInput.value = order.join(", ");
    updateControls();
  }

  function changePosition(index, offset) {
    order = engine.movePage(order, index, offset);
    clearOutput();
    renderPageRows();
    setStatus("Orden actualizado. Puedes seguir moviendo páginas o descargar la copia.", "success");
  }

  async function loadPdf(file) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Selecciona un archivo PDF.");
    if (file.size > 100 * 1024 * 1024) throw new Error("El PDF supera el máximo recomendado de 100 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await PDFLib.PDFDocument.load(bytes);
    pdfBytes = bytes;
    sourceFile = file;
    pageCount = pdf.getPageCount();
    order = engine.naturalOrder(pageCount);
    clearOutput();
    renderPageRows();
    setStatus("PDF cargado. Mueve las páginas con las flechas o escribe el orden completo.", "success");
  }

  function applyManualOrder() {
    if (!pageCount) return setStatus("Selecciona primero un PDF.", "error");
    try {
      order = engine.parseOrder(orderInput.value, pageCount);
      clearOutput();
      renderPageRows();
      setStatus("Orden aplicado. La copia se creará con esta secuencia.", "success");
    } catch (error) { setStatus(error.message, "error"); }
  }

  function invertOrder() {
    if (!pageCount) return setStatus("Selecciona primero un PDF.", "error");
    order = order.slice().reverse();
    clearOutput();
    renderPageRows();
    setStatus("Orden invertido. Compruébalo antes de descargar.", "success");
  }

  function resetOrder() {
    if (!pageCount) return;
    order = engine.naturalOrder(pageCount);
    clearOutput();
    renderPageRows();
    setStatus("Orden restablecido al original.", "success");
  }

  async function createPdf() {
    if (!pdfBytes || !sourceFile) return setStatus("Selecciona primero un PDF.", "error");
    reorderButton.disabled = true;
    setStatus("Preparando una copia nueva con el orden elegido...");
    try {
      const source = await PDFLib.PDFDocument.load(pdfBytes);
      const output = await PDFLib.PDFDocument.create();
      const copied = await output.copyPages(source, order.map((page) => page - 1));
      copied.forEach((page) => output.addPage(page));
      const bytes = await output.save();
      clearOutput();
      outputUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      download.href = outputUrl;
      download.download = engine.outputName(sourceFile.name);
      download.textContent = `Descargar ${engine.outputName(sourceFile.name)}`;
      result.hidden = false;
      setStatus("PDF listo. Descarga la copia reordenada.", "success");
    } catch (error) { setStatus(`No se ha podido crear el PDF: ${error.message || error}`, "error"); }
    finally { updateControls(); }
  }

  function clearAll() {
    clearOutput();
    filesInput.value = "";
    orderInput.value = "";
    pageList.replaceChildren();
    pdfBytes = null;
    sourceFile = null;
    pageCount = 0;
    order = [];
    updateControls();
    setStatus("Selecciona un PDF.");
  }

  filesInput.addEventListener("change", () => { const file = filesInput.files[0]; if (file) loadPdf(file).catch((error) => { clearAll(); setStatus(error.message || "No se ha podido abrir el PDF.", "error"); }); });
  applyOrderButton.addEventListener("click", applyManualOrder);
  invertButton.addEventListener("click", invertOrder);
  resetButton.addEventListener("click", resetOrder);
  reorderButton.addEventListener("click", () => createPdf().catch((error) => setStatus(error.message || "No se ha podido crear el PDF.", "error")));
  clearButton.addEventListener("click", clearAll);
  window.addEventListener("pagehide", clearOutput);
  updateControls();
})();

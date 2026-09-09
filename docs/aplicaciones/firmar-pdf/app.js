(function () {
  "use strict";

  const engine = window.ResueltoEnLoteSignPdf;
  const filesInput = document.querySelector("#files");
  const fileSummary = document.querySelector("#file-summary");
  const canvas = document.querySelector("#signature");
  const signatureText = document.querySelector("#signature-text");
  const writeButton = document.querySelector("#write-signature");
  const clearSignatureButton = document.querySelector("#clear-signature");
  const targetInput = document.querySelector("#target");
  const pageNumberInput = document.querySelector("#page-number");
  const pageNumberLabel = document.querySelector("#page-number-label");
  const positionInput = document.querySelector("#position");
  const scaleInput = document.querySelector("#scale");
  const marginInput = document.querySelector("#margin");
  const signButton = document.querySelector("#sign");
  const clearButton = document.querySelector("#clear");
  const status = document.querySelector("#status");
  const result = document.querySelector("#result");
  const download = document.querySelector("#download");
  let pdfBytes = null;
  let sourceFile = null;
  let pageCount = 0;
  let outputUrl = null;
  let hasSignature = false;
  let drawing = false;

  const context = canvas.getContext("2d");
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 5;
  context.strokeStyle = "#10294f";

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

  function clearSignature() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature = false;
    clearResult();
    setStatus("Firma borrada. Puedes dibujarla de nuevo o escribir tu nombre.");
  }

  function canvasPoint(event) {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height };
  }

  canvas.addEventListener("pointerdown", (event) => { drawing = true; hasSignature = true; canvas.setPointerCapture(event.pointerId); const point = canvasPoint(event); context.beginPath(); context.moveTo(point.x, point.y); });
  canvas.addEventListener("pointermove", (event) => { if (!drawing) return; const point = canvasPoint(event); context.lineTo(point.x, point.y); context.stroke(); });
  canvas.addEventListener("pointerup", () => { drawing = false; });
  canvas.addEventListener("pointercancel", () => { drawing = false; });

  function writeSignature() {
    const value = signatureText.value.trim();
    if (!value) return setStatus("Escribe un nombre o unas iniciales para crear la firma.", "error");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "italic 74px Georgia, serif";
    context.textBaseline = "middle";
    context.fillStyle = "#10294f";
    context.fillText(value, 34, canvas.height / 2);
    hasSignature = true;
    clearResult();
    setStatus("Firma creada. Ajusta dónde quieres colocarla y crea el PDF.", "success");
  }

  function updateTarget() {
    const specific = targetInput.value === "specific";
    pageNumberInput.disabled = !specific || !pageCount;
    pageNumberLabel.hidden = !specific;
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
    signButton.disabled = false;
    setStatus("PDF cargado. Dibuja o escribe tu firma para continuar.", "success");
  }

  async function signPdf() {
    if (!pdfBytes || !sourceFile || !pageCount) return setStatus("Selecciona primero un PDF.", "error");
    if (!hasSignature) return setStatus("Crea primero una firma dibujada o escrita.", "error");
    let pages;
    try { pages = engine.pageNumbers(pageCount, targetInput.value, pageNumberInput.value); } catch (error) { return setStatus(error.message, "error"); }
    signButton.disabled = true;
    clearResult();
    setStatus(`Colocando la firma en ${pages.length === 1 ? "la página elegida" : "todas las páginas"}...`);
    try {
      const pdf = await PDFLib.PDFDocument.load(pdfBytes);
      const image = await pdf.embedPng(canvas.toDataURL("image/png"));
      pages.forEach((pageNumber) => {
        const page = pdf.getPages()[pageNumber - 1];
        const size = page.getSize();
        const rect = engine.signatureRect(size.width, size.height, positionInput.value, scaleInput.value, marginInput.value, canvas.width, canvas.height);
        page.drawImage(image, rect);
      });
      const bytes = await pdf.save();
      outputUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      download.href = outputUrl;
      download.download = engine.outputName(sourceFile.name);
      download.textContent = `Descargar ${engine.outputName(sourceFile.name)}`;
      result.hidden = false;
      setStatus("PDF listo. Descarga la copia y comprueba la firma antes de enviarla.", "success");
    } catch (error) { setStatus(`No se ha podido crear el PDF: ${error.message || error}`, "error"); }
    finally { signButton.disabled = false; }
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
    signButton.disabled = true;
    updateTarget();
    clearSignature();
    setStatus("Selecciona un PDF.");
  }

  filesInput.addEventListener("change", () => { const file = filesInput.files[0]; if (file) loadPdf(file).catch((error) => { clearAll(); setStatus(error.message || "No se ha podido abrir el PDF.", "error"); }); });
  writeButton.addEventListener("click", writeSignature);
  clearSignatureButton.addEventListener("click", clearSignature);
  targetInput.addEventListener("change", () => { clearResult(); updateTarget(); });
  [positionInput, scaleInput, marginInput, pageNumberInput].forEach((input) => input.addEventListener("input", clearResult));
  signButton.addEventListener("click", () => signPdf().catch((error) => setStatus(error.message || "No se ha podido crear el PDF.", "error")));
  clearButton.addEventListener("click", clearAll);
  window.addEventListener("pagehide", clearResult);
  updateTarget();
})();

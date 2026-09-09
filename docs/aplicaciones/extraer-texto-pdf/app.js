(function () {
  "use strict";

  const api = window.ResueltoEnLotePdfTexto;
  const pdfjsLib = window["pdfjs-dist/build/pdf"] || window.pdfjsLib;
  const state = { files: [], urls: [] };
  const MAX_FILE_BYTES = 100 * 1024 * 1024;
  const MAX_TOTAL_BYTES = 250 * 1024 * 1024;
  const MAX_FILES = 20;
  const elements = {
    files: document.getElementById("files"),
    fileSummary: document.getElementById("file-summary"),
    status: document.getElementById("status"),
    summary: document.getElementById("summary"),
    extract: document.getElementById("extract"),
    clear: document.getElementById("clear"),
    result: document.getElementById("result"),
    downloads: document.getElementById("downloads")
  };

  if (!pdfjsLib) {
    setStatus("No se ha podido cargar el motor PDF. Recarga la página e inténtalo de nuevo.", true);
    return;
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc = "../../vendor/pdfjs-3.11.174.worker.min.js";

  function setStatus(message, error) {
    elements.status.textContent = message;
    elements.status.classList.toggle("error", Boolean(error));
  }

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function clearDownloads() {
    for (const url of state.urls) URL.revokeObjectURL(url);
    state.urls = [];
    elements.downloads.replaceChildren();
    elements.result.hidden = true;
  }

  function reset() {
    clearDownloads();
    for (const entry of state.files) entry.pdf?.destroy?.();
    state.files = [];
    elements.files.value = "";
    elements.fileSummary.textContent = "Todavía no has seleccionado ningún documento.";
    elements.summary.textContent = "Todavía no hay ningún PDF cargado.";
    elements.extract.disabled = true;
    setStatus("Selecciona uno o varios PDF.");
  }

  async function loadFiles() {
    clearDownloads();
    for (const entry of state.files) entry.pdf?.destroy?.();
    state.files = [];
    elements.extract.disabled = true;
    const files = [...elements.files.files];
    if (!files.length) {
      elements.fileSummary.textContent = "Todavía no has seleccionado ningún documento.";
      elements.summary.textContent = "Todavía no hay ningún PDF cargado.";
      setStatus("Selecciona uno o varios PDF.");
      return;
    }
    if (files.length > MAX_FILES) {
      setStatus(`Puedes procesar como máximo ${MAX_FILES} PDF en cada lote.`, true);
      return;
    }
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      setStatus(`El lote supera el límite recomendado de ${formatBytes(MAX_TOTAL_BYTES)}.`, true);
      return;
    }
    if (files.some((file) => file.size > MAX_FILE_BYTES || (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)))) {
      setStatus("Todos los archivos deben ser PDF y pesar como máximo 100 MB.", true);
      return;
    }
    try {
      setStatus("Abriendo los PDF dentro del navegador…");
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setStatus(`Abriendo ${file.name} (${index + 1}/${files.length})…`);
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        state.files.push({ file, bytes, pdf });
      }
      elements.fileSummary.textContent = `${files.length} ${files.length === 1 ? "PDF cargado" : "PDF cargados"} · ${formatBytes(totalBytes)}`;
      elements.summary.textContent = state.files.map((entry) => `${entry.file.name} (${entry.pdf.numPages} ${entry.pdf.numPages === 1 ? "página" : "páginas"})`).join(" · ");
      elements.extract.disabled = false;
      setStatus("PDF listos. Extrae el texto cuando quieras.");
    } catch (error) {
      console.error(error);
      reset();
      setStatus("No se ha podido leer uno de los PDF. Comprueba que no esté dañado o protegido.", true);
    }
  }

  async function extractText() {
    if (!state.files.length) return;
    clearDownloads();
    elements.extract.disabled = true;
    const documents = [];
    try {
      for (let fileIndex = 0; fileIndex < state.files.length; fileIndex += 1) {
        const entry = state.files[fileIndex];
        const pages = [];
        for (let pageNumber = 1; pageNumber <= entry.pdf.numPages; pageNumber += 1) {
          setStatus(`Extrayendo ${entry.file.name}: página ${pageNumber}/${entry.pdf.numPages}…`);
          const page = await entry.pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          pages.push({ pageNumber, text: api.textFromItems(content.items) });
          page.cleanup?.();
        }
        documents.push({ filename: entry.file.name, pages });
        const individual = new Blob([pages.map((page) => `${api.pageHeader(entry.file.name, page.pageNumber)}\n${page.text || "[Sin texto extraíble]"}`).join("\n\n") + "\n"], { type: "text/plain;charset=utf-8" });
        addDownload(individual, api.outputName(entry.file.name), entry.file.name);
      }
      const allText = new Blob([api.combinedText(documents)], { type: "text/plain;charset=utf-8" });
      addDownload(allText, "textos-extraidos-pdf.txt", "todos los PDF");
      const totals = api.summary(documents);
      elements.result.hidden = false;
      setStatus(`Texto extraído de ${totals.documents} ${totals.documents === 1 ? "PDF" : "PDF"}: ${totals.pages} ${totals.pages === 1 ? "página" : "páginas"} y ${totals.characters.toLocaleString("es-ES")} caracteres.`);
    } catch (error) {
      console.error(error);
      clearDownloads();
      setStatus("No se ha podido extraer el texto completo del lote.", true);
    } finally {
      elements.extract.disabled = false;
    }
  }

  function addDownload(blob, filename, label) {
    const url = URL.createObjectURL(blob);
    state.urls.push(url);
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.className = "button secondary";
    link.href = url;
    link.download = filename;
    link.textContent = `Descargar ${label}`;
    item.append(link);
    elements.downloads.append(item);
  }

  elements.files.addEventListener("change", loadFiles);
  elements.extract.addEventListener("click", extractText);
  elements.clear.addEventListener("click", reset);
  window.addEventListener("pagehide", clearDownloads);
})();

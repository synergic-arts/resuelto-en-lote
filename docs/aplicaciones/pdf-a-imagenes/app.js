(function () {
  "use strict";

  const api = window.ResueltoEnLotePdfImagenes;
  const pdfjsLib = window["pdfjs-dist/build/pdf"] || window.pdfjsLib;
  const state = { file: null, bytes: null, pdf: null, urls: [] };
  const MAX_FILE_BYTES = 100 * 1024 * 1024;
  const MAX_PAGE_PIXELS = 40_000_000;

  const elements = {
    files: document.getElementById("files"),
    fileSummary: document.getElementById("file-summary"),
    pages: document.getElementById("pages"),
    format: document.getElementById("format"),
    scale: document.getElementById("scale"),
    quality: document.getElementById("quality"),
    qualityWrap: document.getElementById("quality-wrap"),
    status: document.getElementById("status"),
    summary: document.getElementById("summary"),
    convert: document.getElementById("convert"),
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

  function updateQualityVisibility() {
    elements.qualityWrap.hidden = elements.format.value !== "jpg";
  }

  function reset() {
    clearDownloads();
    state.file = null;
    state.bytes = null;
    state.pdf = null;
    elements.files.value = "";
    elements.fileSummary.textContent = "Todavía no has seleccionado ningún documento.";
    elements.summary.textContent = "Todavía no hay ningún PDF cargado.";
    elements.convert.disabled = true;
    setStatus("Selecciona un PDF.");
  }

  async function loadFile() {
    clearDownloads();
    const file = elements.files.files[0];
    state.file = null;
    state.bytes = null;
    state.pdf = null;
    elements.convert.disabled = true;
    if (!file) {
      elements.fileSummary.textContent = "Todavía no has seleccionado ningún documento.";
      elements.summary.textContent = "Todavía no hay ningún PDF cargado.";
      setStatus("Selecciona un PDF.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      elements.fileSummary.textContent = `${file.name} · ${formatBytes(file.size)}`;
      setStatus("El archivo supera el límite recomendado de 100 MB.", true);
      return;
    }
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setStatus("Selecciona un archivo PDF válido.", true);
      return;
    }
    try {
      setStatus("Abriendo el PDF dentro del navegador…");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      state.file = file;
      state.bytes = bytes;
      state.pdf = pdf;
      elements.fileSummary.textContent = `${file.name} · ${formatBytes(file.size)} · ${pdf.numPages} ${pdf.numPages === 1 ? "página" : "páginas"}`;
      elements.summary.textContent = "Todas las páginas están seleccionadas. Puedes cambiar la selección antes de convertir.";
      elements.convert.disabled = false;
      setStatus("PDF listo. Elige el formato y convierte las páginas que necesites.");
    } catch (error) {
      console.error(error);
      setStatus("No se ha podido leer este PDF. Comprueba que no esté dañado o protegido.", true);
    }
  }

  async function renderPage(pageNumber, settings) {
    const page = await state.pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: settings.scale });
    if (api.pixelCount(viewport.width, viewport.height) > MAX_PAGE_PIXELS) {
      throw new Error(`La página ${pageNumber} produciría una imagen demasiado grande. Prueba con una escala menor.`);
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: settings.format === "png" });
    if (!context) throw new Error("El navegador no ha podido preparar el lienzo de la imagen.");
    if (settings.format === "jpg") {
      context.save();
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore();
    }
    await page.render({ canvasContext: context, viewport }).promise;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, settings.mime, settings.quality));
    canvas.width = 1;
    canvas.height = 1;
    if (!blob) throw new Error(`El navegador no ha podido crear la imagen de la página ${pageNumber}.`);
    return blob;
  }

  function addDownload(blob, filename, pageNumber) {
    const url = URL.createObjectURL(blob);
    state.urls.push(url);
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.className = "button secondary";
    link.href = url;
    link.download = filename;
    link.textContent = `Descargar página ${pageNumber}`;
    item.append(link);
    elements.downloads.append(item);
  }

  async function convert() {
    if (!state.pdf || !state.file) return;
    clearDownloads();
    elements.convert.disabled = true;
    try {
      const pages = api.parsePages(elements.pages.value, state.pdf.numPages);
      const settings = api.imageSettings(elements.format.value, elements.scale.value, elements.quality.value);
      elements.summary.textContent = `${pages.length} ${pages.length === 1 ? "página seleccionada" : "páginas seleccionadas"} · ${settings.format.toUpperCase()} · escala ${settings.scale}×`;
      for (let index = 0; index < pages.length; index += 1) {
        const pageNumber = pages[index];
        setStatus(`Convirtiendo página ${pageNumber} de ${state.pdf.numPages} (${index + 1}/${pages.length})…`);
        const blob = await renderPage(pageNumber, settings);
        addDownload(blob, api.outputName(state.file.name, pageNumber, settings.format), pageNumber);
      }
      elements.result.hidden = false;
      setStatus(`${pages.length} ${pages.length === 1 ? "imagen creada" : "imágenes creadas"}. Descárgalas desde esta página.`);
    } catch (error) {
      console.error(error);
      clearDownloads();
      setStatus(error.message || "No se ha podido convertir el PDF.", true);
    } finally {
      elements.convert.disabled = false;
    }
  }

  elements.files.addEventListener("change", loadFile);
  elements.format.addEventListener("change", updateQualityVisibility);
  elements.convert.addEventListener("click", convert);
  elements.clear.addEventListener("click", reset);
  window.addEventListener("pagehide", clearDownloads);
  updateQualityVisibility();
})();

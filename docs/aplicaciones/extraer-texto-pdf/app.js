(function () {
  "use strict";

  const api = window.ResueltoEnLotePdfTexto;
  const i18n = window.ResueltoEnLotePdfTextI18n;
  const pdfjsLib = window["pdfjs-dist/build/pdf"] || window.pdfjsLib;
  const locale = i18n?.localeKey(document.documentElement.lang) || "es";
  const message = (key, values) => i18n.t(locale, key, values);
  const numberFormatter = new Intl.NumberFormat(locale);
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
    setStatus(message("engineError"), true);
    return;
  }
  const workerMeta = document.querySelector('meta[name="pdf-worker-src"]');
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerMeta?.content || "../../vendor/pdfjs-3.11.174.worker.min.js";

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
    elements.fileSummary.textContent = message("noDocuments");
    elements.summary.textContent = message("noPdfLoaded");
    elements.extract.disabled = true;
    setStatus(message("selectPdf"));
  }

  async function loadFiles() {
    clearDownloads();
    for (const entry of state.files) entry.pdf?.destroy?.();
    state.files = [];
    elements.extract.disabled = true;
    const files = [...elements.files.files];
    if (!files.length) {
      elements.fileSummary.textContent = message("noDocuments");
      elements.summary.textContent = message("noPdfLoaded");
      setStatus(message("selectPdf"));
      return;
    }
    if (files.length > MAX_FILES) {
      setStatus(message("maxFiles", { count: MAX_FILES }), true);
      return;
    }
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      setStatus(message("batchTooLarge", { size: formatBytes(MAX_TOTAL_BYTES) }), true);
      return;
    }
    if (files.some((file) => file.size > MAX_FILE_BYTES || (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)))) {
      setStatus(message("invalidFiles"), true);
      return;
    }
    try {
      setStatus(message("openingBatch"));
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setStatus(message("openingFile", { name: file.name, current: index + 1, total: files.length }));
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        state.files.push({ file, bytes, pdf });
      }
      elements.fileSummary.textContent = message(files.length === 1 ? "loadedOne" : "loadedMany", { count: files.length, size: formatBytes(totalBytes) });
      elements.summary.textContent = state.files.map((entry) => `${entry.file.name} (${entry.pdf.numPages} ${message(entry.pdf.numPages === 1 ? "pageOne" : "pageMany")})`).join(" · ");
      elements.extract.disabled = false;
      setStatus(message("ready"));
    } catch (error) {
      console.error(error);
      reset();
      setStatus(message("readError"), true);
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
          setStatus(message("extracting", { name: entry.file.name, current: pageNumber, total: entry.pdf.numPages }));
          const page = await entry.pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          pages.push({ pageNumber, text: api.textFromItems(content.items) });
          page.cleanup?.();
        }
        documents.push({ filename: entry.file.name, pages });
        const individual = new Blob([pages.map((page) => `${api.pageHeader(entry.file.name, page.pageNumber, locale)}\n${page.text || message("noExtractableText")}`).join("\n\n") + "\n"], { type: "text/plain;charset=utf-8" });
        addDownload(individual, api.outputName(entry.file.name, locale), entry.file.name);
      }
      const allText = new Blob([api.combinedText(documents, locale)], { type: "text/plain;charset=utf-8" });
      addDownload(allText, message("combinedFilename"), message("allDocuments"));
      const totals = api.summary(documents);
      elements.result.hidden = false;
      setStatus(message("completed", { documents: totals.documents, pages: totals.pages, pageLabel: message(totals.pages === 1 ? "pageOne" : "pageMany"), characters: numberFormatter.format(totals.characters) }));
    } catch (error) {
      console.error(error);
      clearDownloads();
      setStatus(message("extractError"), true);
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
    link.textContent = message("download", { label });
    item.append(link);
    elements.downloads.append(item);
  }

  elements.files.addEventListener("change", loadFiles);
  elements.extract.addEventListener("click", extractText);
  elements.clear.addEventListener("click", reset);
  window.addEventListener("pagehide", clearDownloads);
})();

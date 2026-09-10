(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLotePdfTextI18n = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const catalogs = {
    es: {
      engineError: "No se ha podido cargar el motor PDF. Recarga la página e inténtalo de nuevo.",
      noDocuments: "Todavía no has seleccionado ningún documento.",
      noPdfLoaded: "Todavía no hay ningún PDF cargado.",
      selectPdf: "Selecciona uno o varios PDF.",
      maxFiles: "Puedes procesar como máximo {count} PDF en cada lote.",
      batchTooLarge: "El lote supera el límite recomendado de {size}.",
      invalidFiles: "Todos los archivos deben ser PDF y pesar como máximo 100 MB.",
      openingBatch: "Abriendo los PDF dentro del navegador…",
      openingFile: "Abriendo {name} ({current}/{total})…",
      loadedOne: "1 PDF cargado · {size}",
      loadedMany: "{count} PDF cargados · {size}",
      pageOne: "página",
      pageMany: "páginas",
      ready: "PDF listos. Extrae el texto cuando quieras.",
      readError: "No se ha podido leer uno de los PDF. Comprueba que no esté dañado o protegido.",
      extracting: "Extrayendo {name}: página {current}/{total}…",
      noExtractableText: "[Sin texto extraíble]",
      combinedFilename: "textos-extraidos-pdf.txt",
      allDocuments: "todos los PDF",
      download: "Descargar {label}",
      completed: "Texto extraído de {documents} PDF: {pages} {pageLabel} y {characters} caracteres.",
      extractError: "No se ha podido extraer el texto completo del lote."
    },
    en: {
      engineError: "The PDF engine could not be loaded. Reload the page and try again.",
      noDocuments: "You have not selected any documents yet.",
      noPdfLoaded: "No PDF has been loaded yet.",
      selectPdf: "Select one or more PDF files.",
      maxFiles: "You can process up to {count} PDF files in each batch.",
      batchTooLarge: "The batch exceeds the recommended limit of {size}.",
      invalidFiles: "Every file must be a PDF no larger than 100 MB.",
      openingBatch: "Opening the PDF files in your browser…",
      openingFile: "Opening {name} ({current}/{total})…",
      loadedOne: "1 PDF loaded · {size}",
      loadedMany: "{count} PDF files loaded · {size}",
      pageOne: "page",
      pageMany: "pages",
      ready: "Your PDF files are ready. Extract the text when you want.",
      readError: "One of the PDF files could not be read. Check that it is not damaged or password-protected.",
      extracting: "Extracting {name}: page {current}/{total}…",
      noExtractableText: "[No extractable text]",
      combinedFilename: "extracted-pdf-text.txt",
      allDocuments: "all PDF files",
      download: "Download {label}",
      completed: "Text extracted from {documents} PDF files: {pages} {pageLabel} and {characters} characters.",
      extractError: "The complete batch text could not be extracted."
    },
    "pt-BR": {
      engineError: "Não foi possível carregar o mecanismo de PDF. Recarregue a página e tente novamente.",
      noDocuments: "Você ainda não selecionou nenhum documento.",
      noPdfLoaded: "Nenhum PDF foi carregado ainda.",
      selectPdf: "Selecione um ou mais arquivos PDF.",
      maxFiles: "Você pode processar no máximo {count} arquivos PDF por lote.",
      batchTooLarge: "O lote ultrapassa o limite recomendado de {size}.",
      invalidFiles: "Todos os arquivos devem ser PDFs de no máximo 100 MB.",
      openingBatch: "Abrindo os arquivos PDF no navegador…",
      openingFile: "Abrindo {name} ({current}/{total})…",
      loadedOne: "1 PDF carregado · {size}",
      loadedMany: "{count} arquivos PDF carregados · {size}",
      pageOne: "página",
      pageMany: "páginas",
      ready: "Os arquivos PDF estão prontos. Extraia o texto quando quiser.",
      readError: "Não foi possível ler um dos PDFs. Verifique se ele não está danificado ou protegido por senha.",
      extracting: "Extraindo {name}: página {current}/{total}…",
      noExtractableText: "[Sem texto extraível]",
      combinedFilename: "textos-extraidos-dos-pdfs.txt",
      allDocuments: "todos os arquivos PDF",
      download: "Baixar {label}",
      completed: "Texto extraído de {documents} arquivos PDF: {pages} {pageLabel} e {characters} caracteres.",
      extractError: "Não foi possível extrair todo o texto do lote."
    }
  };

  function localeKey(value) {
    const normalized = String(value || "es").replaceAll("_", "-").toLowerCase();
    if (normalized.startsWith("pt")) return "pt-BR";
    if (normalized.startsWith("en")) return "en";
    return "es";
  }

  function interpolate(template, values) {
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
    );
  }

  function t(locale, key, values = {}) {
    const selected = catalogs[localeKey(locale)];
    const message = selected[key] ?? catalogs.es[key];
    if (typeof message !== "string") throw new Error(`Unknown translation key: ${key}`);
    return interpolate(message, values);
  }

  return { catalogs, localeKey, t };
});

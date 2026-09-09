(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteDeletePdfPages = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function parsePageRange(value, totalPages) {
    const total = Number(totalPages);
    if (!Number.isInteger(total) || total < 1) throw new Error("El PDF no tiene un número de páginas válido.");
    const text = String(value || "").trim().toLowerCase();
    if (!text) return [];
    const pages = new Set();
    for (const token of text.split(",")) {
      const part = token.trim();
      if (!part) continue;
      const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        const start = Number(range[1]);
        const end = Number(range[2]);
        if (start < 1 || end > total || start > end) throw new Error(`El rango «${part}» no es válido para un PDF de ${total} páginas.`);
        for (let page = start; page <= end; page += 1) pages.add(page);
        continue;
      }
      if (!/^\d+$/.test(part)) throw new Error(`No se entiende la página «${part}». Usa números o rangos como 2-5.`);
      const page = Number(part);
      if (page < 1 || page > total) throw new Error(`La página ${page} no existe en este PDF.`);
      pages.add(page);
    }
    return [...pages].sort((a, b) => a - b);
  }

  function remainingPages(totalPages, removedPages) {
    const total = Number(totalPages);
    const removed = new Set(removedPages);
    if (!Number.isInteger(total) || total < 1) throw new Error("El PDF no tiene un número de páginas válido.");
    if (removed.size >= total) throw new Error("Debes conservar al menos una página.");
    return Array.from({ length: total }, (_, index) => index + 1).filter((page) => !removed.has(page));
  }

  function outputName(filename) {
    const source = String(filename || "documento.pdf");
    const stem = source.replace(/\.pdf$/i, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "documento";
    return `${stem}-sin-paginas.pdf`;
  }

  return { parsePageRange, remainingPages, outputName };
});

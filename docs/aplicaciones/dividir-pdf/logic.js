(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteSplitPdf = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function validTotal(totalPages) {
    const total = Number(totalPages);
    if (!Number.isInteger(total) || total < 1) throw new Error("El PDF no tiene un número de páginas válido.");
    return total;
  }

  function parsePositiveInteger(value, label) {
    const number = Number(String(value || "").trim());
    if (!Number.isInteger(number) || number < 1) throw new Error(`${label} debe ser un número entero mayor que cero.`);
    return number;
  }

  function parseBreaks(value, totalPages) {
    const total = validTotal(totalPages);
    const text = String(value || "").trim();
    if (!text) return [];
    const tokens = text.split(",").map((token) => token.trim());
    if (tokens.some((token) => !/^\d+$/.test(token))) throw new Error("No se entienden los cortes. Escribe páginas separadas por comas, por ejemplo: 3, 7.");
    const breaks = tokens.map(Number);
    for (const page of breaks) {
      if (page < 1 || page >= total) throw new Error(`Un corte debe estar entre 1 y ${total - 1}; la página ${page} no sirve como separación.`);
    }
    const unique = [...new Set(breaks)].sort((a, b) => a - b);
    if (unique.length !== breaks.length) throw new Error("No repitas el mismo punto de corte.");
    return unique;
  }

  function rangesFromBreaks(totalPages, value) {
    const total = validTotal(totalPages);
    const breaks = Array.isArray(value) ? value : parseBreaks(value, total);
    const ends = [...breaks, total];
    let start = 1;
    return ends.map((end) => {
      const range = { start, end };
      start = end + 1;
      return range;
    });
  }

  function rangesByChunk(totalPages, chunkSize) {
    const total = validTotal(totalPages);
    const size = parsePositiveInteger(chunkSize, "El número de páginas por archivo");
    const ranges = [];
    for (let start = 1; start <= total; start += size) ranges.push({ start, end: Math.min(start + size - 1, total) });
    return ranges;
  }

  function rangesForMode(totalPages, mode, value) {
    if (mode === "breaks") return rangesFromBreaks(totalPages, value);
    return rangesByChunk(totalPages, value);
  }

  function outputName(filename, part, totalParts) {
    const source = String(filename || "documento.pdf");
    const stem = source.replace(/\.pdf$/i, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "documento";
    const width = Math.max(2, String(totalParts).length);
    return `${stem}-parte-${String(part).padStart(width, "0")}-de-${String(totalParts).padStart(width, "0")}.pdf`;
  }

  return { parseBreaks, rangesFromBreaks, rangesByChunk, rangesForMode, outputName };
});

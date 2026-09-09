(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteReorderPdfPages = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function naturalOrder(totalPages) {
    const total = Number(totalPages);
    if (!Number.isInteger(total) || total < 1) throw new Error("El PDF no tiene un número de páginas válido.");
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  function validateOrder(order, totalPages) {
    const total = Number(totalPages);
    if (!Number.isInteger(total) || total < 1) throw new Error("El PDF no tiene un número de páginas válido.");
    if (!Array.isArray(order) || order.length !== total) throw new Error(`Escribe exactamente las ${total} páginas, sin repetir ninguna.`);
    const seen = new Set();
    for (const page of order) {
      if (!Number.isInteger(page) || page < 1 || page > total) throw new Error(`La página ${page} no existe en este PDF.`);
      if (seen.has(page)) throw new Error(`La página ${page} aparece más de una vez.`);
      seen.add(page);
    }
    return order.slice();
  }

  function parseOrder(value, totalPages) {
    const total = Number(totalPages);
    const text = String(value || "").trim();
    if (!text) return naturalOrder(total);
    const tokens = text.split(",").map((token) => token.trim());
    if (tokens.some((token) => !/^\d+$/.test(token))) throw new Error("No se entiende el orden. Escribe números separados por comas, por ejemplo: 1, 3, 2, 4.");
    return validateOrder(tokens.map(Number), total);
  }

  function movePage(order, index, offset) {
    const next = validateOrder(order, order.length);
    const from = Number(index);
    const to = from + Number(offset);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  }

  function outputName(filename) {
    const source = String(filename || "documento.pdf");
    const stem = source.replace(/\.pdf$/i, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "documento";
    return `${stem}-reordenado.pdf`;
  }

  return { naturalOrder, validateOrder, parseOrder, movePage, outputName };
});

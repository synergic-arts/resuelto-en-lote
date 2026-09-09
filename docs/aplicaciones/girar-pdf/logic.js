(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteRotatePdf = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function normalizeAngle(value) {
    const angle = Number(value);
    if (![0, 90, 180, 270].includes(angle)) throw new Error("El giro debe ser de 90, 180 o 270 grados.");
    return angle;
  }

  function addRotation(current, delta) {
    const base = ((Number(current) || 0) % 360 + 360) % 360;
    const change = normalizeAngle(delta);
    return (base + change) % 360;
  }

  function parsePageRange(value, totalPages) {
    const total = Number(totalPages);
    if (!Number.isInteger(total) || total < 1) throw new Error("El PDF no tiene un número de páginas válido.");
    const text = String(value || "").trim().toLowerCase();
    if (!text || text === "todas" || text === "all") return Array.from({ length: total }, (_, index) => index + 1);
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
    if (!pages.size) throw new Error("Indica al menos una página o escribe «todas». ");
    return [...pages].sort((a, b) => a - b);
  }

  function outputName(filename) {
    const source = String(filename || "documento.pdf");
    const stem = source.replace(/\.pdf$/i, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "documento";
    return `${stem}-girado.pdf`;
  }

  return { normalizeAngle, addRotation, parsePageRange, outputName };
});

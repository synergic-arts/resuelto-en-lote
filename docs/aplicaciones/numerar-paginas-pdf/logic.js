(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLotePageNumbers = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const positions = ["bottom-left", "bottom-center", "bottom-right", "top-left", "top-center", "top-right"];
  const formats = ["number", "page", "page-of"];

  function normalizeSettings(input = {}) {
    const position = positions.includes(input.position) ? input.position : "bottom-center";
    const format = formats.includes(input.format) ? input.format : "page-of";
    const start = Number(input.start);
    const skip = Number(input.skip);
    const size = Number(input.fontSize);
    const margin = Number(input.margin);
    if (!Number.isInteger(start) || start < 1 || start > 99999) throw new Error("El número inicial debe estar entre 1 y 99.999.");
    if (!Number.isInteger(skip) || skip < 0 || skip > 10000) throw new Error("Las páginas que se omiten deben ser un número entre 0 y 10.000.");
    if (!Number.isInteger(size) || size < 6 || size > 48) throw new Error("El tamaño debe estar entre 6 y 48 puntos.");
    if (!Number.isInteger(margin) || margin < 6 || margin > 100) throw new Error("El margen debe estar entre 6 y 100 puntos.");
    const color = /^#[0-9a-f]{6}$/i.test(String(input.color || "")) ? String(input.color) : "#1b2a45";
    return { position, format, start, skip, fontSize: size, margin, color };
  }

  function pageLabel(format, number, total) {
    const safeFormat = formats.includes(format) ? format : "page-of";
    if (safeFormat === "number") return String(number);
    if (safeFormat === "page") return `Página ${number}`;
    return `Página ${number} de ${total}`;
  }

  function placement(pageWidth, pageHeight, textWidth, fontSize, position, margin) {
    const width = Number(pageWidth);
    const height = Number(pageHeight);
    const text = Number(textWidth);
    const size = Number(fontSize);
    const gap = Number(margin);
    if (![width, height, text, size, gap].every(Number.isFinite) || width < 1 || height < 1 || text < 0 || size < 1 || gap < 0) throw new Error("Las dimensiones de la numeración no son válidas.");
    const safePosition = positions.includes(position) ? position : "bottom-center";
    const x = safePosition.endsWith("left") ? gap : safePosition.endsWith("right") ? Math.max(gap, width - text - gap) : Math.max(gap, (width - text) / 2);
    const y = safePosition.startsWith("top") ? Math.max(gap, height - gap - size) : gap;
    return { x, y, position: safePosition };
  }

  function hexToRgb(hex) {
    const value = String(hex || "").replace(/^#/, "");
    if (!/^[0-9a-f]{6}$/i.test(value)) throw new Error("El color no es válido.");
    return { r: parseInt(value.slice(0, 2), 16) / 255, g: parseInt(value.slice(2, 4), 16) / 255, b: parseInt(value.slice(4, 6), 16) / 255 };
  }

  function outputName(filename) {
    const source = String(filename || "documento.pdf");
    const stem = source.replace(/\.pdf$/i, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "documento";
    return `${stem}-numerado.pdf`;
  }

  return { positions, formats, normalizeSettings, pageLabel, placement, hexToRgb, outputName };
});

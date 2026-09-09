(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteWatermarkPdf = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function pageNumbers(totalPages, target, specificPage) {
    const total = Number(totalPages);
    if (!Number.isInteger(total) || total < 1) throw new Error("El PDF no tiene un número de páginas válido.");
    if (target === "all") return Array.from({ length: total }, (_, index) => index + 1);
    if (target === "specific") {
      const page = Number(specificPage);
      if (!Number.isInteger(page) || page < 1 || page > total) throw new Error(`Elige una página entre 1 y ${total}.`);
      return [page];
    }
    return [total];
  }

  function parseNumber(value, label, minimum, maximum) {
    const number = Number(String(value || "").trim());
    if (!Number.isFinite(number) || number < minimum || (maximum !== undefined && number > maximum)) {
      const limit = maximum === undefined ? `mayor o igual que ${minimum}` : `entre ${minimum} y ${maximum}`;
      throw new Error(`${label} debe ser un número ${limit}.`);
    }
    return number;
  }

  function textPosition(pageWidth, pageHeight, textWidth, fontSize, position, margin) {
    const gap = parseNumber(margin, "El margen", 0);
    const diagonal = position === "diagonal";
    const centered = position.includes("center");
    const right = position.includes("right");
    const top = position.includes("top");
    const x = diagonal || centered ? (pageWidth - textWidth) / 2 : right ? pageWidth - gap - textWidth : gap;
    const y = diagonal ? (pageHeight - fontSize) / 2 : top ? pageHeight - gap - fontSize : gap;
    return { x, y, rotate: position === "diagonal" ? 45 : 0 };
  }

  function outputName(filename) {
    const source = String(filename || "documento.pdf");
    const stem = source.replace(/\.pdf$/i, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "documento";
    return `${stem}-marca-agua.pdf`;
  }

  return { pageNumbers, parseNumber, textPosition, outputName };
});

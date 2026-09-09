(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteNupPdf = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const PAPERS = {
    "a4-portrait": { width: 595.28, height: 841.89, label: "A4 vertical" },
    "a4-landscape": { width: 841.89, height: 595.28, label: "A4 horizontal" },
    "letter-portrait": { width: 612, height: 792, label: "Carta vertical" },
    "letter-landscape": { width: 792, height: 612, label: "Carta horizontal" }
  };

  function parseNumber(value, label, minimum, maximum) {
    const number = Number(String(value || "").trim());
    if (!Number.isFinite(number) || number < minimum || (maximum !== undefined && number > maximum)) {
      const limit = maximum === undefined ? `mayor o igual que ${minimum}` : `entre ${minimum} y ${maximum}`;
      throw new Error(`${label} debe ser un número ${limit}.`);
    }
    return number;
  }

  function gridFor(perSheet) {
    const count = Number(perSheet);
    if (count === 2) return { columns: 1, rows: 2 };
    if (count === 4) return { columns: 2, rows: 2 };
    if (count === 6) return { columns: 2, rows: 3 };
    if (count === 9) return { columns: 3, rows: 3 };
    throw new Error("Elige 2, 4, 6 o 9 páginas por hoja.");
  }

  function sheetCount(totalPages, perSheet) {
    const total = parseNumber(totalPages, "El número de páginas", 1);
    const count = parseNumber(perSheet, "Las páginas por hoja", 2, 9);
    gridFor(count);
    return Math.ceil(total / count);
  }

  function slotRect(sheetWidth, sheetHeight, perSheet, margin, gap, slotIndex) {
    const grid = gridFor(perSheet);
    const outer = parseNumber(margin, "El margen", 0, Math.min(sheetWidth, sheetHeight) / 3);
    const spacing = parseNumber(gap, "El espacio", 0, Math.min(sheetWidth, sheetHeight) / 6);
    const availableWidth = sheetWidth - outer * 2 - spacing * (grid.columns - 1);
    const availableHeight = sheetHeight - outer * 2 - spacing * (grid.rows - 1);
    const slotWidth = availableWidth / grid.columns;
    const slotHeight = availableHeight / grid.rows;
    if (slotWidth <= 0 || slotHeight <= 0) throw new Error("El margen o el espacio dejan una cuadrícula sin sitio.");
    const column = slotIndex % grid.columns;
    const row = Math.floor(slotIndex / grid.columns);
    return { x: outer + column * (slotWidth + spacing), y: sheetHeight - outer - (row + 1) * slotHeight - row * spacing, width: slotWidth, height: slotHeight };
  }

  function fitPage(sourceWidth, sourceHeight, slot) {
    const scale = Math.min(slot.width / sourceWidth, slot.height / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    return { x: slot.x + (slot.width - width) / 2, y: slot.y + (slot.height - height) / 2, width, height };
  }

  function paperSize(paper) {
    const selected = PAPERS[paper];
    if (!selected) throw new Error("El tamaño de papel no es válido.");
    return { width: selected.width, height: selected.height };
  }

  function outputName(filename) {
    const source = String(filename || "documento.pdf");
    const stem = source.replace(/\.pdf$/i, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "documento";
    return `${stem}-varias-paginas-por-hoja.pdf`;
  }

  return { parseNumber, gridFor, sheetCount, slotRect, fitPage, paperSize, outputName, PAPERS };
});

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLotePdfTexto = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function safeStem(filename) {
    const source = String(filename || "documento.pdf").replace(/\.pdf$/i, "");
    return source.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "documento";
  }

  function outputName(filename) {
    return `${safeStem(filename)}-texto.txt`;
  }

  function textFromItems(items) {
    let output = "";
    let previousY = null;
    let previousX = null;
    for (const item of items || []) {
      const value = String(item?.str ?? "");
      const transform = Array.isArray(item?.transform) ? item.transform : [];
      const x = Number.isFinite(transform[4]) ? transform[4] : null;
      const y = Number.isFinite(transform[5]) ? transform[5] : null;
      const height = Number.isFinite(item?.height) && item.height > 0 ? item.height : 4;
      if (!value) {
        if (item?.hasEOL && output && !output.endsWith("\n")) output += "\n";
        continue;
      }
      if (output && !output.endsWith("\n")) {
        const newLine = item?.hasEOL || (previousY !== null && y !== null && Math.abs(y - previousY) > Math.max(height, 3));
        if (newLine) output += "\n";
        else if (previousX !== null && x !== null && x >= previousX && !output.endsWith(" ") && !value.startsWith(" ")) output += " ";
      }
      output += value;
      if (item?.hasEOL && !output.endsWith("\n")) output += "\n";
      previousY = y;
      previousX = x === null ? null : x + (Number(item?.width) || 0);
    }
    return output.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function pageHeader(filename, pageNumber) {
    return `===== ${filename} · Página ${pageNumber} =====`;
  }

  function combinedText(documents) {
    return documents.map((document) => [
      `##### ${document.filename} #####`,
      document.pages.map((page) => `${pageHeader(document.filename, page.pageNumber)}\n${page.text || "[Sin texto extraíble]"}`).join("\n\n")
    ].join("\n\n")).join("\n\n").trim() + "\n";
  }

  function summary(documents) {
    const pages = documents.reduce((total, document) => total + document.pages.length, 0);
    const characters = documents.reduce((total, document) => total + document.pages.reduce((sum, page) => sum + page.text.length, 0), 0);
    return { documents: documents.length, pages, characters };
  }

  return { safeStem, outputName, textFromItems, pageHeader, combinedText, summary };
});

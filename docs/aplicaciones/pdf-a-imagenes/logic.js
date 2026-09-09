(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLotePdfImagenes = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function parseNumber(value, label, minimum, maximum) {
    const number = Number(String(value ?? "").trim());
    if (!Number.isFinite(number) || number < minimum || (maximum !== undefined && number > maximum)) {
      const limit = maximum === undefined ? `mayor o igual que ${minimum}` : `entre ${minimum} y ${maximum}`;
      throw new Error(`${label} debe ser un número ${limit}.`);
    }
    return number;
  }

  function parsePages(value, totalPages) {
    const total = parseNumber(totalPages, "El número total de páginas", 1);
    const raw = String(value ?? "").trim();
    if (!raw) return Array.from({ length: total }, (_, index) => index + 1);

    const pages = new Set();
    for (const item of raw.split(",")) {
      const part = item.trim();
      if (!part) continue;
      const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        const start = Number(range[1]);
        const end = Number(range[2]);
        if (start < 1 || end < 1 || start > total || end > total || start > end) {
          throw new Error(`El rango «${part}» no está dentro de las páginas disponibles.`);
        }
        for (let page = start; page <= end; page += 1) pages.add(page);
        continue;
      }
      if (!/^\d+$/.test(part)) throw new Error(`No entiendo «${part}». Usa números y rangos, por ejemplo 1-3, 7.`);
      const page = Number(part);
      if (page < 1 || page > total) throw new Error(`La página ${page} no existe en este documento.`);
      pages.add(page);
    }
    const result = [...pages].sort((left, right) => left - right);
    if (!result.length) throw new Error("Indica al menos una página para convertir.");
    return result;
  }

  function safeStem(filename) {
    const source = String(filename || "documento.pdf").replace(/\.pdf$/i, "");
    return source.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "documento";
  }

  function outputName(filename, pageNumber, format) {
    const extension = String(format || "png").toLowerCase() === "jpg" ? "jpg" : "png";
    const page = String(parseNumber(pageNumber, "El número de página", 1)).padStart(2, "0");
    return `${safeStem(filename)}-pagina-${page}.${extension}`;
  }

  function imageSettings(format, scale, quality) {
    const selectedFormat = String(format || "png").toLowerCase();
    if (selectedFormat !== "png" && selectedFormat !== "jpg") throw new Error("El formato debe ser PNG o JPG.");
    const selectedScale = parseNumber(scale, "La escala", 0.75, 3);
    const selectedQuality = parseNumber(quality, "La calidad JPG", 0.5, 1);
    return {
      format: selectedFormat,
      scale: selectedScale,
      quality: selectedQuality,
      mime: selectedFormat === "jpg" ? "image/jpeg" : "image/png"
    };
  }

  function pixelCount(width, height) {
    return Math.ceil(Number(width) * Number(height));
  }

  return { parseNumber, parsePages, outputName, imageSettings, pixelCount, safeStem };
});

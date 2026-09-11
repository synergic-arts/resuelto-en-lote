(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ImageToTextOcrLogic = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function ascii(bytes, start, length) {
    return String.fromCharCode(...bytes.slice(start, start + length));
  }

  function imageFormat(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
    if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG" && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "png";
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
    if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";
    if (bytes.length >= 2 && ascii(bytes, 0, 2) === "BM") return "bmp";
    return null;
  }

  function safeStem(filename) {
    const source = String(filename || "imagen").trim() || "imagen";
    const dot = source.lastIndexOf(".");
    const stem = dot > 0 ? source.slice(0, dot) : source;
    return stem.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/[. ]+$/g, "").trim() || "imagen";
  }

  function textFilename(filename) {
    return `${safeStem(filename)}-texto.txt`;
  }

  function validateBatch(files, limits) {
    if (!files.length) throw new Error("Añade al menos una imagen.");
    if (files.length > limits.maxFiles) throw new Error(`El lote supera el máximo de ${limits.maxFiles} imágenes.`);
    const oversized = files.find((file) => file.size > limits.maxFileBytes);
    if (oversized) throw new Error(`${oversized.name} supera el límite de 20 MB por archivo.`);
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > limits.maxTotalBytes) throw new Error("El lote supera el límite total de 100 MB.");
    return { count: files.length, totalBytes };
  }

  function cleanRecognizedText(value) {
    return String(value || "").replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
  }

  function combinedText(items) {
    return items.map((item) => `===== ${item.name} =====\n${cleanRecognizedText(item.text)}`).join("\n\n");
  }

  return { imageFormat, safeStem, textFilename, validateBatch, cleanRecognizedText, combinedText };
});

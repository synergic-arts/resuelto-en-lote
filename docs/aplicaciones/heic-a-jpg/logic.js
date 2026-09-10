(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HeicToJpgLogic = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

  function ascii(bytes, start, length) {
    return String.fromCharCode(...bytes.slice(start, start + length));
  }

  function isHeicSignature(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
    if (bytes.length < 12 || ascii(bytes, 4, 4) !== "ftyp") return false;
    for (let offset = 8; offset + 4 <= Math.min(bytes.length, 64); offset += 4) {
      if (HEIC_BRANDS.has(ascii(bytes, offset, 4))) return true;
    }
    return false;
  }

  function safeStem(filename) {
    const source = String(filename || "foto").trim() || "foto";
    const dot = source.lastIndexOf(".");
    const stem = dot > 0 ? source.slice(0, dot) : source;
    const cleaned = stem.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/[. ]+$/g, "").trim();
    return cleaned || "foto";
  }

  function outputName(filename, imageIndex = 0, imageCount = 1) {
    const suffix = imageCount > 1 ? `-${imageIndex + 1}` : "";
    return `${safeStem(filename)}${suffix}.jpg`;
  }

  function validateBatch(files, limits) {
    const maxFiles = limits.maxFiles;
    const maxFileBytes = limits.maxFileBytes;
    const maxTotalBytes = limits.maxTotalBytes;
    if (!files.length) throw new Error("Añade al menos una foto HEIC o HEIF.");
    if (files.length > maxFiles) throw new Error(`El lote supera el máximo de ${maxFiles} archivos.`);
    const oversized = files.find((file) => file.size > maxFileBytes);
    if (oversized) throw new Error(`${oversized.name} supera el límite por archivo.`);
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > maxTotalBytes) throw new Error("El lote supera el límite total de 300 MB.");
    return { count: files.length, totalBytes };
  }

  return { HEIC_BRANDS, isHeicSignature, safeStem, outputName, validateBatch };
});

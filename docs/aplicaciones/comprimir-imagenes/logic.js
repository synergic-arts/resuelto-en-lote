(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteImageCompressor = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function targetBytes(targetKb) {
    const value = Number(targetKb);
    if (!Number.isFinite(value) || value < 1) throw new Error("Indica un peso objetivo de al menos 1 KB.");
    return Math.round(value * 1024);
  }

  function canvasSize(width, height, maxDimension) {
    const w = Number(width);
    const h = Number(height);
    const limit = Number(maxDimension);
    if (![w, h, limit].every(Number.isFinite) || w < 1 || h < 1 || limit < 1) throw new Error("Las dimensiones de la imagen no son válidas.");
    const scale = Math.min(1, limit / Math.max(w, h));
    return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)), scale };
  }

  function smallerSize(width, height, factor = 0.82) {
    return { width: Math.max(1, Math.round(Number(width) * factor)), height: Math.max(1, Math.round(Number(height) * factor)) };
  }

  function outputName(filename, mime) {
    const source = String(filename || "imagen");
    const dot = source.lastIndexOf(".");
    const stem = (dot > 0 ? source.slice(0, dot) : source).replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "imagen";
    return `${stem}-comprimida.${mime === "image/webp" ? "webp" : "jpg"}`;
  }

  function savedPercent(before, after) {
    const original = Number(before);
    const result = Number(after);
    if (!Number.isFinite(original) || original <= 0 || !Number.isFinite(result)) return 0;
    return Math.round((1 - result / original) * 100);
  }

  return { targetBytes, canvasSize, smallerSize, outputName, savedPercent };
});

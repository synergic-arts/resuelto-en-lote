(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteWatermark = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const positions = ["top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right"];

  function watermarkPosition(width, height, textWidth, textHeight, position, margin) {
    const w = Number(width);
    const h = Number(height);
    const tw = Number(textWidth);
    const th = Number(textHeight);
    const gap = Number(margin);
    if (![w, h, tw, th, gap].every(Number.isFinite) || w < 1 || h < 1 || tw < 0 || th < 0 || gap < 0) throw new Error("Las dimensiones de la marca de agua no son válidas.");
    const safePosition = positions.includes(position) ? position : "bottom-right";
    const horizontal = safePosition.endsWith("left") ? gap : safePosition.endsWith("right") ? w - tw - gap : (w - tw) / 2;
    const vertical = safePosition.startsWith("top") ? gap + th : safePosition.startsWith("bottom") ? h - gap : (h + th) / 2;
    return { x: Math.round(horizontal), y: Math.round(vertical), position: safePosition };
  }

  function fontSize(width, height, percent) {
    const value = Number(percent);
    if (!Number.isFinite(value) || value < 1 || value > 20) throw new Error("El tamaño de la marca de agua debe estar entre 1 % y 20 %.");
    return Math.max(12, Math.round(Math.min(Number(width), Number(height)) * value / 100));
  }

  function outputName(filename, mime) {
    const source = String(filename || "imagen");
    const dot = source.lastIndexOf(".");
    const stem = (dot > 0 ? source.slice(0, dot) : source).replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "imagen";
    const extension = mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpg";
    return `${stem}-marcada.${extension}`;
  }

  return { positions, watermarkPosition, fontSize, outputName };
});

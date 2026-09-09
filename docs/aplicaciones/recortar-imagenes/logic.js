(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteCrop = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const presets = {
    square: { label: "Cuadrado 1:1", ratio: 1 },
    portrait: { label: "Retrato 4:5", ratio: 4 / 5 },
    story: { label: "Story o Reel 9:16", ratio: 9 / 16 },
    youtube: { label: "Miniatura 16:9", ratio: 16 / 9 },
    classic: { label: "Clásico 4:3", ratio: 4 / 3 },
    vertical: { label: "Vertical 3:4", ratio: 3 / 4 }
  };
  const anchors = ["center", "top", "bottom", "left", "right"];

  function resolveRatio(mode, customWidth, customHeight) {
    if (presets[mode]) return presets[mode].ratio;
    const width = Number(customWidth);
    const height = Number(customHeight);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width > 10000 || height > 10000) {
      throw new Error("La proporción personalizada debe tener un ancho y un alto válidos.");
    }
    return width / height;
  }

  function cropRect(width, height, ratio, anchor) {
    const w = Number(width);
    const h = Number(height);
    const r = Number(ratio);
    if (![w, h, r].every(Number.isFinite) || w < 1 || h < 1 || r <= 0) throw new Error("Las dimensiones del recorte no son válidas.");
    const safeAnchor = anchors.includes(anchor) ? anchor : "center";
    let cropWidth = w;
    let cropHeight = h;
    if (w / h > r) cropWidth = h * r;
    else cropHeight = w / r;
    let x = (w - cropWidth) / 2;
    let y = (h - cropHeight) / 2;
    if (cropWidth < w && safeAnchor === "left") x = 0;
    if (cropWidth < w && safeAnchor === "right") x = w - cropWidth;
    if (cropHeight < h && safeAnchor === "top") y = 0;
    if (cropHeight < h && safeAnchor === "bottom") y = h - cropHeight;
    const rounded = {
      x: Math.max(0, Math.min(w - 1, Math.round(x))),
      y: Math.max(0, Math.min(h - 1, Math.round(y))),
      width: Math.max(1, Math.min(w, Math.round(cropWidth))),
      height: Math.max(1, Math.min(h, Math.round(cropHeight)))
    };
    rounded.width = Math.min(rounded.width, w - rounded.x);
    rounded.height = Math.min(rounded.height, h - rounded.y);
    return { ...rounded, anchor: safeAnchor, ratio: r };
  }

  function outputMime(format, sourceType) {
    if (format === "image/jpeg" || format === "image/png" || format === "image/webp") return format;
    return ["image/jpeg", "image/png", "image/webp"].includes(sourceType) ? sourceType : "image/png";
  }

  function outputName(filename, mime) {
    const source = String(filename || "imagen");
    const dot = source.lastIndexOf(".");
    const stem = (dot > 0 ? source.slice(0, dot) : source).replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "imagen";
    const extension = mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpg";
    return `${stem}-recortada.${extension}`;
  }

  return { presets, anchors, resolveRatio, cropRect, outputMime, outputName };
});

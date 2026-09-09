(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteCollage = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const fitModes = ["cover", "contain"];
  const mimeTypes = ["image/jpeg", "image/png", "image/webp"];

  function clampInteger(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
  }

  function normalizeSettings(input = {}) {
    const background = /^#[0-9a-f]{6}$/i.test(String(input.background || "")) ? String(input.background) : "#ffffff";
    const title = String(input.title || "").trim().slice(0, 100);
    return {
      columns: clampInteger(input.columns, 1, 6, 3),
      cellWidth: clampInteger(input.cellWidth, 120, 800, 320),
      cellHeight: clampInteger(input.cellHeight, 120, 800, 240),
      gap: clampInteger(input.gap, 0, 80, 16),
      padding: clampInteger(input.padding, 0, 100, 24),
      background,
      title,
      showNames: Boolean(input.showNames),
      fit: fitModes.includes(input.fit) ? input.fit : "cover"
    };
  }

  function buildLayout(count, input) {
    const total = Number(count);
    if (!Number.isInteger(total) || total < 1 || total > 40) throw new Error("El collage debe tener entre 1 y 40 imágenes.");
    const settings = normalizeSettings(input);
    const rows = Math.ceil(total / settings.columns);
    const titleHeight = settings.title ? 56 : 0;
    const labelHeight = settings.showNames ? 34 : 0;
    const canvasWidth = settings.padding * 2 + settings.columns * settings.cellWidth + (settings.columns - 1) * settings.gap;
    const canvasHeight = settings.padding * 2 + titleHeight + rows * (settings.cellHeight + labelHeight) + (rows - 1) * settings.gap;
    if (canvasWidth > 8000 || canvasHeight > 8000) throw new Error("El collage sería demasiado grande; reduce el tamaño de las celdas o las columnas.");
    const cells = Array.from({ length: total }, (_, index) => {
      const column = index % settings.columns;
      const row = Math.floor(index / settings.columns);
      const x = settings.padding + column * (settings.cellWidth + settings.gap);
      const y = settings.padding + titleHeight + row * (settings.cellHeight + labelHeight + settings.gap);
      return { x, y, width: settings.cellWidth, height: settings.cellHeight, labelY: y + settings.cellHeight + 23 };
    });
    return { ...settings, rows, titleHeight, labelHeight, canvasWidth, canvasHeight, cells };
  }

  function fitRect(sourceWidth, sourceHeight, destination, mode) {
    const sw = Number(sourceWidth);
    const sh = Number(sourceHeight);
    if (![sw, sh].every(Number.isFinite) || sw < 1 || sh < 1) throw new Error("Las dimensiones de una imagen no son válidas.");
    const dw = Number(destination.width);
    const dh = Number(destination.height);
    if (![dw, dh].every(Number.isFinite) || dw < 1 || dh < 1) throw new Error("Las dimensiones de la celda no son válidas.");
    const safeMode = fitModes.includes(mode) ? mode : "cover";
    const scale = safeMode === "cover" ? Math.max(dw / sw, dh / sh) : Math.min(dw / sw, dh / sh);
    const renderedWidth = sw * scale;
    const renderedHeight = sh * scale;
    if (safeMode === "cover") {
      return {
        sx: Math.max(0, (renderedWidth - dw) / scale / 2),
        sy: Math.max(0, (renderedHeight - dh) / scale / 2),
        sw: dw / scale,
        sh: dh / scale,
        dx: destination.x,
        dy: destination.y,
        dw,
        dh
      };
    }
    return {
      sx: 0,
      sy: 0,
      sw,
      sh,
      dx: destination.x + (dw - renderedWidth) / 2,
      dy: destination.y + (dh - renderedHeight) / 2,
      dw: renderedWidth,
      dh: renderedHeight
    };
  }

  function outputMime(format) {
    return mimeTypes.includes(format) ? format : "image/png";
  }

  function outputName(count, mime) {
    const extension = outputMime(mime) === "image/webp" ? "webp" : outputMime(mime) === "image/jpeg" ? "jpg" : "png";
    return `collage-${Math.max(1, Number(count) || 1)}-fotos.${extension}`;
  }

  return { fitModes, normalizeSettings, buildLayout, fitRect, outputMime, outputName };
});

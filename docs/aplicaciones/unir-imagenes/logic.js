(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteImageJoiner = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function positiveInteger(value, label) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) throw new Error(`${label} no es válido.`);
    return number;
  }

  function calculateLayout(images, options = {}) {
    if (!Array.isArray(images) || images.length < 2) throw new Error("Selecciona al menos 2 imágenes.");
    const orientation = options.orientation === "horizontal" ? "horizontal" : "vertical";
    const gap = positiveInteger(options.gap ?? 24, "La separación");
    const maxSide = positiveInteger(options.maxSide ?? 1800, "El lado máximo");
    if (maxSide < 320) throw new Error("El lado máximo debe ser de al menos 320 píxeles.");
    const sizes = images.map((image) => {
      const width = Number(image.width);
      const height = Number(image.height);
      if (![width, height].every(Number.isFinite) || width < 1 || height < 1) throw new Error("Una de las imágenes tiene dimensiones no válidas.");
      const reference = orientation === "vertical" ? width : height;
      const scale = Math.min(1, maxSide / reference);
      return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scale };
    });
    const width = orientation === "vertical" ? Math.max(...sizes.map((item) => item.width)) : sizes.reduce((sum, item) => sum + item.width, 0) + gap * (sizes.length - 1);
    const height = orientation === "vertical" ? sizes.reduce((sum, item) => sum + item.height, 0) + gap * (sizes.length - 1) : Math.max(...sizes.map((item) => item.height));
    const placements = [];
    let cursor = 0;
    sizes.forEach((size, index) => {
      placements.push({ index, x: orientation === "vertical" ? Math.round((width - size.width) / 2) : cursor, y: orientation === "vertical" ? cursor : Math.round((height - size.height) / 2), width: size.width, height: size.height, scale: size.scale });
      cursor += (orientation === "vertical" ? size.height : size.width) + gap;
    });
    return { orientation, gap, maxSide, width, height, sizes, placements };
  }

  function outputName(firstName, format) {
    const source = String(firstName || "imagenes");
    const dot = source.lastIndexOf(".");
    const stem = (dot > 0 ? source.slice(0, dot) : source).replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "imagenes";
    return `${stem}-unidas.${format === "image/jpeg" ? "jpg" : "png"}`;
  }

  return { calculateLayout, outputName };
});

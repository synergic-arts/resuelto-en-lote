(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteImageMetadataCleaner = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function outputMime(value) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(value)) throw new Error("El formato de salida no es válido.");
    return value;
  }

  function outputExtension(mime) {
    return outputMime(mime) === "image/jpeg" ? "jpg" : outputMime(mime) === "image/webp" ? "webp" : "png";
  }

  function outputName(filename, mime) {
    const source = String(filename || "imagen");
    const dot = source.lastIndexOf(".");
    const stem = (dot > 0 ? source.slice(0, dot) : source).replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "imagen";
    return `${stem}-sin-metadatos.${outputExtension(mime)}`;
  }

  function supportedInput(file) {
    return Boolean(file && ["image/jpeg", "image/png", "image/webp"].includes(file.type));
  }

  return { outputMime, outputExtension, outputName, supportedInput };
});

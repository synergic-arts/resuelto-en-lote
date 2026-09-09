(function () {
  "use strict";

  const engine = window.ResueltoEnLoteImageMetadataCleaner;
  const filesInput = document.querySelector("#files");
  const formatInput = document.querySelector("#format");
  const cleanButton = document.querySelector("#clean");
  const clearButton = document.querySelector("#clear");
  const status = document.querySelector("#status");
  const summary = document.querySelector("#summary");
  const results = document.querySelector("#results");
  let objectUrls = [];

  function setStatus(message, kind = "") {
    status.textContent = message;
    status.className = `status ${kind}`.trim();
  }

  function clearResults() {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls = [];
    results.replaceChildren();
    summary.textContent = "Todavía no hay resultados.";
  }

  function encode(canvas, mime) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("No se ha podido crear la copia limpia."));
      if (blob.type !== mime) return reject(new Error(`Este navegador no admite la salida ${engine.outputExtension(mime).toUpperCase()}.`));
      resolve(blob);
    }, mime, mime === "image/png" ? undefined : 0.92));
  }

  async function cleanFile(file, mime) {
    if (!engine.supportedInput(file)) throw new Error("Admite JPG, PNG y WebP.");
    const bitmap = await createImageBitmap(file);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { alpha: mime !== "image/jpeg" });
      if (!context) throw new Error("El navegador no ha podido preparar el lienzo.");
      if (mime === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, bitmap.width, bitmap.height);
      }
      context.drawImage(bitmap, 0, 0);
      const blob = await encode(canvas, mime);
      return { blob, width: bitmap.width, height: bitmap.height };
    } finally { bitmap.close(); }
  }

  function addResult(file, result, mime) {
    const url = URL.createObjectURL(result.blob);
    objectUrls.push(url);
    const item = document.createElement("li");
    item.className = "result-item";
    const preview = document.createElement("img");
    preview.className = "result-preview";
    preview.src = url;
    preview.alt = `Vista previa de ${file.name} sin metadatos`;
    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = engine.outputName(file.name, mime);
    const note = document.createElement("p");
    note.textContent = `${Math.round(file.size / 1024)} KB → ${Math.round(result.blob.size / 1024)} KB · ${result.width} × ${result.height}px · copia nueva`;
    info.append(title, note);
    const link = document.createElement("a");
    link.className = "button secondary";
    link.href = url;
    link.download = engine.outputName(file.name, mime);
    link.textContent = "Descargar";
    item.append(preview, info, link);
    results.append(item);
  }

  async function cleanAll() {
    const files = [...filesInput.files];
    if (!files.length) return;
    if (files.length > 30) return setStatus("Selecciona como máximo 30 imágenes por lote.", "error");
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > 150 * 1024 * 1024) return setStatus("El lote supera el máximo recomendado de 150 MB.", "error");
    const mime = engine.outputMime(formatInput.value);
    clearResults();
    cleanButton.disabled = true;
    filesInput.disabled = true;
    formatInput.disabled = true;
    let done = 0;
    let failed = 0;
    for (const [index, file] of files.entries()) {
      setStatus(`Creando copia limpia ${index + 1} de ${files.length}: ${file.name}`);
      try {
        addResult(file, await cleanFile(file, mime), mime);
        done += 1;
      } catch (error) {
        failed += 1;
        const item = document.createElement("li");
        item.className = "result-item error";
        item.textContent = `${file.name}: ${error.message || "no se ha podido procesar"}`;
        results.append(item);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    summary.textContent = `${done} ${done === 1 ? "copia preparada" : "copias preparadas"}${failed ? ` · ${failed} ${failed === 1 ? "error" : "errores"}` : ""} · salida ${engine.outputExtension(mime).toUpperCase()}`;
    setStatus(`Proceso terminado: ${done} ${done === 1 ? "imagen lista" : "imágenes listas"}${failed ? ` y ${failed} ${failed === 1 ? "error" : "errores"}` : ""}.`, failed ? "warning" : "success");
    cleanButton.disabled = filesInput.files.length === 0;
    filesInput.disabled = false;
    formatInput.disabled = false;
  }

  filesInput.addEventListener("change", () => { clearResults(); cleanButton.disabled = filesInput.files.length === 0; setStatus(filesInput.files.length ? `${filesInput.files.length} ${filesInput.files.length === 1 ? "imagen seleccionada" : "imágenes seleccionadas"}.` : "Selecciona una o varias imágenes."); });
  cleanButton.addEventListener("click", () => cleanAll().catch((error) => { setStatus(`No se ha podido completar el proceso: ${error.message || error}`, "error"); cleanButton.disabled = filesInput.files.length === 0; filesInput.disabled = false; formatInput.disabled = false; }));
  clearButton.addEventListener("click", () => { filesInput.value = ""; clearResults(); cleanButton.disabled = true; setStatus("Selección y resultados eliminados."); });
  window.addEventListener("pagehide", clearResults);
})();

(function () {
  "use strict";

  const engine = window.ResueltoEnLoteWatermark;
  const filesInput = document.querySelector("#files");
  const textInput = document.querySelector("#watermark-text");
  const positionInput = document.querySelector("#position");
  const sizeInput = document.querySelector("#size-percent");
  const opacityInput = document.querySelector("#opacity");
  const colorInput = document.querySelector("#color");
  const formatInput = document.querySelector("#format");
  const applyButton = document.querySelector("#apply");
  const clearButton = document.querySelector("#clear");
  const status = document.querySelector("#status");
  const summary = document.querySelector("#summary");
  const results = document.querySelector("#results");
  const opacityValue = document.querySelector("#opacity-value");
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
      if (!blob) return reject(new Error("No se ha podido crear la imagen marcada."));
      if (blob.type !== mime) return reject(new Error(`Este navegador no admite la salida ${mime === "image/webp" ? "WebP" : mime === "image/png" ? "PNG" : "JPG"}.`));
      resolve(blob);
    }, mime, mime === "image/png" ? undefined : 0.92));
  }

  async function watermarkFile(file, settings) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Admite JPG, PNG y WebP.");
    const bitmap = await createImageBitmap(file);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("El navegador no ha podido preparar el lienzo.");
      if (settings.mime === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, bitmap.width, bitmap.height);
      }
      context.drawImage(bitmap, 0, 0);
      const size = engine.fontSize(bitmap.width, bitmap.height, settings.sizePercent);
      context.font = `700 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
      context.textBaseline = "alphabetic";
      const metrics = context.measureText(settings.text);
      const textWidth = Math.ceil(metrics.width);
      const textHeight = Math.ceil(size * 1.15);
      const margin = Math.max(12, Math.round(Math.min(bitmap.width, bitmap.height) * 0.025));
      const place = engine.watermarkPosition(bitmap.width, bitmap.height, textWidth, textHeight, settings.position, margin);
      context.globalAlpha = settings.opacity;
      context.fillStyle = "#000000";
      context.fillText(settings.text, place.x + Math.max(2, Math.round(size * 0.06)), place.y + Math.max(2, Math.round(size * 0.06)));
      context.fillStyle = settings.color;
      context.fillText(settings.text, place.x, place.y);
      context.globalAlpha = 1;
      const blob = await encode(canvas, settings.mime);
      return { blob, width: bitmap.width, height: bitmap.height, position: place.position };
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
    preview.alt = `Vista previa de ${file.name} con marca de agua`;
    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = engine.outputName(file.name, mime);
    const note = document.createElement("p");
    note.textContent = `${Math.round(file.size / 1024)} KB → ${Math.round(result.blob.size / 1024)} KB · ${result.width} × ${result.height}px · ${result.position}`;
    info.append(title, note);
    const link = document.createElement("a");
    link.className = "button secondary";
    link.href = url;
    link.download = engine.outputName(file.name, mime);
    link.textContent = "Descargar";
    item.append(preview, info, link);
    results.append(item);
  }

  async function applyWatermark() {
    const files = [...filesInput.files];
    if (!files.length) return;
    const text = textInput.value.trim();
    if (!text) return setStatus("Escribe el texto de la marca de agua.", "error");
    if (text.length > 80) return setStatus("Usa como máximo 80 caracteres para que la marca sea legible.", "error");
    if (files.length > 30) return setStatus("Selecciona como máximo 30 imágenes por lote.", "error");
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > 150 * 1024 * 1024) return setStatus("El lote supera el máximo recomendado de 150 MB.", "error");
    const settings = { text, position: positionInput.value, sizePercent: sizeInput.value, opacity: Number(opacityInput.value) / 100, color: colorInput.value, mime: formatInput.value };
    clearResults();
    applyButton.disabled = true;
    filesInput.disabled = true;
    textInput.disabled = true;
    positionInput.disabled = true;
    sizeInput.disabled = true;
    opacityInput.disabled = true;
    colorInput.disabled = true;
    formatInput.disabled = true;
    let done = 0;
    let failed = 0;
    for (const [index, file] of files.entries()) {
      setStatus(`Aplicando la marca ${index + 1} de ${files.length}: ${file.name}`);
      try { addResult(file, await watermarkFile(file, settings), settings.mime); done += 1; }
      catch (error) { failed += 1; const item = document.createElement("li"); item.className = "result-item error"; item.textContent = `${file.name}: ${error.message || "no se ha podido procesar"}`; results.append(item); }
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    summary.textContent = `${done} ${done === 1 ? "imagen marcada" : "imágenes marcadas"}${failed ? ` · ${failed} ${failed === 1 ? "error" : "errores"}` : ""} · salida ${settings.mime === "image/webp" ? "WebP" : settings.mime === "image/png" ? "PNG" : "JPG"}`;
    setStatus(`Proceso terminado: ${done} ${done === 1 ? "imagen lista" : "imágenes listas"}${failed ? ` y ${failed} ${failed === 1 ? "error" : "errores"}` : ""}.`, failed ? "warning" : "success");
    applyButton.disabled = filesInput.files.length === 0;
    filesInput.disabled = false;
    textInput.disabled = false;
    positionInput.disabled = false;
    sizeInput.disabled = false;
    opacityInput.disabled = false;
    colorInput.disabled = false;
    formatInput.disabled = false;
  }

  filesInput.addEventListener("change", () => { clearResults(); applyButton.disabled = filesInput.files.length === 0; setStatus(filesInput.files.length ? `${filesInput.files.length} ${filesInput.files.length === 1 ? "imagen seleccionada" : "imágenes seleccionadas"}.` : "Selecciona una o varias imágenes."); });
  opacityInput.addEventListener("input", () => { opacityValue.textContent = `${opacityInput.value} %`; });
  applyButton.addEventListener("click", () => applyWatermark().catch((error) => { setStatus(`No se ha podido completar el proceso: ${error.message || error}`, "error"); applyButton.disabled = filesInput.files.length === 0; filesInput.disabled = false; textInput.disabled = false; positionInput.disabled = false; sizeInput.disabled = false; opacityInput.disabled = false; colorInput.disabled = false; formatInput.disabled = false; }));
  clearButton.addEventListener("click", () => { filesInput.value = ""; clearResults(); applyButton.disabled = true; setStatus("Selección y resultados eliminados."); });
  window.addEventListener("pagehide", clearResults);
})();

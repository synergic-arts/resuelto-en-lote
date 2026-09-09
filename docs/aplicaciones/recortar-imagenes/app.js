(function () {
  "use strict";

  const engine = window.ResueltoEnLoteCrop;
  const filesInput = document.querySelector("#files");
  const presetInput = document.querySelector("#preset");
  const customControls = document.querySelector("#custom-controls");
  const customWidthInput = document.querySelector("#custom-width");
  const customHeightInput = document.querySelector("#custom-height");
  const anchorInput = document.querySelector("#anchor");
  const formatInput = document.querySelector("#format");
  const applyButton = document.querySelector("#apply");
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

  function toggleCustom() {
    const visible = presetInput.value === "custom";
    customControls.hidden = !visible;
    customWidthInput.disabled = !visible;
    customHeightInput.disabled = !visible;
  }

  function encode(canvas, mime) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("No se ha podido crear el recorte."));
      if (blob.type !== mime) return reject(new Error(`Este navegador no admite la salida ${mime === "image/webp" ? "WebP" : mime === "image/png" ? "PNG" : "JPG"}.`));
      resolve(blob);
    }, mime, mime === "image/png" ? undefined : 0.92));
  }

  async function cropFile(file, settings) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Admite JPG, PNG y WebP.");
    const bitmap = await createImageBitmap(file);
    try {
      const rect = engine.cropRect(bitmap.width, bitmap.height, settings.ratio, settings.anchor);
      const canvas = document.createElement("canvas");
      canvas.width = rect.width;
      canvas.height = rect.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("El navegador no ha podido preparar el lienzo.");
      const mime = engine.outputMime(settings.format, file.type);
      if (mime === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, rect.width, rect.height);
      }
      context.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
      return { blob: await encode(canvas, mime), width: rect.width, height: rect.height, sourceWidth: bitmap.width, sourceHeight: bitmap.height, mime };
    } finally { bitmap.close(); }
  }

  function addResult(file, result) {
    const url = URL.createObjectURL(result.blob);
    objectUrls.push(url);
    const item = document.createElement("li");
    item.className = "result-item";
    const preview = document.createElement("img");
    preview.className = "result-preview";
    preview.src = url;
    preview.alt = `Vista previa del recorte de ${file.name}`;
    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = engine.outputName(file.name, result.mime);
    const note = document.createElement("p");
    note.textContent = `${result.sourceWidth} × ${result.sourceHeight}px → ${result.width} × ${result.height}px · ${Math.round(result.blob.size / 1024)} KB`;
    info.append(title, note);
    const link = document.createElement("a");
    link.className = "button secondary";
    link.href = url;
    link.download = engine.outputName(file.name, result.mime);
    link.textContent = "Descargar";
    item.append(preview, info, link);
    results.append(item);
  }

  function lockControls(locked) {
    [filesInput, presetInput, customWidthInput, customHeightInput, anchorInput, formatInput].forEach((control) => { control.disabled = locked; });
    if (!locked) toggleCustom();
    applyButton.disabled = locked || filesInput.files.length === 0;
  }

  async function applyCrop() {
    const files = [...filesInput.files];
    if (!files.length) return;
    if (files.length > 30) return setStatus("Selecciona como máximo 30 imágenes por lote.", "error");
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > 150 * 1024 * 1024) return setStatus("El lote supera el máximo recomendado de 150 MB.", "error");
    let ratio;
    try { ratio = engine.resolveRatio(presetInput.value, customWidthInput.value, customHeightInput.value); }
    catch (error) { return setStatus(error.message, "error"); }
    const settings = { ratio, anchor: anchorInput.value, format: formatInput.value };
    clearResults();
    lockControls(true);
    let done = 0;
    let failed = 0;
    for (const [index, file] of files.entries()) {
      setStatus(`Recortando ${index + 1} de ${files.length}: ${file.name}`);
      try { addResult(file, await cropFile(file, settings)); done += 1; }
      catch (error) { failed += 1; const item = document.createElement("li"); item.className = "result-item error"; item.textContent = `${file.name}: ${error.message || "no se ha podido procesar"}`; results.append(item); }
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    summary.textContent = `${done} ${done === 1 ? "imagen recortada" : "imágenes recortadas"}${failed ? ` · ${failed} ${failed === 1 ? "error" : "errores"}` : ""} · proporción ${ratio.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}:1`;
    setStatus(`Proceso terminado: ${done} ${done === 1 ? "imagen lista" : "imágenes listas"}${failed ? ` y ${failed} ${failed === 1 ? "error" : "errores"}` : ""}.`, failed ? "warning" : "success");
    lockControls(false);
  }

  filesInput.addEventListener("change", () => { clearResults(); applyButton.disabled = filesInput.files.length === 0; setStatus(filesInput.files.length ? `${filesInput.files.length} ${filesInput.files.length === 1 ? "imagen seleccionada" : "imágenes seleccionadas"}.` : "Selecciona una o varias imágenes."); });
  presetInput.addEventListener("change", toggleCustom);
  applyButton.addEventListener("click", () => applyCrop().catch((error) => { setStatus(`No se ha podido completar el proceso: ${error.message || error}`, "error"); lockControls(false); }));
  clearButton.addEventListener("click", () => { filesInput.value = ""; clearResults(); applyButton.disabled = true; setStatus("Selección y resultados eliminados."); });
  toggleCustom();
  window.addEventListener("pagehide", clearResults);
})();

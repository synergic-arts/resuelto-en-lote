(function () {
  "use strict";

  const engine = window.ResueltoEnLoteImageCompressor;
  const filesInput = document.querySelector("#files");
  const targetInput = document.querySelector("#target-kb");
  const maxDimensionInput = document.querySelector("#max-dimension");
  const formatInput = document.querySelector("#format");
  const compressButton = document.querySelector("#compress");
  const exampleButton = document.querySelector("#example");
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

  function encode(canvas, mime, quality) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("El navegador no ha podido crear la imagen."));
      if (blob.type !== mime) return reject(new Error(`Este navegador no admite la salida ${mime === "image/webp" ? "WebP" : "JPG"}.`));
      resolve(blob);
    }, mime, quality));
  }

  function draw(bitmap, width, height, mime) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: mime !== "image/jpeg" });
    if (!context) throw new Error("El navegador no ha podido preparar el lienzo.");
    if (mime === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(bitmap, 0, 0, width, height);
    return canvas;
  }

  async function compressBitmap(bitmap, target, mime, maxDimension) {
    let size = engine.canvasSize(bitmap.width, bitmap.height, maxDimension);
    let lastBlob = null;
    let lastSize = size;
    for (let dimensionTry = 0; dimensionTry < 7; dimensionTry += 1) {
      lastSize = { ...size };
      const canvas = draw(bitmap, size.width, size.height, mime);
      const highQuality = await encode(canvas, mime, 0.92);
      lastBlob = highQuality;
      if (highQuality.size <= target) return { blob: highQuality, width: size.width, height: size.height, quality: 0.92 };
      let low = 0.08;
      let high = 0.92;
      let best = null;
      let bestQuality = low;
      for (let attempt = 0; attempt < 9; attempt += 1) {
        const quality = (low + high) / 2;
        const candidate = await encode(canvas, mime, quality);
        if (candidate.size <= target) {
          best = candidate;
          bestQuality = quality;
          low = quality;
        } else {
          high = quality;
        }
      }
      if (best) return { blob: best, width: size.width, height: size.height, quality: bestQuality };
      size = engine.smallerSize(size.width, size.height);
      if (Math.max(size.width, size.height) < 320) break;
    }
    return { blob: lastBlob, width: lastSize.width, height: lastSize.height, quality: 0.08, overTarget: true };
  }

  function addResult(file, result, target, mime) {
    const item = document.createElement("li");
    item.className = "result-item";
    const preview = document.createElement("img");
    preview.className = "result-preview";
    preview.src = URL.createObjectURL(result.blob);
    preview.alt = `Vista previa de ${file.name}`;
    objectUrls.push(preview.src);
    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = engine.outputName(file.name, mime);
    const saved = engine.savedPercent(file.size, result.blob.size);
    const note = document.createElement("p");
    note.textContent = `${Math.round(file.size / 1024)} KB → ${Math.round(result.blob.size / 1024)} KB · ${saved >= 0 ? `${saved} % menos` : `${Math.abs(saved)} % más`} · ${result.width} × ${result.height}px`;
    info.append(title, note);
    if (result.overTarget) {
      const warning = document.createElement("p");
      warning.className = "error";
      warning.textContent = `No se ha podido bajar de ${Math.round(target / 1024)} KB sin reducir más la imagen.`;
      info.append(warning);
    }
    const link = document.createElement("a");
    link.className = "button secondary";
    link.href = preview.src;
    link.download = engine.outputName(file.name, mime);
    link.textContent = "Descargar";
    item.append(preview, info, link);
    results.append(item);
  }

  async function compressAll() {
    const files = [...filesInput.files];
    if (!files.length) return;
    let target;
    try { target = engine.targetBytes(targetInput.value); } catch (error) { setStatus(error.message, "error"); return; }
    const maxDimension = Number(maxDimensionInput.value);
    if (!Number.isInteger(maxDimension) || maxDimension < 320) return setStatus("La dimensión máxima debe ser de al menos 320 píxeles.", "error");
    if (files.length > 30) return setStatus("Selecciona como máximo 30 imágenes por lote.", "error");
    clearResults();
    compressButton.disabled = true;
    filesInput.disabled = true;
    targetInput.disabled = true;
    maxDimensionInput.disabled = true;
    formatInput.disabled = true;
    let done = 0;
    let failed = 0;
    for (const [index, file] of files.entries()) {
      setStatus(`Comprimiendo ${index + 1} de ${files.length}: ${file.name}`);
      try {
        const bitmap = await createImageBitmap(file);
        try {
          const result = await compressBitmap(bitmap, target, formatInput.value, maxDimension);
          addResult(file, result, target, formatInput.value);
          done += 1;
        } finally { bitmap.close(); }
      } catch (error) {
        failed += 1;
        const item = document.createElement("li");
        item.className = "result-item error";
        item.textContent = `${file.name}: ${error.message || "no se ha podido procesar"}`;
        results.append(item);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    summary.textContent = `${done} ${done === 1 ? "imagen preparada" : "imágenes preparadas"} · objetivo: ${targetInput.value} KB${failed ? ` · ${failed} ${failed === 1 ? "error" : "errores"}` : ""}`;
    setStatus(`Proceso terminado: ${done} ${done === 1 ? "imagen lista" : "imágenes listas"}${failed ? ` y ${failed} ${failed === 1 ? "error" : "errores"}` : ""}.`, failed ? "warning" : "success");
    compressButton.disabled = filesInput.files.length === 0;
    filesInput.disabled = false;
    targetInput.disabled = false;
    maxDimensionInput.disabled = false;
    formatInput.disabled = false;
  }

  function loadExample() {
    setStatus("Selecciona una foto para probar el compresor; el ejemplo usa un objetivo de 100 KB.");
    targetInput.value = 100;
    maxDimensionInput.value = 1600;
  }

  filesInput.addEventListener("change", () => { clearResults(); compressButton.disabled = filesInput.files.length === 0; setStatus(filesInput.files.length ? `${filesInput.files.length} ${filesInput.files.length === 1 ? "imagen seleccionada" : "imágenes seleccionadas"}.` : "Selecciona una o varias imágenes."); });
  compressButton.addEventListener("click", () => compressAll().catch((error) => { setStatus(`No se ha podido completar el proceso: ${error.message || error}`, "error"); compressButton.disabled = filesInput.files.length === 0; filesInput.disabled = false; targetInput.disabled = false; maxDimensionInput.disabled = false; formatInput.disabled = false; }));
  exampleButton.addEventListener("click", loadExample);
  clearButton.addEventListener("click", () => { filesInput.value = ""; clearResults(); compressButton.disabled = true; setStatus("Selección y resultados eliminados."); });
  window.addEventListener("pagehide", clearResults);
})();

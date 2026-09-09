(function () {
  "use strict";

  const engine = window.ResueltoEnLoteImageJoiner;
  const filesInput = document.querySelector("#files");
  const orientationInput = document.querySelector("#orientation");
  const gapInput = document.querySelector("#gap");
  const maxSideInput = document.querySelector("#max-side");
  const backgroundInput = document.querySelector("#background");
  const formatInput = document.querySelector("#format");
  const joinButton = document.querySelector("#join");
  const clearButton = document.querySelector("#clear");
  const status = document.querySelector("#status");
  const summary = document.querySelector("#summary");
  const fileList = document.querySelector("#file-list");
  const resultArea = document.querySelector("#result-area");
  const preview = document.querySelector("#preview");
  const download = document.querySelector("#download");
  let selectedFiles = [];
  let previewUrl = null;

  function setStatus(message, kind = "") {
    status.textContent = message;
    status.className = `status ${kind}`.trim();
  }

  function clearResult() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    preview.removeAttribute("src");
    resultArea.hidden = true;
    summary.textContent = "Todavía no hay resultados.";
  }

  function renderFileList() {
    fileList.replaceChildren();
    selectedFiles.forEach((file, index) => {
      const item = document.createElement("li");
      item.className = "file-row";
      const name = document.createElement("span");
      name.textContent = `${index + 1}. ${file.name}`;
      const actions = document.createElement("span");
      actions.className = "file-actions";
      [["↑", index === 0, -1], ["↓", index === selectedFiles.length - 1, 1]].forEach(([label, disabled, delta]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary small";
        button.textContent = label;
        button.disabled = disabled;
        button.setAttribute("aria-label", `${label === "↑" ? "Subir" : "Bajar"} ${file.name}`);
        button.addEventListener("click", () => { const target = index + delta; [selectedFiles[index], selectedFiles[target]] = [selectedFiles[target], selectedFiles[index]]; renderFileList(); });
        actions.append(button);
      });
      item.append(name, actions);
      fileList.append(item);
    });
  }

  function loadBitmap(file) {
    if (typeof createImageBitmap !== "function") throw new Error("Este navegador no admite la lectura de imágenes necesaria.");
    return createImageBitmap(file);
  }

  function encode(canvas, mime) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se ha podido crear la imagen final.")), mime, mime === "image/jpeg" ? 0.92 : undefined));
  }

  async function joinImages() {
    if (selectedFiles.length < 2) return setStatus("Selecciona al menos 2 imágenes.", "error");
    const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    if (selectedFiles.length > 20) return setStatus("Selecciona como máximo 20 imágenes por composición.", "error");
    if (totalBytes > 150 * 1024 * 1024) return setStatus("El lote supera el máximo recomendado de 150 MB.", "error");
    clearResult();
    joinButton.disabled = true;
    filesInput.disabled = true;
    orientationInput.disabled = true;
    gapInput.disabled = true;
    maxSideInput.disabled = true;
    backgroundInput.disabled = true;
    formatInput.disabled = true;
    const bitmaps = [];
    try {
      for (const [index, file] of selectedFiles.entries()) {
        setStatus(`Leyendo ${index + 1} de ${selectedFiles.length}: ${file.name}`);
        bitmaps.push(await loadBitmap(file));
      }
      const layout = engine.calculateLayout(bitmaps, { orientation: orientationInput.value, gap: gapInput.value, maxSide: maxSideInput.value });
      if (layout.width > 16000 || layout.height > 16000) throw new Error("La composición supera el límite de píxeles del navegador; reduce el lado máximo o la separación.");
      const canvas = document.createElement("canvas");
      canvas.width = layout.width;
      canvas.height = layout.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("El navegador no ha podido preparar el lienzo.");
      context.fillStyle = backgroundInput.value;
      context.fillRect(0, 0, layout.width, layout.height);
      layout.placements.forEach((place, index) => context.drawImage(bitmaps[index], place.x, place.y, place.width, place.height));
      const blob = await encode(canvas, formatInput.value);
      previewUrl = URL.createObjectURL(blob);
      preview.src = previewUrl;
      preview.alt = "Vista previa de las imágenes unidas";
      download.href = previewUrl;
      download.download = engine.outputName(selectedFiles[0].name, formatInput.value);
      summary.textContent = `${selectedFiles.length} imágenes → ${layout.width} × ${layout.height}px · ${Math.round(blob.size / 1024)} KB · ${orientationInput.value === "vertical" ? "vertical" : "horizontal"}`;
      resultArea.hidden = false;
      setStatus("Composición terminada. Comprueba la vista previa y descarga la copia.", "success");
    } catch (error) { setStatus(error.message || String(error), "error"); }
    finally {
      bitmaps.forEach((bitmap) => bitmap.close());
      joinButton.disabled = selectedFiles.length < 2;
      filesInput.disabled = false;
      orientationInput.disabled = false;
      gapInput.disabled = false;
      maxSideInput.disabled = false;
      backgroundInput.disabled = false;
      formatInput.disabled = false;
    }
  }

  filesInput.addEventListener("change", () => { selectedFiles = [...filesInput.files]; clearResult(); renderFileList(); joinButton.disabled = selectedFiles.length < 2; setStatus(selectedFiles.length ? `${selectedFiles.length} imágenes seleccionadas. Puedes cambiar el orden antes de unirlas.` : "Selecciona al menos 2 imágenes."); });
  joinButton.addEventListener("click", () => joinImages().catch((error) => setStatus(error.message || String(error), "error")));
  clearButton.addEventListener("click", () => { selectedFiles = []; filesInput.value = ""; renderFileList(); clearResult(); joinButton.disabled = true; setStatus("Selección y resultado eliminados."); });
  window.addEventListener("pagehide", clearResult);
})();

(function () {
  "use strict";

  const engine = window.ResueltoEnLoteCollage;
  const filesInput = document.querySelector("#files");
  const columnsInput = document.querySelector("#columns");
  const cellWidthInput = document.querySelector("#cell-width");
  const cellHeightInput = document.querySelector("#cell-height");
  const gapInput = document.querySelector("#gap");
  const paddingInput = document.querySelector("#padding");
  const backgroundInput = document.querySelector("#background");
  const fitInput = document.querySelector("#fit");
  const titleInput = document.querySelector("#title");
  const namesInput = document.querySelector("#show-names");
  const formatInput = document.querySelector("#format");
  const applyButton = document.querySelector("#apply");
  const clearButton = document.querySelector("#clear");
  const status = document.querySelector("#status");
  const summary = document.querySelector("#summary");
  const preview = document.querySelector("#preview");
  const previewEmpty = document.querySelector("#preview-empty");
  const download = document.querySelector("#download");
  let previewUrl = null;

  function setStatus(message, kind = "") {
    status.textContent = message;
    status.className = `status ${kind}`.trim();
  }

  function clearOutput() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    preview.removeAttribute("src");
    preview.hidden = true;
    previewEmpty.hidden = false;
    download.hidden = true;
    download.removeAttribute("href");
    summary.textContent = "Todavía no hay resultados.";
  }

  function textWithEllipsis(context, value, maxWidth) {
    const text = String(value);
    if (context.measureText(text).width <= maxWidth) return text;
    let shortened = text;
    while (shortened.length > 1 && context.measureText(`${shortened}…`).width > maxWidth) shortened = shortened.slice(0, -1);
    return `${shortened}…`;
  }

  function encode(canvas, mime) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("No se ha podido crear el collage."));
      if (blob.type !== mime) return reject(new Error(`Este navegador no admite la salida ${mime === "image/webp" ? "WebP" : mime === "image/jpeg" ? "JPG" : "PNG"}.`));
      resolve(blob);
    }, mime, mime === "image/png" ? undefined : 0.92));
  }

  async function buildCollage(files, rawSettings) {
    const settings = engine.buildLayout(files.length, rawSettings);
    const canvas = document.createElement("canvas");
    canvas.width = settings.canvasWidth;
    canvas.height = settings.canvasHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("El navegador no ha podido preparar el lienzo.");
    context.fillStyle = settings.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (settings.title) {
      context.fillStyle = "#152542";
      context.font = "700 28px system-ui, -apple-system, Segoe UI, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(textWithEllipsis(context, settings.title, canvas.width - settings.padding * 2), canvas.width / 2, settings.padding + settings.titleHeight / 2);
    }
    const bitmaps = [];
    try {
      for (const file of files) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error(`${file.name}: admite JPG, PNG y WebP.`);
        bitmaps.push(await createImageBitmap(file));
      }
      context.textAlign = "left";
      for (const [index, bitmap] of bitmaps.entries()) {
        const cell = settings.cells[index];
        context.fillStyle = settings.background;
        context.fillRect(cell.x, cell.y, cell.width, cell.height);
        const draw = engine.fitRect(bitmap.width, bitmap.height, cell, settings.fit);
        context.drawImage(bitmap, draw.sx, draw.sy, draw.sw, draw.sh, draw.dx, draw.dy, draw.dw, draw.dh);
        if (settings.showNames) {
          context.fillStyle = "#152542";
          context.font = "600 16px system-ui, -apple-system, Segoe UI, sans-serif";
          context.textBaseline = "middle";
          context.fillText(textWithEllipsis(context, files[index].name, cell.width), cell.x, cell.labelY);
        }
      }
      const mime = engine.outputMime(rawSettings.format);
      if (mime === "image/jpeg") {
        const jpegCanvas = document.createElement("canvas");
        jpegCanvas.width = canvas.width;
        jpegCanvas.height = canvas.height;
        const jpegContext = jpegCanvas.getContext("2d");
        jpegContext.fillStyle = "#ffffff";
        jpegContext.fillRect(0, 0, canvas.width, canvas.height);
        jpegContext.drawImage(canvas, 0, 0);
        return { blob: await encode(jpegCanvas, mime), width: canvas.width, height: canvas.height, mime };
      }
      return { blob: await encode(canvas, mime), width: canvas.width, height: canvas.height, mime };
    } finally { bitmaps.forEach((bitmap) => bitmap.close()); }
  }

  function lockControls(locked) {
    [filesInput, columnsInput, cellWidthInput, cellHeightInput, gapInput, paddingInput, backgroundInput, fitInput, titleInput, namesInput, formatInput].forEach((control) => { control.disabled = locked; });
    applyButton.disabled = locked || filesInput.files.length === 0;
  }

  async function applyCollage() {
    const files = [...filesInput.files];
    if (!files.length) return;
    if (files.length > 40) return setStatus("Selecciona como máximo 40 imágenes por collage.", "error");
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > 200 * 1024 * 1024) return setStatus("El lote supera el máximo recomendado de 200 MB.", "error");
    const settings = { columns: columnsInput.value, cellWidth: cellWidthInput.value, cellHeight: cellHeightInput.value, gap: gapInput.value, padding: paddingInput.value, background: backgroundInput.value, fit: fitInput.value, title: titleInput.value, showNames: namesInput.checked, format: formatInput.value };
    clearOutput();
    lockControls(true);
    setStatus(`Preparando un collage con ${files.length} ${files.length === 1 ? "imagen" : "imágenes"}...`);
    try {
      const result = await buildCollage(files, settings);
      previewUrl = URL.createObjectURL(result.blob);
      preview.src = previewUrl;
      preview.hidden = false;
      previewEmpty.hidden = true;
      download.href = previewUrl;
      download.download = engine.outputName(files.length, result.mime);
      download.textContent = `Descargar ${engine.outputName(files.length, result.mime)}`;
      download.hidden = false;
      summary.textContent = `${files.length} ${files.length === 1 ? "imagen" : "imágenes"} · ${result.width} × ${result.height}px · ${Math.round(result.blob.size / 1024)} KB`;
      setStatus("Collage listo para descargar.", "success");
    } catch (error) { setStatus(error.message || "No se ha podido crear el collage.", "error"); }
    finally { lockControls(false); }
  }

  filesInput.addEventListener("change", () => { clearOutput(); applyButton.disabled = filesInput.files.length === 0; setStatus(filesInput.files.length ? `${filesInput.files.length} ${filesInput.files.length === 1 ? "imagen seleccionada" : "imágenes seleccionadas"}.` : "Selecciona varias imágenes."); });
  applyButton.addEventListener("click", () => applyCollage().catch((error) => { setStatus(error.message || "No se ha podido crear el collage.", "error"); lockControls(false); }));
  clearButton.addEventListener("click", () => { filesInput.value = ""; clearOutput(); applyButton.disabled = true; setStatus("Selección y resultado eliminados."); });
  window.addEventListener("pagehide", clearOutput);
})();

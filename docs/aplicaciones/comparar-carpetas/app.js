(function () {
  "use strict";
  const core = window.ResueltoEnLoteCore;
  const MAX_HASH_BYTES = 256 * 1024 * 1024;
  const leftInput = document.querySelector("#left");
  const rightInput = document.querySelector("#right");
  const exactInput = document.querySelector("#exact");
  const compareButton = document.querySelector("#compare");
  const downloadButton = document.querySelector("#download");
  const status = document.querySelector("#status");
  const results = document.querySelector("#results");
  let differences = [];

  function updateReady() {
    compareButton.disabled = !leftInput.files.length || !rightInput.files.length;
    downloadButton.disabled = true;
    status.textContent = compareButton.disabled
      ? "Selecciona las dos carpetas para empezar."
      : `${leftInput.files.length.toLocaleString("es-ES")} archivos en origen y ${rightInput.files.length.toLocaleString("es-ES")} en destino.`;
  }
  leftInput.addEventListener("change", updateReady);
  rightInput.addEventListener("change", updateReady);

  function mapFiles(list) {
    return [...list].map((file) => ({ file, path: core.relativePath(file), size: file.size, hash: null }));
  }

  async function sha256(file) {
    if (file.size > MAX_HASH_BYTES) return null;
    const bytes = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function addRequiredHashes(left, right) {
    const rightByPath = new Map(right.map((item) => [item.path, item]));
    const pairs = left
      .map((item) => [item, rightByPath.get(item.path)])
      .filter((pair) => pair[1] && pair[0].size === pair[1].size);
    let completed = 0;
    for (const [a, b] of pairs) {
      status.textContent = `Comprobando contenido: ${completed.toLocaleString("es-ES")} de ${pairs.length.toLocaleString("es-ES")}…`;
      a.hash = await sha256(a.file);
      b.hash = await sha256(b.file);
      completed += 1;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  compareButton.addEventListener("click", async () => {
    compareButton.disabled = true;
    downloadButton.disabled = true;
    try {
      const left = mapFiles(leftInput.files);
      const right = mapFiles(rightInput.files);
      if (exactInput.checked) await addRequiredHashes(left, right);
      differences = core.compareInventories(left, right, exactInput.checked);
      results.replaceChildren();
      for (const item of differences) {
        const row = document.createElement("tr");
        for (const value of [item.path, item.status.replaceAll("_", " "), core.formatBytes(item.leftSize), core.formatBytes(item.rightSize)]) {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        }
        results.append(row);
      }
      if (!differences.length) {
        const row = document.createElement("tr");
        row.innerHTML = '<td class="empty" colspan="4">No se han encontrado diferencias con el modo elegido.</td>';
        results.append(row);
      }
      const uncertain = differences.filter((item) => item.status === "NO_VERIFICADO").length;
      status.textContent = `Comparación terminada: ${differences.length.toLocaleString("es-ES")} diferencias${uncertain ? ` y ${uncertain.toLocaleString("es-ES")} archivos no verificados` : ""}. No se ha modificado ningún archivo.`;
      downloadButton.disabled = differences.length === 0;
    } catch (error) {
      status.textContent = `No se pudo completar la comparación: ${error.message}`;
      status.classList.add("error");
    } finally {
      compareButton.disabled = false;
    }
  });

  downloadButton.addEventListener("click", () => {
    const csv = core.toCsv(["ruta", "estado", "bytes_origen", "bytes_destino"], differences.map((item) => [item.path, item.status, item.leftSize, item.rightSize]));
    core.downloadText("comparacion_carpetas.csv", csv);
  });
})();

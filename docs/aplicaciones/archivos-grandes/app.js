(function () {
  "use strict";
  const core = window.ResueltoEnLoteCore;
  const folder = document.querySelector("#folder");
  const analyse = document.querySelector("#analyse");
  const download = document.querySelector("#download");
  const limit = document.querySelector("#limit");
  const minimum = document.querySelector("#minimum");
  const status = document.querySelector("#status");
  const results = document.querySelector("#results");
  let ranked = [];

  folder.addEventListener("change", () => {
    analyse.disabled = folder.files.length === 0;
    download.disabled = true;
    status.textContent = folder.files.length ? `${folder.files.length.toLocaleString("es-ES")} archivos seleccionados.` : "Selecciona una carpeta para empezar.";
  });

  analyse.addEventListener("click", () => {
    const records = [...folder.files].map((file) => ({ path: core.relativePath(file), size: file.size }));
    ranked = core.rankFiles(records, Number(limit.value), Number(minimum.value) * 1024 * 1024);
    results.replaceChildren();
    for (const item of ranked) {
      const row = document.createElement("tr");
      for (const value of [item.rank, item.path, core.formatBytes(item.size)]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      results.append(row);
    }
    if (!ranked.length) {
      const row = document.createElement("tr");
      row.innerHTML = '<td class="empty" colspan="3">No hay archivos que cumplan el tamaño mínimo.</td>';
      results.append(row);
    }
    download.disabled = ranked.length === 0;
    status.textContent = `Análisis terminado: ${ranked.length.toLocaleString("es-ES")} resultados. No se ha modificado ningún archivo.`;
  });

  download.addEventListener("click", () => {
    const csv = core.toCsv(["puesto", "ruta", "bytes", "megabytes"], ranked.map((item) => [item.rank, item.path, item.size, (item.size / 1024 / 1024).toFixed(2)]));
    core.downloadText("archivos_mas_grandes.csv", csv);
  });
})();

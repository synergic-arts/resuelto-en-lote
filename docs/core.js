(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteCore = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function relativePath(file) {
    const raw = String(file.webkitRelativePath || file.name || "").replaceAll("\\", "/");
    const parts = raw.split("/").filter(Boolean);
    return parts.length > 1 ? parts.slice(1).join("/") : parts.join("/");
  }

  function rankFiles(records, limit, minimumBytes) {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 100;
    const safeMinimum = Number.isFinite(minimumBytes) && minimumBytes > 0 ? minimumBytes : 0;
    return records
      .filter((item) => item.size >= safeMinimum)
      .sort((a, b) => b.size - a.size || a.path.localeCompare(b.path, "es", { sensitivity: "base" }))
      .slice(0, safeLimit)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  function compareInventories(leftRecords, rightRecords, exact) {
    const left = new Map(leftRecords.map((item) => [item.path, item]));
    const right = new Map(rightRecords.map((item) => [item.path, item]));
    const paths = [...new Set([...left.keys(), ...right.keys()])].sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
    const rows = [];
    for (const path of paths) {
      const a = left.get(path);
      const b = right.get(path);
      if (!a) rows.push({ path, status: "SOLO_DESTINO", leftSize: null, rightSize: b.size });
      else if (!b) rows.push({ path, status: "SOLO_ORIGEN", leftSize: a.size, rightSize: null });
      else if (a.size !== b.size) rows.push({ path, status: "CAMBIADO_TAMAÑO", leftSize: a.size, rightSize: b.size });
      else if (exact && (!a.hash || !b.hash)) rows.push({ path, status: "NO_VERIFICADO", leftSize: a.size, rightSize: b.size });
      else if (exact && a.hash !== b.hash) rows.push({ path, status: "CAMBIADO_CONTENIDO", leftSize: a.size, rightSize: b.size });
    }
    return rows;
  }

  function formatBytes(bytes) {
    if (bytes === null || bytes === undefined) return "—";
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** index;
    return `${value.toLocaleString("es-ES", { maximumFractionDigits: index ? 2 : 0 })} ${units[index]}`;
  }

  function csvCell(value) {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  }

  function toCsv(headers, rows) {
    const lines = [headers.map(csvCell).join(",")];
    for (const row of rows) lines.push(row.map(csvCell).join(","));
    return "\ufeff" + lines.join("\r\n") + "\r\n";
  }

  function downloadText(filename, content) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function webpName(filename) {
    const text = String(filename || "imagen").trim() || "imagen";
    const dot = text.lastIndexOf(".");
    const stem = dot > 0 ? text.slice(0, dot) : text;
    return `${stem}.webp`;
  }

  return { relativePath, rankFiles, compareInventories, formatBytes, toCsv, downloadText, webpName };
});

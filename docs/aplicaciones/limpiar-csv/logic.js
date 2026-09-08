(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteCsvCleaner = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function stripBom(text) {
    return String(text || "").replace(/^\ufeff/, "");
  }

  function detectDelimiter(text) {
    const sample = stripBom(text).slice(0, 12000);
    const scores = [",", ";", "\t"].map((delimiter) => {
      let quoted = false;
      let count = 0;
      for (const char of sample) {
        if (char === '"') quoted = !quoted;
        else if (!quoted && char === delimiter) count += 1;
      }
      return { delimiter, count };
    });
    scores.sort((a, b) => b.count - a.count || (a.delimiter === ";" ? -1 : 1));
    return scores[0].count ? scores[0].delimiter : ",";
  }

  function parseCsv(text, delimiter = ",") {
    const source = stripBom(text).replace(/\r\n?/g, "\n");
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (quoted) {
        if (char === '"' && source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"' && cell.length === 0) {
        quoted = true;
      } else if (char === delimiter) {
        row.push(cell);
        cell = "";
      } else if (char === "\n") {
        row.push(cell);
        if (row.some((value) => value.trim() !== "") || row.length > 0) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    if (quoted) throw new Error("El CSV termina dentro de un campo entre comillas.");
    if (cell !== "" || row.length) {
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
    }
    return rows;
  }

  function normaliseCell(value, options) {
    let result = String(value ?? "");
    let changed = false;
    if (options.collapseSpaces) {
      const collapsed = result.replace(/[ \t]+/g, " ");
      changed ||= collapsed !== result;
      result = collapsed;
    }
    if (options.trimCells) {
      const trimmed = result.trim();
      changed ||= trimmed !== result;
      result = trimmed;
    }
    return { value: result, changed };
  }

  function cleanRows(rows, options = {}) {
    const settings = {
      hasHeader: options.hasHeader !== false,
      trimCells: options.trimCells !== false,
      collapseSpaces: Boolean(options.collapseSpaces),
      removeEmptyRows: options.removeEmptyRows !== false,
      removeDuplicates: options.removeDuplicates !== false,
      ignoreCase: Boolean(options.ignoreCase),
      keyIndices: Array.isArray(options.keyIndices) ? options.keyIndices : []
    };
    const header = settings.hasHeader && rows.length ? rows[0].map((value) => String(value)) : null;
    const inputRows = settings.hasHeader ? rows.slice(1) : rows.slice();
    let trimmedCells = 0;
    let emptyRowsRemoved = 0;
    let duplicatesRemoved = 0;
    const seen = new Set();
    const cleaned = [];
    for (const original of inputRows) {
      const width = Math.max(original.length, header ? header.length : 0);
      const row = Array.from({ length: width }, (_, index) => {
        const normalized = normaliseCell(original[index] ?? "", settings);
        if (normalized.changed) trimmedCells += 1;
        return normalized.value;
      });
      if (settings.removeEmptyRows && row.every((value) => value.trim() === "")) {
        emptyRowsRemoved += 1;
        continue;
      }
      const indexes = settings.keyIndices.length ? settings.keyIndices : row.map((_, index) => index);
      const key = indexes.map((index) => row[index] ?? "").map((value) => settings.ignoreCase ? value.toLocaleLowerCase("es-ES") : value).join("\u001f");
      if (settings.removeDuplicates && seen.has(key)) {
        duplicatesRemoved += 1;
        continue;
      }
      seen.add(key);
      cleaned.push(row);
    }
    return {
      rows: header ? [header, ...cleaned] : cleaned,
      dataRows: cleaned,
      header,
      rowsInput: inputRows.length,
      rowsOutput: cleaned.length,
      trimmedCells,
      emptyRowsRemoved,
      duplicatesRemoved
    };
  }

  function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function toCsv(rows) {
    return "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }

  return { stripBom, detectDelimiter, parseCsv, normaliseCell, cleanRows, toCsv };
});

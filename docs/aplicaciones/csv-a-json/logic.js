(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteCsvToJson = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function detectDelimiter(text) {
    const source = String(text || "").replace(/^\ufeff/, "");
    const candidates = [",", ";", "\t", "|"];
    const counts = Object.fromEntries(candidates.map((item) => [item, 0]));
    let inQuotes = false;
    for (let i = 0; i < Math.min(source.length, 10000); i += 1) {
      const char = source[i];
      if (char === '"') {
        if (inQuotes && source[i + 1] === '"') i += 1;
        else inQuotes = !inQuotes;
      } else if (!inQuotes && (char === "\n" || char === "\r")) {
        if (char === "\r" && source[i + 1] === "\n") i += 1;
        break;
      } else if (!inQuotes && Object.prototype.hasOwnProperty.call(counts, char)) counts[char] += 1;
    }
    return candidates.sort((a, b) => counts[b] - counts[a])[0] || ",";
  }

  function parseCsv(text, delimiter = "auto") {
    const source = String(text ?? "").replace(/^\ufeff/, "");
    if (!source.trim()) throw new Error("El CSV está vacío.");
    const separator = delimiter === "auto" ? detectDelimiter(source) : delimiter;
    if (![",", ";", "\t", "|"].includes(separator)) throw new Error("El separador CSV no es válido.");
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    let rowHasContent = false;
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (char === '"') {
        if (inQuotes && source[i + 1] === '"') {
          field += '"';
          i += 1;
          rowHasContent = true;
        } else if (!inQuotes && field === "") {
          inQuotes = true;
          rowHasContent = true;
        } else if (inQuotes) {
          inQuotes = false;
        } else {
          field += char;
          rowHasContent = true;
        }
      } else if (!inQuotes && char === separator) {
        row.push(field);
        field = "";
        rowHasContent = true;
      } else if (!inQuotes && (char === "\n" || char === "\r")) {
        if (char === "\r" && source[i + 1] === "\n") i += 1;
        row.push(field);
        if (rowHasContent || row.length > 1) rows.push(row);
        row = [];
        field = "";
        rowHasContent = false;
      } else {
        field += char;
        rowHasContent = true;
      }
    }
    if (inQuotes) throw new Error("El CSV tiene una comilla sin cerrar.");
    if (field !== "" || row.length || rowHasContent) {
      row.push(field);
      if (rowHasContent || row.length > 1) rows.push(row);
    }
    if (!rows.length) throw new Error("No se han encontrado filas en el CSV.");
    return { rows, delimiter: separator };
  }

  function uniqueHeaders(firstRow, columnCount, trim) {
    const headers = [];
    const used = new Map();
    for (let index = 0; index < columnCount; index += 1) {
      const raw = firstRow[index] ?? "";
      const base = (trim ? String(raw).trim() : String(raw)) || `columna_${index + 1}`;
      const occurrence = (used.get(base) || 0) + 1;
      used.set(base, occurrence);
      headers.push(occurrence === 1 ? base : `${base}_${occurrence}`);
    }
    return headers;
  }

  function rowsToRecords(rows, options = {}) {
    if (!Array.isArray(rows) || !rows.length) throw new Error("No hay filas para convertir.");
    const hasHeader = options.hasHeader !== false;
    const trim = Boolean(options.trim);
    const columnCount = Math.max(...rows.map((row) => row.length));
    const headers = hasHeader ? uniqueHeaders(rows[0], columnCount, trim) : Array.from({ length: columnCount }, (_, index) => `columna_${index + 1}`);
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const records = dataRows.map((row) => Object.fromEntries(headers.map((header, index) => [header, trim ? String(row[index] ?? "").trim() : String(row[index] ?? "")] )));
    return { headers, records, dataRows: dataRows.length, hasHeader, trim };
  }

  function toJson(records, pretty = true) {
    return JSON.stringify(records, null, pretty ? 2 : 0) + "\n";
  }

  return { detectDelimiter, parseCsv, rowsToRecords, toJson };
});

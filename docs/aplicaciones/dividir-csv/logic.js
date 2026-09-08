(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteCsvSplitter = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function detectDelimiter(text) {
    const source = String(text || "").replace(/^\ufeff/, "");
    const candidates = [",", ";", "\t"];
    let inQuotes = false;
    const counts = Object.fromEntries(candidates.map((item) => [item, 0]));
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
    if (![",", ";", "\t"].includes(separator)) throw new Error("El separador CSV no es válido.");

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

  function splitRows(rows, options = {}) {
    if (!Array.isArray(rows) || !rows.length) throw new Error("No hay filas que dividir.");
    const rowsPerFile = Number(options.rowsPerFile);
    if (!Number.isInteger(rowsPerFile) || rowsPerFile < 1) throw new Error("Indica al menos 1 fila por archivo.");
    const hasHeader = Boolean(options.hasHeader);
    const repeatHeader = Boolean(options.repeatHeader);
    const header = hasHeader ? rows[0] : null;
    const dataRows = hasHeader ? rows.slice(1) : rows.slice();
    const chunks = [];
    const count = Math.max(1, Math.ceil(dataRows.length / rowsPerFile));
    for (let index = 0; index < count; index += 1) {
      const data = dataRows.slice(index * rowsPerFile, (index + 1) * rowsPerFile);
      const includeHeader = Boolean(header) && (repeatHeader || index === 0);
      chunks.push({ index: index + 1, dataRows: data, rows: includeHeader ? [header, ...data] : data });
    }
    return { chunks, dataRows: dataRows.length, hasHeader, repeatHeader, rowsPerFile };
  }

  function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function toCsv(rows, delimiter = ",") {
    if (![",", ";", "\t"].includes(delimiter)) throw new Error("El separador CSV no es válido.");
    return "\ufeff" + rows.map((row) => row.map(csvCell).join(delimiter)).join("\r\n") + "\r\n";
  }

  return { detectDelimiter, parseCsv, splitRows, toCsv };
});

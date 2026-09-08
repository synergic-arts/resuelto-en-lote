(function (root) {
  "use strict";

  function detectDelimiter(text) {
    const firstLine = String(text || "").split(/\r?\n/, 1)[0];
    const candidates = [",", ";", "\t"];
    let best = ",";
    let bestCount = -1;
    for (const candidate of candidates) {
      let count = 0;
      let quoted = false;
      for (let index = 0; index < firstLine.length; index += 1) {
        const char = firstLine[index];
        if (char === '"') {
          if (quoted && firstLine[index + 1] === '"') {
            index += 1;
          } else {
            quoted = !quoted;
          }
        } else if (!quoted && char === candidate) {
          count += 1;
        }
      }
      if (count > bestCount) {
        best = candidate;
        bestCount = count;
      }
    }
    return best;
  }

  function parseCsv(text, delimiter) {
    const value = String(text || "").replace(/^\ufeff/, "");
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < value.length; index += 1) {
      const char = value[index];
      if (char === '"') {
        if (quoted && value[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (!quoted && char === delimiter) {
        row.push(cell);
        cell = "";
      } else if (!quoted && (char === "\n" || char === "\r")) {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        if (char === "\r" && value[index + 1] === "\n") {
          index += 1;
        }
      } else {
        cell += char;
      }
    }
    if (cell !== "" || row.length > 0) {
      row.push(cell);
      rows.push(row);
    }
    return rows.filter((candidate) => candidate.some((item) => String(item).trim() !== ""));
  }

  function headerKey(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es-ES");
  }

  function uniqueHeader(value, index, used) {
    const base = String(value || "").trim() || "columna " + (index + 1);
    let label = base;
    let suffix = 2;
    while (used.has(headerKey(label))) {
      label = base + " (" + suffix + ")";
      suffix += 1;
    }
    used.add(headerKey(label));
    return label;
  }

  function mergeCsvFiles(entries, delimiter) {
    const columns = [];
    const columnByKey = new Map();
    const outputRows = [];
    for (const entry of entries) {
      const rows = parseCsv(entry.text, delimiter || detectDelimiter(entry.text));
      if (!rows.length) {
        continue;
      }
      const localHeaders = [];
      const localKeys = [];
      const usedLocal = new Set();
      for (const [index, rawHeader] of rows[0].entries()) {
        const label = uniqueHeader(rawHeader, index, usedLocal);
        const key = headerKey(label);
        localHeaders.push(label);
        localKeys.push(key);
        if (!columnByKey.has(key)) {
          columnByKey.set(key, columns.length);
          columns.push(label);
        }
      }
      for (const sourceRow of rows.slice(1)) {
        const destination = Array(columns.length).fill("");
        for (const [index, rawValue] of sourceRow.entries()) {
          const key = localKeys[index];
          const destinationIndex = columnByKey.get(key);
          if (destinationIndex !== undefined) {
            destination[destinationIndex] = rawValue;
          }
        }
        if (destination.some((item) => String(item).trim() !== "")) {
          outputRows.push(destination);
        }
      }
    }
    return { headers: columns, rows: outputRows, fileCount: entries.length, rowCount: outputRows.length };
  }

  function csvCell(value) {
    const text = value === null || value === undefined ? "" : String(value);
    return /["\r\n,;\t]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
  }

  function toCsv(headers, rows) {
    const lines = [headers.map(csvCell).join(",")];
    for (const row of rows) {
      lines.push(row.map(csvCell).join(","));
    }
    return "\ufeff" + lines.join("\r\n") + "\r\n";
  }

  root.ResueltoEnLoteCsv = { detectDelimiter, parseCsv, mergeCsvFiles, toCsv };
})(typeof window !== "undefined" ? window : globalThis);

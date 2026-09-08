(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteCsvCompare = api;
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
        } else if (char === '"') {
          quoted = false;
        } else {
          cell += char;
        }
      } else if (char === '"' && cell.length === 0) {
        quoted = true;
      } else if (char === delimiter) {
        row.push(cell);
        cell = "";
      } else if (char === "\n") {
        row.push(cell);
        if (row.some((value) => value.trim() !== "")) rows.push(row);
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

  function uniqueHeaders(left, right) {
    return [...new Set([...left, ...right].map((value) => String(value)))];
  }

  function tableModel(rows, hasHeader) {
    if (!rows.length) return { headers: [], records: [] };
    if (!hasHeader) {
      const width = Math.max(...rows.map((row) => row.length));
      return {
        headers: Array.from({ length: width }, (_, index) => `Columna ${index + 1}`),
        records: rows.map((values, index) => ({ values, rowNumber: index + 1 }))
      };
    }
    const width = Math.max(1, ...rows.map((row) => row.length));
    const headers = Array.from({ length: width }, (_, index) => String(rows[0][index] || `Columna ${index + 1}`));
    return {
      headers,
      records: rows.slice(1).map((values, index) => ({ values, rowNumber: index + 2 }))
    };
  }

  function valueAt(record, index) {
    return record && record.values[index] !== undefined ? String(record.values[index]) : "";
  }

  function compareTables(leftRows, rightRows, options = {}) {
    const hasHeader = options.hasHeader !== false;
    const left = tableModel(leftRows, hasHeader);
    const right = tableModel(rightRows, hasHeader);
    const headers = uniqueHeaders(left.headers, right.headers);
    const mode = options.mode === "position" ? "position" : "key";
    const differences = [];
    let unchanged = 0;

    if (mode === "position") {
      const count = Math.max(left.records.length, right.records.length);
      for (let index = 0; index < count; index += 1) {
        const a = left.records[index];
        const b = right.records[index];
        if (!a) differences.push({ status: "added", key: `Fila ${index + 1}`, before: [], after: b.values.slice(), rowA: null, rowB: b.rowNumber, changes: [] });
        else if (!b) differences.push({ status: "removed", key: `Fila ${index + 1}`, before: a.values.slice(), after: [], rowA: a.rowNumber, rowB: null, changes: [] });
        else {
          const changes = [];
          const width = Math.max(a.values.length, b.values.length, headers.length);
          for (let column = 0; column < width; column += 1) {
            const before = valueAt(a, column);
            const after = valueAt(b, column);
            if (before !== after) changes.push({ column: headers[column] || `Columna ${column + 1}`, before, after });
          }
          if (changes.length) differences.push({ status: "changed", key: `Fila ${index + 1}`, before: a.values.slice(), after: b.values.slice(), rowA: a.rowNumber, rowB: b.rowNumber, changes });
          else unchanged += 1;
        }
      }
    } else {
      const requestedKey = options.keyHeader || left.headers[0] || right.headers[0];
      const leftKeyIndex = left.headers.indexOf(requestedKey);
      const rightKeyIndex = right.headers.indexOf(requestedKey);
      if (leftKeyIndex < 0 || rightKeyIndex < 0) throw new Error("La columna clave debe existir en ambos archivos.");
      const leftMap = new Map(left.records.map((record) => [valueAt(record, leftKeyIndex), record]));
      const rightMap = new Map(right.records.map((record) => [valueAt(record, rightKeyIndex), record]));
      const keys = [...new Set([...leftMap.keys(), ...rightMap.keys()])];
      for (const key of keys) {
        const a = leftMap.get(key);
        const b = rightMap.get(key);
        if (!a) differences.push({ status: "added", key, before: [], after: b.values.slice(), rowA: null, rowB: b.rowNumber, changes: [] });
        else if (!b) differences.push({ status: "removed", key, before: a.values.slice(), after: [], rowA: a.rowNumber, rowB: null, changes: [] });
        else {
          const changes = [];
          for (const header of headers) {
            const aIndex = left.headers.indexOf(header);
            const bIndex = right.headers.indexOf(header);
            const before = aIndex < 0 ? "" : valueAt(a, aIndex);
            const after = bIndex < 0 ? "" : valueAt(b, bIndex);
            if (before !== after) changes.push({ column: header, before, after });
          }
          if (changes.length) differences.push({ status: "changed", key, before: a.values.slice(), after: b.values.slice(), rowA: a.rowNumber, rowB: b.rowNumber, changes });
          else unchanged += 1;
        }
      }
    }
    return {
      headers,
      differences,
      unchanged,
      totalLeft: left.records.length,
      totalRight: right.records.length,
      added: differences.filter((item) => item.status === "added").length,
      removed: differences.filter((item) => item.status === "removed").length,
      changed: differences.filter((item) => item.status === "changed").length,
      mode,
      keyHeader: mode === "key" ? options.keyHeader || left.headers[0] || right.headers[0] : null
    };
  }

  function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function differencesCsv(report) {
    const rows = [["estado", "clave", "fila_a", "fila_b", "columna", "antes", "después"]];
    for (const item of report.differences) {
      if (item.status === "changed") {
        for (const change of item.changes) rows.push([item.status, item.key, item.rowA ?? "", item.rowB ?? "", change.column, change.before, change.after]);
      } else {
        rows.push([item.status, item.key, item.rowA ?? "", item.rowB ?? "", "", item.before.join(" | "), item.after.join(" | ")]);
      }
    }
    return "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }

  return { stripBom, detectDelimiter, parseCsv, tableModel, compareTables, differencesCsv };
});

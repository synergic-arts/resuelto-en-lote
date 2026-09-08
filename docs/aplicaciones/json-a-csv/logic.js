(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ResueltoEnLoteJsonToCsv = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function parseJson(text) {
    const source = String(text || "").replace(/^\ufeff/, "").trim();
    if (!source) throw new Error("No hay ningún JSON para convertir.");
    try {
      return JSON.parse(source);
    } catch (error) {
      throw new Error(`El JSON no es válido: ${error.message}`);
    }
  }

  function flattenValue(value, prefix, output) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const entries = Object.entries(value);
      if (!entries.length) output[prefix] = "{}";
      for (const [key, nested] of entries) flattenValue(nested, prefix ? `${prefix}.${key}` : key, output);
      return;
    }
    if (Array.isArray(value)) output[prefix] = JSON.stringify(value);
    else if (value === null || value === undefined) output[prefix] = "";
    else if (typeof value === "boolean") output[prefix] = value ? "true" : "false";
    else output[prefix] = String(value);
  }

  function recordsFromJson(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const arrayProperty = Object.values(value).find((item) => Array.isArray(item));
      if (arrayProperty) return arrayProperty;
      return [value];
    }
    throw new Error("El JSON debe ser una lista de objetos o un objeto individual.");
  }

  function normaliseRecord(record, flatten) {
    if (!record || typeof record !== "object" || Array.isArray(record)) return { valor: JSON.stringify(record) };
    if (!flatten) {
      return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, Array.isArray(value) || (value && typeof value === "object") ? JSON.stringify(value) : value ?? ""]));
    }
    const output = {};
    for (const [key, value] of Object.entries(record)) flattenValue(value, key, output);
    return output;
  }

  function convertJson(value, options = {}) {
    const records = recordsFromJson(value);
    const normalised = records.map((record) => normaliseRecord(record, Boolean(options.flatten)));
    const headers = [...new Set(normalised.flatMap((record) => Object.keys(record)))];
    if (!headers.length) throw new Error("Los objetos no contienen campos para convertir.");
    const rows = normalised.map((record) => headers.map((header) => record[header] ?? ""));
    return { headers, rows, records: records.length, flatten: Boolean(options.flatten) };
  }

  function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function toCsv(result, delimiter = ",") {
    const rows = result.headers ? [result.headers, ...result.rows] : result;
    return "\ufeff" + rows.map((row) => row.map(csvCell).join(delimiter)).join("\r\n") + "\r\n";
  }

  return { parseJson, recordsFromJson, normaliseRecord, convertJson, toCsv };
});

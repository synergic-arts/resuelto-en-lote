"use strict";

const assert = require("node:assert/strict");
const engine = require("../../public_repo/docs/aplicaciones/limpiar-csv/logic.js");
assert.equal(engine.parseCsv("a;b\n;\n", ";").length, 2);

const rows = engine.parseCsv('email;nombre;estado\n ana@example.com ; Ana ; activo\n\nANA@example.com;Ana;activo\n luis@example.com; Luis  ; pendiente\n', ";");
assert.equal(rows.length, 5);
const report = engine.cleanRows(rows, {
  hasHeader: true,
  trimCells: true,
  removeEmptyRows: true,
  removeDuplicates: true,
  ignoreCase: true,
  keyIndices: [0]
});
assert.equal(report.emptyRowsRemoved, 1);
assert.equal(report.duplicatesRemoved, 1);
assert.equal(report.trimmedCells, 6);
assert.deepEqual(report.rows, [["email", "nombre", "estado"], ["ana@example.com", "Ana", "activo"], ["luis@example.com", "Luis", "pendiente"]]);
assert.match(engine.toCsv(report.rows), /"ana@example.com"/);
assert.deepEqual(engine.parseCsv('a,"b,c"\n', ","), [["a", "b,c"]]);
console.log("OK: limpieza CSV validada");

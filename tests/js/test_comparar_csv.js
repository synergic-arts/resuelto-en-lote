"use strict";

const assert = require("node:assert/strict");
const engine = require("../../public_repo/docs/aplicaciones/comparar-csv/logic.js");

const parsed = engine.parseCsv('id;nombre;nota\n1;"Ana; Soler";10\n2;Luis;8\n', ";");
assert.deepEqual(parsed[1], ["1", "Ana; Soler", "10"]);
assert.equal(engine.detectDelimiter("id;nombre\n1;Ana\n"), ";");

const left = engine.parseCsv("id;nombre;importe\n1;Ana;10\n2;Luis;20\n3;Marta;30\n", ";");
const right = engine.parseCsv("id;nombre;importe\n3;Marta;30\n1;Ana;15\n4;Nuria;40\n", ";");
const report = engine.compareTables(left, right, { hasHeader: true, mode: "key", keyHeader: "id" });
assert.equal(report.added, 1);
assert.equal(report.removed, 1);
assert.equal(report.changed, 1);
assert.equal(report.unchanged, 1);
assert.equal(report.differences.find((item) => item.key === "1").changes[0].after, "15");
assert.match(engine.differencesCsv(report), /"después"/);

const positional = engine.compareTables([["a"], ["b"]], [["a"], ["c"], ["d"]], { hasHeader: false, mode: "position" });
assert.equal(positional.changed, 1);
assert.equal(positional.added, 1);
console.log("OK: comparación CSV validada");

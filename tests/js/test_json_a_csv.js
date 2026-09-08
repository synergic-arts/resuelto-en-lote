"use strict";

const assert = require("node:assert/strict");
const engine = require("../../public_repo/docs/aplicaciones/json-a-csv/logic.js");

const value = engine.parseJson('[{"id":1,"cliente":"Ana","pedido":{"estado":"enviado"}},{"id":2,"cliente":"Luis","etiquetas":["nuevo","web"]}]');
const flat = engine.convertJson(value, { flatten: true });
assert.deepEqual(flat.headers, ["id", "cliente", "pedido.estado", "etiquetas"]);
assert.equal(flat.rows[0][2], "enviado");
assert.equal(flat.rows[1][3], '["nuevo","web"]');
assert.match(engine.toCsv(flat, ";"), /"pedido.estado";/);
const wrapped = engine.convertJson({ data: [{ nombre: "Ana" }, { nombre: "Luis" }] });
assert.equal(wrapped.records, 2);
assert.deepEqual(wrapped.headers, ["nombre"]);
assert.throws(() => engine.parseJson("{no es JSON}"), /JSON no es válido/);
assert.throws(() => engine.convertJson("texto"), /lista de objetos/);
console.log("OK: JSON a CSV validado");

"use strict";

importScripts("../../vendor/pdf-lib-1.17.1.min.js");

function safeMessage(error) {
  const message = String(error && error.message ? error.message : error || "");
  if (/encrypted|cifrad|password/i.test(message)) return "Este PDF está cifrado o protegido y no se puede procesar en el navegador.";
  if (/header|parse|invalid|object|trailer|xref/i.test(message)) return "El archivo no es un PDF válido o contiene una estructura que no se puede interpretar.";
  return "No se han podido extraer las páginas. Prueba con una copia que se abra correctamente.";
}

self.addEventListener("message", async (event) => {
  const data = event.data || {};
  if (!["inspect", "extract"].includes(data.type)) return;
  try {
    const source = await PDFLib.PDFDocument.load(data.bytes, { updateMetadata: false });
    if (data.type === "inspect") {
      self.postMessage({ type: "ready", pageCount: source.getPageCount() });
      return;
    }
    const pages = Array.isArray(data.pages) ? data.pages : [];
    if (!pages.length || pages.some((page) => !Number.isInteger(page) || page < 1 || page > source.getPageCount())) {
      throw new Error("invalid pages");
    }
    const output = await PDFLib.PDFDocument.create();
    const copied = await output.copyPages(source, pages.map((page) => page - 1));
    copied.forEach((page) => output.addPage(page));
    const bytes = await output.save({ addDefaultPage: false, updateFieldAppearances: false });
    const transferable = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
      ? bytes.buffer
      : bytes.slice().buffer;
    self.postMessage({ type: "done", bytes: transferable, pageCount: copied.length }, [transferable]);
  } catch (error) {
    self.postMessage({ type: "error", message: safeMessage(error) });
  }
});

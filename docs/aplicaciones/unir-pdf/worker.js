"use strict";

importScripts("../../vendor/pdf-lib-1.17.1.min.js");

function safeMessage(error) {
  const message = String(error && error.message ? error.message : error || "");
  if (/encrypted|cifrad|password/i.test(message)) {
    return "Uno de los documentos está cifrado o protegido y no puede combinarse en el navegador.";
  }
  if (/header|parse|invalid|object|trailer|xref/i.test(message)) {
    return "Uno de los archivos no es un PDF válido o contiene una estructura que no puede interpretarse.";
  }
  return "No se han podido combinar estos documentos. Prueba con menos archivos y comprueba que todos se abren correctamente.";
}

self.addEventListener("message", async (event) => {
  if (!event.data || event.data.type !== "merge") return;
  try {
    const files = event.data.files;
    if (!Array.isArray(files) || files.length < 2) {
      throw new Error("Se necesitan al menos dos PDF.");
    }
    const output = await PDFLib.PDFDocument.create();
    let pageCount = 0;
    for (const [index, item] of files.entries()) {
      const source = await PDFLib.PDFDocument.load(item.bytes, { updateMetadata: false });
      const indices = source.getPageIndices();
      const pages = await output.copyPages(source, indices);
      for (const page of pages) output.addPage(page);
      pageCount += pages.length;
      self.postMessage({ type: "progress", completed: index + 1, total: files.length, pageCount });
    }
    const bytes = await output.save({ addDefaultPage: false, updateFieldAppearances: false });
    const transferable = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
      ? bytes.buffer
      : bytes.slice().buffer;
    self.postMessage({ type: "done", bytes: transferable, pageCount, inputCount: files.length }, [transferable]);
  } catch (error) {
    self.postMessage({ type: "error", message: safeMessage(error) });
  }
});

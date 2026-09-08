(function (root) {
  "use strict";

  function groupCandidates(files) {
    const bySize = new Map();
    for (const file of files) {
      const size = Number(file.size) || 0;
      const group = bySize.get(size) || [];
      group.push(file);
      bySize.set(size, group);
    }
    return [...bySize.values()].filter((group) => group.length > 1);
  }

  function buildDuplicateGroups(records) {
    const groups = new Map();
    for (const record of records) {
      const key = String(record.size) + ":" + String(record.hash).toLowerCase();
      const group = groups.get(key) || [];
      group.push(record);
      groups.set(key, group);
    }
    return [...groups.values()]
      .filter((group) => group.length > 1)
      .sort((left, right) => {
        const leftName = String(left[0].path).toLocaleLowerCase("es-ES");
        const rightName = String(right[0].path).toLocaleLowerCase("es-ES");
        return leftName.localeCompare(rightName, "es");
      });
  }

  function bytesToHex(buffer) {
    return [...new Uint8Array(buffer)]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }

  function csvCell(value) {
    const text = value === null || value === undefined ? "" : String(value);
    return '"' + text.replaceAll('"', '""') + '"';
  }

  function reportCsv(groups) {
    const lines = [["grupo", "tamano_bytes", "sha256", "ruta"].map(csvCell).join(",")];
    groups.forEach((group, groupIndex) => {
      for (const record of group) {
        lines.push([
          groupIndex + 1,
          record.size,
          record.hash,
          record.path,
        ].map(csvCell).join(","));
      }
    });
    return "\ufeff" + lines.join("\r\n") + "\r\n";
  }

  root.ResueltoEnLoteDuplicates = { groupCandidates, buildDuplicateGroups, bytesToHex, reportCsv };
})(typeof window !== "undefined" ? window : globalThis);

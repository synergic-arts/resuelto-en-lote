from __future__ import annotations

import argparse
import csv
import hashlib
import sys
from pathlib import Path


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def inventory(root: Path) -> dict[str, tuple[int, str]]:
    return {
        path.relative_to(root).as_posix(): (path.stat().st_size, digest(path))
        for path in sorted(root.rglob("*"))
        if path.is_file()
    }


def compare_folders(left_root: Path, right_root: Path, output_path: Path) -> int:
    left = inventory(left_root)
    right = inventory(right_root)
    rows: list[tuple[str, str, int | None, int | None]] = []
    for relative in sorted(set(left) | set(right)):
        if relative not in left:
            rows.append((relative, "SOLO_DESTINO", None, right[relative][0]))
        elif relative not in right:
            rows.append((relative, "SOLO_ORIGEN", left[relative][0], None))
        elif left[relative][1] != right[relative][1]:
            rows.append((relative, "CAMBIADO", left[relative][0], right[relative][0]))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        writer.writerow(["ruta", "estado", "bytes_origen", "bytes_destino"])
        writer.writerows(rows)
    return len(rows)


def interactive() -> None:
    print("RESUELTO EN LOTE · COMPARAR CARPETAS")
    source = input("Carpeta de origen: ").strip().strip('"')
    destination = input("Carpeta de destino: ").strip().strip('"')
    output = input("Informe de salida [comparacion_carpetas.csv]: ").strip().strip('"')
    output = output or "comparacion_carpetas.csv"
    try:
        count = compare_folders(Path(source), Path(destination), Path(output))
        print(f"\nLISTO: {count} diferencias detectadas en {output}")
    except (Exception, SystemExit) as exc:
        print(f"\nERROR: {exc}")
    input("\nPulsa Enter para cerrar...")


def main() -> None:
    if len(sys.argv) == 1:
        interactive()
        return
    parser = argparse.ArgumentParser(description="Compara dos carpetas sin modificar sus archivos")
    parser.add_argument("origen", type=Path)
    parser.add_argument("destino", type=Path)
    parser.add_argument("informe", type=Path)
    args = parser.parse_args()
    count = compare_folders(args.origen, args.destino, args.informe)
    print(f"OK: {count} diferencias guardadas en {args.informe}")


if __name__ == "__main__":
    main()

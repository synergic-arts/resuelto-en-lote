from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path


def find_large_files(
    root: Path,
    output_path: Path,
    *,
    limit: int = 100,
    minimum_mb: float = 0.0,
) -> tuple[int, int]:
    if not root.is_dir():
        raise SystemExit(f"La carpeta no existe: {root}")
    if limit < 1:
        raise SystemExit("El límite debe ser mayor que cero")

    output_resolved = output_path.resolve()
    minimum_bytes = max(0, int(minimum_mb * 1024 * 1024))
    files: list[tuple[int, str]] = []
    skipped = 0
    for path in root.rglob("*"):
        try:
            if not path.is_file() or path.resolve() == output_resolved:
                continue
            size = path.stat().st_size
        except OSError:
            skipped += 1
            continue
        if size >= minimum_bytes:
            files.append((size, path.relative_to(root).as_posix()))

    files.sort(key=lambda item: (-item[0], item[1].casefold()))
    selected = files[:limit]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        writer.writerow(["puesto", "ruta", "bytes", "megabytes"])
        for rank, (size, relative) in enumerate(selected, start=1):
            writer.writerow([rank, relative, size, f"{size / (1024 * 1024):.2f}"])
    return len(selected), skipped


def interactive() -> None:
    print("RESUELTO EN LOTE · ARCHIVOS QUE MÁS OCUPAN")
    root = input("Carpeta o unidad que quieres analizar: ").strip().strip('"')
    output = input("Informe de salida [archivos_mas_grandes.csv]: ").strip().strip('"')
    output = output or "archivos_mas_grandes.csv"
    limit_text = input("Número de resultados [100]: ").strip()
    limit = int(limit_text or "100")
    try:
        count, skipped = find_large_files(Path(root), Path(output), limit=limit)
        print(f"\nLISTO: {count} archivos guardados en {output}")
        if skipped:
            print(f"AVISO: {skipped} entradas no se pudieron leer")
    except (Exception, SystemExit) as exc:
        print(f"\nERROR: {exc}")
    input("\nPulsa Enter para cerrar...")


def main() -> None:
    if len(sys.argv) == 1:
        interactive()
        return
    parser = argparse.ArgumentParser(description="Encuentra los archivos que más espacio ocupan")
    parser.add_argument("root", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--minimum-mb", type=float, default=0.0)
    args = parser.parse_args()
    count, skipped = find_large_files(
        args.root,
        args.output,
        limit=args.limit,
        minimum_mb=args.minimum_mb,
    )
    print(f"OK: {count} archivos guardados en {args.output}; omitidos: {skipped}")


if __name__ == "__main__":
    main()

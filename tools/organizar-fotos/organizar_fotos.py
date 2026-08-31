from __future__ import annotations

import argparse
import csv
import shutil
import sys
from datetime import datetime
from pathlib import Path

from PIL import Image

SUPPORTED = {".jpg", ".jpeg", ".png", ".webp"}
EXIF_DATE_TAGS = (36867, 36868, 306)


def photo_date(path: Path) -> tuple[datetime, str]:
    try:
        with Image.open(path) as image:
            exif = image.getexif()
            for tag in EXIF_DATE_TAGS:
                raw = exif.get(tag)
                if raw:
                    return datetime.strptime(str(raw), "%Y:%m:%d %H:%M:%S"), "EXIF"
    except (OSError, ValueError):
        pass
    return datetime.fromtimestamp(path.stat().st_mtime), "MODIFICACIÓN"


def unique_target(folder: Path, filename: str, used: set[str]) -> Path:
    source = Path(filename)
    candidate = folder / source.name
    index = 2
    while candidate.as_posix().casefold() in used or candidate.exists():
        candidate = folder / f"{source.stem}_{index:03d}{source.suffix}"
        index += 1
    used.add(candidate.as_posix().casefold())
    return candidate


def build_plan(source_root: Path, output_root: Path) -> list[tuple[Path, Path, datetime, str]]:
    if not source_root.is_dir():
        raise SystemExit(f"La carpeta no existe: {source_root}")
    source_resolved = source_root.resolve()
    output_resolved = output_root.resolve()
    if output_resolved == source_resolved or source_resolved in output_resolved.parents:
        raise SystemExit("La carpeta de salida debe estar fuera de la carpeta de entrada")
    files = sorted(
        (path for path in source_root.rglob("*") if path.is_file() and path.suffix.casefold() in SUPPORTED),
        key=lambda path: path.relative_to(source_root).as_posix().casefold(),
    )
    if not files:
        raise SystemExit("No se encontraron imágenes compatibles")
    used: set[str] = set()
    plan: list[tuple[Path, Path, datetime, str]] = []
    for source in files:
        captured, origin = photo_date(source)
        folder = output_root / captured.strftime("%Y") / captured.strftime("%m")
        target = unique_target(folder, source.name, used)
        plan.append((source, target, captured, origin))
    return plan


def organize_photos(
    source_root: Path,
    output_root: Path,
    report_path: Path,
    *,
    apply: bool = False,
) -> int:
    plan = build_plan(source_root, output_root)
    if apply:
        for source, target, _, _ in plan:
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists():
                raise SystemExit(f"El destino ya existe y no se sobrescribirá: {target}")
            shutil.copy2(source, target)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        writer.writerow(["origen", "destino", "fecha", "fuente_fecha", "copiado"])
        for source, target, captured, origin in plan:
            writer.writerow(
                [
                    source.relative_to(source_root).as_posix(),
                    target.relative_to(output_root).as_posix(),
                    captured.isoformat(timespec="seconds"),
                    origin,
                    "SI" if apply else "NO",
                ]
            )
    return len(plan)


def interactive() -> None:
    print("RESUELTO EN LOTE · ORGANIZAR FOTOS")
    source = input("Carpeta con fotos: ").strip().strip('"')
    output = input("Carpeta organizada [fotos_organizadas]: ").strip().strip('"') or "fotos_organizadas"
    report = input("Informe [plan_fotos.csv]: ").strip().strip('"') or "plan_fotos.csv"
    confirmation = input("¿Copiar ahora? Escribe SI; Enter solo crea la vista previa: ").strip()
    apply = confirmation.casefold() in {"si", "sí"}
    try:
        count = organize_photos(Path(source), Path(output), Path(report), apply=apply)
        action = "copiadas" if apply else "incluidas en la vista previa"
        print(f"\nLISTO: {count} fotos {action}")
    except (Exception, SystemExit) as exc:
        print(f"\nERROR: {exc}")
    input("\nPulsa Enter para cerrar...")


def main() -> None:
    if len(sys.argv) == 1:
        interactive()
        return
    parser = argparse.ArgumentParser(description="Organiza fotos en carpetas año/mes sin borrar originales")
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("report", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    count = organize_photos(args.source, args.output, args.report, apply=args.apply)
    action = "copiadas" if args.apply else "planificadas sin cambios"
    print(f"OK: {count} fotos {action}; informe: {args.report}")


if __name__ == "__main__":
    main()

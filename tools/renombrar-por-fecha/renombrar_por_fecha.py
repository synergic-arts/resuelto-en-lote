from __future__ import annotations

import argparse
import csv
import sys
from datetime import datetime
from pathlib import Path


def build_plan(folder: Path, output_path: Path) -> list[tuple[Path, Path, str]]:
    if not folder.is_dir():
        raise SystemExit(f"La carpeta no existe: {folder}")

    output_resolved = output_path.resolve()
    files = sorted(
        (
            path
            for path in folder.iterdir()
            if path.is_file() and path.resolve() != output_resolved
        ),
        key=lambda path: (path.stat().st_mtime_ns, path.name.casefold()),
    )
    if not files:
        raise SystemExit("No se encontraron archivos en la carpeta")

    source_keys = {path.name.casefold() for path in files}
    target_keys: set[str] = set()
    plan: list[tuple[Path, Path, str]] = []
    for index, source in enumerate(files, start=1):
        stamp = datetime.fromtimestamp(source.stat().st_mtime).strftime("%Y-%m-%d_%H%M%S")
        target = folder / f"{stamp}_{index:04d}{source.suffix}"
        target_key = target.name.casefold()
        if target_key in target_keys:
            raise SystemExit(f"Nombre de destino duplicado: {target.name}")
        if target.exists() and target_key not in source_keys:
            raise SystemExit(f"El destino ya existe y no se sobrescribirá: {target.name}")
        target_keys.add(target_key)
        plan.append((source, target, stamp))
    return plan


def apply_plan(plan: list[tuple[Path, Path, str]]) -> None:
    staged: list[tuple[Path, Path, Path]] = []
    try:
        for index, (source, target, _) in enumerate(plan, start=1):
            temporary = source.with_name(f".resuelto-en-lote-{index:04d}.tmp")
            if temporary.exists():
                raise FileExistsError(f"Existe un temporal de una ejecución anterior: {temporary.name}")
            source.rename(temporary)
            staged.append((source, temporary, target))
        for _, temporary, target in staged:
            temporary.rename(target)
    except Exception:
        for source, temporary, target in reversed(staged):
            current = target if target.exists() else temporary
            if current.exists() and not source.exists():
                current.rename(source)
        raise


def write_report(
    plan: list[tuple[Path, Path, str]],
    output_path: Path,
    *,
    applied: bool,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        writer.writerow(["nombre_original", "nombre_nuevo", "fecha_modificacion", "aplicado"])
        for source, target, stamp in plan:
            writer.writerow([source.name, target.name, stamp, "SI" if applied else "NO"])


def rename_by_date(folder: Path, output_path: Path, *, apply: bool = False) -> int:
    plan = build_plan(folder, output_path)
    if apply:
        apply_plan(plan)
    write_report(plan, output_path, applied=apply)
    return len(plan)


def interactive() -> None:
    print("RESUELTO EN LOTE · RENOMBRAR POR FECHA")
    folder = input("Carpeta con los archivos: ").strip().strip('"')
    output = input("Informe [plan_renombrado.csv]: ").strip().strip('"')
    output = output or "plan_renombrado.csv"
    confirmation = input("¿Aplicar los cambios ahora? Escribe SI; Enter solo crea la vista previa: ").strip()
    apply = confirmation.casefold() in {"si", "sí"}
    try:
        count = rename_by_date(Path(folder), Path(output), apply=apply)
        status = "renombrados" if apply else "incluidos en la vista previa"
        print(f"\nLISTO: {count} archivos {status}; informe: {output}")
    except (Exception, SystemExit) as exc:
        print(f"\nERROR: {exc}")
    input("\nPulsa Enter para cerrar...")


def main() -> None:
    if len(sys.argv) == 1:
        interactive()
        return
    parser = argparse.ArgumentParser(
        description="Crea una vista previa o renombra archivos por su fecha de modificación"
    )
    parser.add_argument("folder", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    count = rename_by_date(args.folder, args.output, apply=args.apply)
    action = "renombrados" if args.apply else "planificados sin cambios"
    print(f"OK: {count} archivos {action}; informe: {args.output}")


if __name__ == "__main__":
    main()

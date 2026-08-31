from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import pdfplumber
from openpyxl import Workbook


def sheet_name(value: str, used: set[str]) -> str:
    base = re.sub(r"[\\/*?:\[\]]", "_", value).strip()[:31] or "Tabla"
    candidate = base
    index = 2
    while candidate.casefold() in used:
        suffix = f"_{index}"
        candidate = f"{base[: 31 - len(suffix)]}{suffix}"
        index += 1
    used.add(candidate.casefold())
    return candidate


def extract_pdf_tables(input_dir: Path, output_file: Path) -> tuple[int, int]:
    if not input_dir.is_dir():
        raise SystemExit(f"La carpeta no existe: {input_dir}")
    files = sorted(input_dir.glob("*.pdf"), key=lambda path: path.name.casefold())
    if not files:
        raise SystemExit("No se encontraron archivos PDF")

    workbook = Workbook()
    summary = workbook.active
    summary.title = "Resumen"
    summary.append(["archivo", "página", "tabla", "filas", "columnas", "hoja"])
    used = {"resumen"}
    table_count = 0
    data_rows = 0
    for pdf_path in files:
        with pdfplumber.open(pdf_path) as document:
            for page_number, page in enumerate(document.pages, start=1):
                tables = page.extract_tables(
                    table_settings={"vertical_strategy": "lines", "horizontal_strategy": "lines"}
                )
                for table_number, table in enumerate(tables, start=1):
                    cleaned = [["" if value is None else value for value in row] for row in table if row]
                    if not cleaned:
                        continue
                    table_count += 1
                    data_rows += max(0, len(cleaned) - 1)
                    title = sheet_name(
                        f"{pdf_path.stem}_p{page_number}_t{table_number}", used
                    )
                    sheet = workbook.create_sheet(title)
                    for row in cleaned:
                        sheet.append(row)
                    summary.append(
                        [
                            pdf_path.name,
                            page_number,
                            table_number,
                            len(cleaned),
                            max(len(row) for row in cleaned),
                            title,
                        ]
                    )
    if table_count == 0:
        raise SystemExit(
            "No se detectaron tablas. Esta versión requiere PDF digitales con líneas visibles; no hace OCR."
        )
    output_file.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(output_file)
    return table_count, data_rows


def interactive() -> None:
    print("RESUELTO EN LOTE · TABLAS PDF A EXCEL")
    source = input("Carpeta con PDF: ").strip().strip('"')
    output = input("Excel de salida [tablas_pdf.xlsx]: ").strip().strip('"') or "tablas_pdf.xlsx"
    try:
        tables, rows = extract_pdf_tables(Path(source), Path(output))
        print(f"\nLISTO: {tables} tablas y {rows} filas de datos guardadas en {output}")
    except (Exception, SystemExit) as exc:
        print(f"\nERROR: {exc}")
    input("\nPulsa Enter para cerrar...")


def main() -> None:
    if len(sys.argv) == 1:
        interactive()
        return
    parser = argparse.ArgumentParser(description="Extrae tablas de PDF digitales a un libro Excel")
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("output_file", type=Path)
    args = parser.parse_args()
    tables, rows = extract_pdf_tables(args.input_dir, args.output_file)
    print(f"OK: {tables} tablas y {rows} filas de datos guardadas en {args.output_file}")


if __name__ == "__main__":
    main()

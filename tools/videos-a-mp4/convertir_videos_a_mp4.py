from __future__ import annotations

import argparse
import csv
import os
import shutil
import subprocess
import sys
from pathlib import Path

SUPPORTED = {".avi", ".m4v", ".mkv", ".mov", ".mp4", ".mpeg", ".mpg", ".webm"}


def ffmpeg_executable() -> str:
    configured = os.environ.get("RESUELTO_FFMPEG")
    if configured and Path(configured).is_file():
        return configured
    value = shutil.which("ffmpeg")
    if not value:
        raise SystemExit("No se encontró FFmpeg. Instálalo y asegúrate de que esté en PATH.")
    return value


def unique_target(output_dir: Path, source: Path, used: set[str]) -> Path:
    stem = source.stem
    candidate = output_dir / f"{stem}.mp4"
    index = 2
    while candidate.name.casefold() in used or candidate.exists():
        candidate = output_dir / f"{stem}_{index:03d}.mp4"
        index += 1
    used.add(candidate.name.casefold())
    return candidate


def convert_videos(
    input_dir: Path,
    output_dir: Path,
    report_path: Path,
    *,
    crf: int = 23,
) -> int:
    if not input_dir.is_dir():
        raise SystemExit(f"La carpeta no existe: {input_dir}")
    if not 0 <= crf <= 51:
        raise SystemExit("CRF debe estar entre 0 y 51")
    input_resolved = input_dir.resolve()
    output_resolved = output_dir.resolve()
    if output_resolved == input_resolved or input_resolved in output_resolved.parents:
        raise SystemExit("La carpeta de salida debe estar fuera de la carpeta de entrada")

    files = sorted(
        (path for path in input_dir.iterdir() if path.is_file() and path.suffix.casefold() in SUPPORTED),
        key=lambda path: path.name.casefold(),
    )
    if not files:
        raise SystemExit("No se encontraron vídeos compatibles")

    output_dir.mkdir(parents=True, exist_ok=True)
    used: set[str] = set()
    plan = [(source, unique_target(output_dir, source, used)) for source in files]
    ffmpeg = ffmpeg_executable()
    rows: list[tuple[str, str, str]] = []
    for source, target in plan:
        command = [
            ffmpeg,
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(source),
            "-map",
            "0:v:0",
            "-map",
            "0:a?",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            str(crf),
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-movflags",
            "+faststart",
            str(target),
        ]
        result = subprocess.run(command, text=True, capture_output=True, check=False)
        if result.returncode != 0:
            target.unlink(missing_ok=True)
            raise SystemExit(f"FFmpeg falló con {source.name}: {result.stderr[-800:]}")
        rows.append((source.name, target.name, "CONVERTIDO"))

    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        writer.writerow(["archivo_origen", "archivo_mp4", "estado"])
        writer.writerows(rows)
    return len(rows)


def interactive() -> None:
    print("RESUELTO EN LOTE · VÍDEOS A MP4")
    input_dir = input("Carpeta con vídeos: ").strip().strip('"')
    output_dir = input("Carpeta de salida [videos_mp4]: ").strip().strip('"') or "videos_mp4"
    report = input("Informe [conversion_mp4.csv]: ").strip().strip('"') or "conversion_mp4.csv"
    try:
        count = convert_videos(Path(input_dir), Path(output_dir), Path(report))
        print(f"\nLISTO: {count} vídeos convertidos a MP4")
    except (Exception, SystemExit) as exc:
        print(f"\nERROR: {exc}")
    input("\nPulsa Enter para cerrar...")


def main() -> None:
    if len(sys.argv) == 1:
        interactive()
        return
    parser = argparse.ArgumentParser(description="Convierte por lotes vídeos compatibles a MP4")
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("report", type=Path)
    parser.add_argument("--crf", type=int, default=23)
    args = parser.parse_args()
    count = convert_videos(args.input_dir, args.output_dir, args.report, crf=args.crf)
    print(f"OK: {count} vídeos convertidos a MP4; informe: {args.report}")


if __name__ == "__main__":
    main()

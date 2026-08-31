# Renombrar archivos por fecha

Crea nombres como `2025-01-01_153000_0001.jpg` a partir de la fecha de modificación, conservando la extensión. Sin `--apply` solo genera un CSV de vista previa y no cambia ningún nombre.

```powershell
python renombrar_por_fecha.py C:/fotos plan_renombrado.csv
python renombrar_por_fecha.py C:/fotos renombrado_aplicado.csv --apply
```

En Windows también puedes usar `renombrar_archivos.ps1`; añade `-Aplicar` únicamente después de revisar el CSV. La utilidad procesa solo los archivos de la carpeta indicada, no sus subcarpetas, y se detiene antes de sobrescribir un destino existente.

La fecha de modificación puede cambiar al copiar, editar o descargar un archivo; no equivale necesariamente a la fecha de captura EXIF. Trabaja primero sobre una copia.

# Renombrar archivos por fecha

Crea nombres como `2025-01-01_153000_0001.jpg` a partir de la fecha de modificación, conservando la extensión. Sin `--apply` solo genera un CSV de vista previa y no cambia ningún nombre.

Descarga `renombrar_por_fecha.exe` y ábrelo con doble clic. Primero genera una vista previa; solo cambia los nombres cuando escribes la confirmación solicitada. No necesitas instalar Python.

La aplicación procesa únicamente los archivos de la carpeta elegida, no sus subcarpetas, y se detiene antes de sobrescribir un destino existente.

La fecha de modificación puede cambiar al copiar, editar o descargar un archivo; no equivale necesariamente a la fecha de captura EXIF. Trabaja primero sobre una copia.

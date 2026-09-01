# Resuelto en Lote 0.5.0

Esta versión elimina la necesidad de abrir scripts: las ocho aplicaciones para Windows se entregan como ejecutables portables.

## Más fácil de usar

- `comparar_carpetas.exe`, `encontrar_archivos_grandes.exe` y `renombrar_por_fecha.exe` sustituyen las descargas de PowerShell.
- No hace falta instalar Python.
- Comparar carpetas y encontrar archivos grandes también tienen una versión web de solo lectura.
- La web procesa los archivos dentro del navegador y no los envía a ningún servidor.

## Seguridad

- Las aplicaciones de consulta no modifican los originales.
- Renombrar por fecha muestra una vista previa y exige confirmación antes de cambiar nombres.
- Los ejecutables siguen sin firma digital. Descárgalos únicamente desde el repositorio oficial y comprueba `SHA256SUMS.txt`.

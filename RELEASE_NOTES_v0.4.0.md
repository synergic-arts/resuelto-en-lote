# Resuelto en Lote 0.4.0

Esta versión amplía la colección a ocho utilidades para Windows.

## Nuevas herramientas

- `convertir_videos_a_mp4.exe`: convierte por lotes a MP4 H.264/AAC, conserva originales y genera un CSV. Requiere FFmpeg instalado.
- `organizar_fotos.exe`: crea una vista previa y copia fotos a carpetas `AAAA/MM`, priorizando EXIF y evitando sobrescrituras.
- `extraer_tablas_pdf.exe`: extrae tablas trazadas de PDF digitales a un libro Excel con resumen de procedencia. No incluye OCR.

## Verificación

Los tres ejecutables se probaron en Windows con casos controlados: cuatro formatos de vídeo, doce JPEG distribuidos en cuatro meses y tres PDF con seis tablas y 18 filas de datos. Se verificó que las entradas permanecieran intactas.

Los ejecutables no están firmados digitalmente. Comprueba siempre `SHA256SUMS.txt` y prueba primero con copias pequeñas.

# Resuelto en Lote

Herramientas gratuitas y reproducibles para resolver trabajos pesados con archivos.

Cada utilidad de este repositorio tiene código fuente, caso de prueba y una descarga de Windows con SHA-256 publicada en la release correspondiente. No requieren conexión a Internet y no envían archivos a ningún servicio.

## Herramientas

| Utilidad | Entrada | Salida | Seguridad |
|---|---|---|---|
| [Unir Excel](tools/unir-excel/) | Carpeta de `.xlsx` con la misma cabecera | `excel_combinado.xlsx` | No modifica originales |
| [Comparar Excel](tools/comparar-excel/) | Dos `.xlsx`, clave única en primera columna | `diferencias_excel.xlsx` | Solo lectura de entradas |
| [Comparar carpetas](tools/comparar-carpetas/) | Dos carpetas | `comparacion_carpetas.csv` | No copia ni elimina |
| [Archivos que más ocupan](tools/archivos-grandes/) | Carpeta o unidad | `archivos_mas_grandes.csv` | Solo consulta metadatos |
| [Renombrar por fecha](tools/renombrar-por-fecha/) | Archivos de una carpeta | `plan_renombrado.csv` | Vista previa por defecto; no sobrescribe |
| [Vídeos a MP4](tools/videos-a-mp4/) | Carpeta con vídeos | MP4 H.264/AAC + CSV | Originales intactos; requiere FFmpeg |
| [Organizar fotos](tools/organizar-fotos/) | Fotos en subcarpetas | Copias por año/mes + CSV | Vista previa; copia, no mueve |
| [Tablas PDF a Excel](tools/pdf-tablas-a-excel/) | PDF digitales con tablas trazadas | `tablas_pdf.xlsx` | Solo lectura; no incluye OCR |

## Descargas

Descarga los ejecutables y scripts disponibles desde [la última release](https://github.com/synergic-arts/resuelto-en-lote/releases/latest). Los ejecutables son portables, no están firmados digitalmente y Windows puede mostrar SmartScreen. Verifica siempre `SHA256SUMS.txt`; el código exacto está en este repositorio.

## Uso responsable

Empieza con copias pequeñas, revisa la salida y conserva una copia de seguridad. Estas utilidades generan informes o archivos nuevos; nunca deben sustituir una revisión cuando los datos tengan consecuencias legales, contables o personales.

Canal: [Resuelto en Lote](https://www.youtube.com/@ResueltoEnLote) · Promesa: **Herramientas que te ahorran horas**.

# Resuelto en Lote

Aplicaciones gratuitas para resolver trabajos pesados con archivos sin tener que instalar Python ni escribir comandos.

Puedes abrir las aplicaciones web directamente o descargar la versión de Windows y hacer doble clic. Las aplicaciones web procesan los archivos dentro del navegador: no los suben a nuestros servidores. Cada aplicación incluye código fuente, pruebas y descargas verificables mediante SHA-256.

## Aplicaciones

| Aplicación | Forma más sencilla | Entrada | Salida | Seguridad |
|---|---|---|---|---|
| Unir PDF | [Abrir en la web](https://synergic-arts.github.io/resuelto-en-lote/aplicaciones/unir-pdf/) | Dos o más PDF sin cifrar | `pdf_unido.pdf` | Proceso aislado; no sube documentos |
| [Unir Excel](tools/unir-excel/) | Aplicación Windows | Carpeta de `.xlsx` con la misma cabecera | `excel_combinado.xlsx` | No modifica originales |
| [Comparar Excel](tools/comparar-excel/) | Aplicación Windows | Dos `.xlsx`, clave única en primera columna | `diferencias_excel.xlsx` | Solo lectura de entradas |
| [Comparar carpetas](tools/comparar-carpetas/) | [Abrir en la web](https://synergic-arts.github.io/resuelto-en-lote/aplicaciones/comparar-carpetas/) | Dos carpetas | Informe descargable | Solo lectura; SHA-256 opcional |
| [Archivos que más ocupan](tools/archivos-grandes/) | [Abrir en la web](https://synergic-arts.github.io/resuelto-en-lote/aplicaciones/archivos-grandes/) | Una carpeta | Ranking y CSV | Solo lee nombre y tamaño |
| Imágenes a WebP | [Abrir en la web](https://synergic-arts.github.io/resuelto-en-lote/aplicaciones/imagenes-webp/) | Una o varias imágenes | Copias `.webp` | Proceso local; originales intactos |
| [Renombrar por fecha](tools/renombrar-por-fecha/) | Aplicación Windows | Archivos de una carpeta | Vista previa + CSV | No cambia nada sin confirmación |
| [Vídeos a MP4](tools/videos-a-mp4/) | Aplicación Windows | Carpeta con vídeos | MP4 H.264/AAC + CSV | Originales intactos; requiere FFmpeg |
| [Organizar fotos](tools/organizar-fotos/) | Aplicación Windows | Fotos en subcarpetas | Copias por año/mes + CSV | Vista previa; copia, no mueve |
| [Tablas PDF a Excel](tools/pdf-tablas-a-excel/) | Aplicación Windows | PDF digitales con tablas trazadas | `tablas_pdf.xlsx` | Solo lectura; no incluye OCR |

## Descargas

Descarga las aplicaciones portables desde [la última versión para Windows](https://github.com/synergic-arts/resuelto-en-lote/releases/latest). No hace falta instalar Python. Los ejecutables no están firmados digitalmente y Windows puede mostrar SmartScreen; verifica `SHA256SUMS.txt` y descarga únicamente desde este repositorio.

## Uso responsable

Las aplicaciones de consulta no modifican los originales. Las que pueden cambiar nombres o crear copias muestran primero una vista previa o escriben en otra carpeta. Aun así, conserva una copia de seguridad cuando trabajes con archivos importantes.

La aplicación web Unir PDF incluye pdf-lib 1.17.1 bajo licencia MIT. No admite PDF cifrados; combinar documentos invalida firmas digitales y puede no conservar formularios, adjuntos o marcadores.

Canal: [Resuelto en Lote](https://www.youtube.com/@ResueltoEnLote) · Promesa: **Aplicaciones reales que te ahorran horas**.

# Extraer tablas de PDF a Excel

Recorre los PDF digitales de una carpeta, detecta tablas delimitadas por líneas y crea un libro con una hoja por tabla y una hoja `Resumen` con archivo, página y dimensiones.

```powershell
pip install -r requirements.txt
python extraer_tablas_pdf.py C:/pdf C:/salida/tablas_pdf.xlsx
```

En Windows, `extraer_tablas_pdf.exe` abre un asistente si se ejecuta sin argumentos.

No incluye OCR: no sirve para PDF escaneados ni garantiza diseños complejos, celdas fusionadas o tablas sin bordes. Revisa siempre cifras y cabeceras.

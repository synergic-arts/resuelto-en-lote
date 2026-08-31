# Unir Excel

Une la hoja activa de todos los `.xlsx` de una carpeta. Escribe una sola cabecera y añade `archivo_origen` a cada fila.

Límites: los libros deben compartir cabecera; no conserva estilos, macros ni gráficos. El resultado debe guardarse fuera de la carpeta de entrada.

```powershell
python unir_excel.py C:/ruta/entrada C:/ruta/excel_combinado.xlsx
```

Al abrir `unir_excel.exe` sin argumentos aparece un asistente que solicita carpeta y destino.

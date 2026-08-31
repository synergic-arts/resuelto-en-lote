# Comparar Excel

Compara la hoja activa de dos `.xlsx` usando la primera columna como clave única. Informa filas añadidas, eliminadas y celdas modificadas.

Límites: las cabeceras deben coincidir y las claves no deben repetirse. La utilidad informa diferencias; no decide qué versión es correcta.

```powershell
python comparar_excel.py original.xlsx actualizado.xlsx diferencias_excel.xlsx
```

Al abrir `comparar_excel.exe` sin argumentos aparece un asistente para ambas versiones y la salida.

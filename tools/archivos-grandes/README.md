# Encontrar los archivos que más espacio ocupan

Recorre una carpeta o unidad y genera un CSV con los archivos más grandes, ordenados de mayor a menor. Solo consulta ruta y tamaño: no borra, mueve ni modifica los archivos analizados.

```powershell
python encontrar_archivos_grandes.py C:\ archivos_mas_grandes.csv --limit 100 --minimum-mb 100
```

En Windows también puedes ejecutar `encontrar_archivos_grandes.ps1`. Revisa siempre la ruta y la función de cada archivo antes de borrarlo.

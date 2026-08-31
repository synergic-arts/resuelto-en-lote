# Comparar carpetas

Recorre dos carpetas y compara la huella SHA-256 de cada archivo. El CSV distingue `SOLO_ORIGEN`, `SOLO_DESTINO` y `CAMBIADO`.

La utilidad no copia, mueve ni elimina. Calcular huellas completas puede tardar con archivos muy grandes.

```powershell
python comparar_carpetas.py C:/origen C:/destino comparacion_carpetas.csv
```

En Windows, ejecuta `comparar_carpetas.ps1`; la política de integridad de código del equipo de construcción bloqueó el `.exe` sin firma y no se intentó eludirla.

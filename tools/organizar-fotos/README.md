# Organizar fotos por año y mes

Recorre subcarpetas, prioriza la fecha EXIF y usa la fecha de modificación cuando no existe. Sin `--apply` solo genera una vista previa CSV. Al aplicar, copia a `AAAA/MM` y conserva los originales.

```powershell
pip install -r requirements.txt
python organizar_fotos.py C:/fotos C:/fotos_organizadas plan_fotos.csv
python organizar_fotos.py C:/fotos C:/fotos_organizadas organizacion_aplicada.csv --apply
```

En Windows, `organizar_fotos.exe` abre un asistente si se ejecuta sin argumentos.

La modificación no equivale siempre a la captura. La utilidad no detecta duplicados ni clasifica personas o lugares.

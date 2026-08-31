# Convertir vídeos a MP4 por lotes

Convierte los vídeos compatibles de una carpeta a MP4 con vídeo H.264, audio AAC, `yuv420p` e inicio rápido. Guarda las salidas en otra carpeta y crea un CSV de correspondencias; no modifica los originales.

Requiere [FFmpeg](https://ffmpeg.org/) instalado y disponible en `PATH`.

```powershell
python convertir_videos_a_mp4.py C:/videos C:/videos_mp4 conversion_mp4.csv
```

En Windows también puedes abrir `convertir_videos_a_mp4.exe` y seguir el asistente. El ejecutable sigue requiriendo FFmpeg instalado.

Convertir no mejora la calidad de origen. Revisa imagen, audio y duración antes de borrar o archivar cualquier original.

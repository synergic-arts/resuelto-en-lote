[CmdletBinding()]
param(
    [Parameter(Position = 0)] [string] $Raiz,
    [Parameter(Position = 1)] [string] $Informe = 'archivos_mas_grandes.csv',
    [Parameter(Position = 2)] [ValidateRange(1, 100000)] [int] $Limite = 100,
    [Parameter(Position = 3)] [ValidateRange(0, [double]::MaxValue)] [double] $MinimoMB = 0
)

$ErrorActionPreference = 'Stop'
if (-not $Raiz) { $Raiz = Read-Host 'Carpeta o unidad que quieres analizar' }
if (-not (Test-Path -LiteralPath $Raiz -PathType Container)) {
    throw "La carpeta no existe: $Raiz"
}

$rootPath = [IO.Path]::GetFullPath($Raiz).TrimEnd('\') + '\'
$outputPath = [IO.Path]::GetFullPath($Informe)
$minimumBytes = [long]($MinimoMB * 1MB)
$scanErrors = @()
$files = Get-ChildItem -LiteralPath $rootPath -Recurse -File -ErrorAction SilentlyContinue -ErrorVariable +scanErrors |
    Where-Object { $_.FullName -ne $outputPath -and $_.Length -ge $minimumBytes } |
    Sort-Object -Property @{ Expression = 'Length'; Descending = $true }, @{ Expression = 'FullName'; Descending = $false } |
    Select-Object -First $Limite

$rank = 0
$rows = $files | ForEach-Object {
    $rank += 1
    [pscustomobject]@{
        puesto = $rank
        ruta = $_.FullName.Substring($rootPath.Length).Replace('\', '/')
        bytes = $_.Length
        megabytes = '{0:N2}' -f ($_.Length / 1MB)
    }
}

$parent = Split-Path -Parent $outputPath
if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
if ($rows) {
    $rows | Export-Csv -LiteralPath $outputPath -NoTypeInformation -Encoding utf8
}
else {
    'puesto,ruta,bytes,megabytes' | Set-Content -LiteralPath $outputPath -Encoding utf8
}

Write-Output "OK: $($files.Count) archivos guardados en $outputPath; entradas omitidas: $($scanErrors.Count)"

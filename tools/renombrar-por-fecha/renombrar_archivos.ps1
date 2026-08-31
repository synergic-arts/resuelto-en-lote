[CmdletBinding()]
param(
    [Parameter(Position = 0)] [string] $Carpeta,
    [Parameter(Position = 1)] [string] $Informe = 'plan_renombrado.csv',
    [switch] $Aplicar
)

$ErrorActionPreference = 'Stop'
if (-not $Carpeta) { $Carpeta = Read-Host 'Carpeta con los archivos' }
if (-not (Test-Path -LiteralPath $Carpeta -PathType Container)) {
    throw "La carpeta no existe: $Carpeta"
}

$folderPath = [IO.Path]::GetFullPath($Carpeta).TrimEnd('\')
$reportPath = [IO.Path]::GetFullPath($Informe)
$files = @(Get-ChildItem -LiteralPath $folderPath -File |
    Where-Object { $_.FullName -ne $reportPath } |
    Sort-Object -Property LastWriteTimeUtc, Name)
if ($files.Count -eq 0) { throw 'No se encontraron archivos en la carpeta' }

$sourceNames = @{}
foreach ($file in $files) { $sourceNames[$file.Name] = $true }
$targetNames = @{}
$plan = @()
for ($index = 0; $index -lt $files.Count; $index += 1) {
    $file = $files[$index]
    $stamp = $file.LastWriteTime.ToString('yyyy-MM-dd_HHmmss')
    $targetName = '{0}_{1:D4}{2}' -f $stamp, ($index + 1), $file.Extension
    if ($targetNames.ContainsKey($targetName)) {
        throw "Nombre de destino duplicado: $targetName"
    }
    $targetPath = Join-Path $folderPath $targetName
    if ((Test-Path -LiteralPath $targetPath) -and -not $sourceNames.ContainsKey($targetName)) {
        throw "El destino ya existe y no se sobrescribirá: $targetName"
    }
    $targetNames[$targetName] = $true
    $plan += [pscustomobject]@{
        OriginalPath = $file.FullName
        Original = $file.Name
        TargetPath = $targetPath
        Nuevo = $targetName
        Fecha = $stamp
    }
}

if ($Aplicar) {
    $staged = @()
    try {
        for ($index = 0; $index -lt $plan.Count; $index += 1) {
            $row = $plan[$index]
            $temporaryName = '.resuelto-en-lote-{0:D4}.tmp' -f ($index + 1)
            $temporaryPath = Join-Path $folderPath $temporaryName
            if (Test-Path -LiteralPath $temporaryPath) {
                throw "Existe un temporal de una ejecución anterior: $temporaryName"
            }
            Move-Item -LiteralPath $row.OriginalPath -Destination $temporaryPath
            $staged += [pscustomobject]@{
                OriginalPath = $row.OriginalPath
                TemporaryPath = $temporaryPath
                TargetPath = $row.TargetPath
            }
        }
        foreach ($row in $staged) {
            Move-Item -LiteralPath $row.TemporaryPath -Destination $row.TargetPath
        }
    }
    catch {
        foreach ($row in @($staged | Sort-Object -Descending OriginalPath)) {
            $current = if (Test-Path -LiteralPath $row.TargetPath) { $row.TargetPath } else { $row.TemporaryPath }
            if ((Test-Path -LiteralPath $current) -and -not (Test-Path -LiteralPath $row.OriginalPath)) {
                Move-Item -LiteralPath $current -Destination $row.OriginalPath
            }
        }
        throw
    }
}

$parent = Split-Path -Parent $reportPath
if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
$plan | Select-Object @{
        Name = 'nombre_original'; Expression = { $_.Original }
    }, @{
        Name = 'nombre_nuevo'; Expression = { $_.Nuevo }
    }, @{
        Name = 'fecha_modificacion'; Expression = { $_.Fecha }
    }, @{
        Name = 'aplicado'; Expression = { if ($Aplicar) { 'SI' } else { 'NO' } }
    } | Export-Csv -LiteralPath $reportPath -NoTypeInformation -Encoding utf8

$status = if ($Aplicar) { 'renombrados' } else { 'planificados sin cambios' }
Write-Output "OK: $($plan.Count) archivos $status; informe: $reportPath"


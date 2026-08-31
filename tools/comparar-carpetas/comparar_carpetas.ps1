[CmdletBinding()]
param(
    [Parameter(Position = 0)] [string] $Origen,
    [Parameter(Position = 1)] [string] $Destino,
    [Parameter(Position = 2)] [string] $Informe
)

$ErrorActionPreference = 'Stop'

if (-not $Origen) { $Origen = Read-Host 'Carpeta de origen' }
if (-not $Destino) { $Destino = Read-Host 'Carpeta de destino' }
if (-not $Informe) { $Informe = Read-Host 'Informe CSV [comparacion_carpetas.csv]' }
if (-not $Informe) { $Informe = 'comparacion_carpetas.csv' }

$origenRaiz = [IO.Path]::GetFullPath($Origen).TrimEnd('\') + '\'
$destinoRaiz = [IO.Path]::GetFullPath($Destino).TrimEnd('\') + '\'

function Get-Inventory([string] $Root) {
    $result = @{}
    Get-ChildItem -LiteralPath $Root -Recurse -File | ForEach-Object {
        $relative = $_.FullName.Substring($Root.Length).Replace('\', '/')
        $result[$relative] = [pscustomobject]@{
            Bytes = $_.Length
            Hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
        }
    }
    return $result
}

$left = Get-Inventory $origenRaiz
$right = Get-Inventory $destinoRaiz
$rows = [Collections.Generic.List[object]]::new()

@($left.Keys + $right.Keys | Sort-Object -Unique) | ForEach-Object {
    $relative = $_
    if (-not $left.ContainsKey($relative)) {
        $rows.Add([pscustomobject]@{ ruta = $relative; estado = 'SOLO_DESTINO'; bytes_origen = $null; bytes_destino = $right[$relative].Bytes })
    }
    elseif (-not $right.ContainsKey($relative)) {
        $rows.Add([pscustomobject]@{ ruta = $relative; estado = 'SOLO_ORIGEN'; bytes_origen = $left[$relative].Bytes; bytes_destino = $null })
    }
    elseif ($left[$relative].Hash -ne $right[$relative].Hash) {
        $rows.Add([pscustomobject]@{ ruta = $relative; estado = 'CAMBIADO'; bytes_origen = $left[$relative].Bytes; bytes_destino = $right[$relative].Bytes })
    }
}

$parent = Split-Path -Parent ([IO.Path]::GetFullPath($Informe))
if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
if ($rows.Count -gt 0) {
    $rows | Export-Csv -LiteralPath $Informe -NoTypeInformation -Encoding utf8
}
else {
    'ruta,estado,bytes_origen,bytes_destino' | Set-Content -LiteralPath $Informe -Encoding utf8
}

Write-Output "OK: $($rows.Count) diferencias guardadas en $Informe"

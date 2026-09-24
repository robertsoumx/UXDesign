$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$assetManifest = Get-Content -LiteralPath (Join-Path $taskRoot 'media-manifest.json') -Raw | ConvertFrom-Json
$assetManifest | ForEach-Object -Parallel {
  $asset = $_
  $assetRoot = $using:taskRoot
  $destination = Join-Path (Join-Path $assetRoot 'public') $asset.path
  if (-not (Test-Path -LiteralPath $destination)) {
    Invoke-WebRequest -Uri $asset.url -OutFile $destination -TimeoutSec 45
  }
  [PSCustomObject]@{ File = $asset.path; Bytes = (Get-Item -LiteralPath $destination).Length }
} -ThrottleLimit 4

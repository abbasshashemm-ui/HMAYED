# Hero poster from the encoded hero video (shown before video loads).

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$out = Join-Path $root 'hero-poster.jpg'
$source = Join-Path $root 'main.webm'
if (-not (Test-Path -LiteralPath $source)) {
  $source = Join-Path $root 'main.mp4'
}
if (-not (Test-Path -LiteralPath $source)) {
  Write-Error 'Neither main.webm nor main.mp4 found.'
  exit 1
}

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  Write-Output 'Install ffmpeg, then rerun this script.'
  exit 0
}

& ffmpeg -y -i $source -ss 00:00:00.5 -frames:v 1 -q:v 2 -update 1 $out
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Output ("Wrote {0} ({1:n0} bytes)" -f $out, (Get-Item -LiteralPath $out).Length)

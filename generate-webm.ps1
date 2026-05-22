# Encodes desktop (720p) and mobile (480p) hero WebM.
# Drop a new file as main-source.webm, main-source.mp4, main.mp4, or main.webm, then run this script.
# Requires ffmpeg in PATH.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  Write-Output 'Install ffmpeg, then rerun this script.'
  exit 0
}

$desktop = Join-Path $root 'main.webm'
$mobile = Join-Path $root 'main-mobile.webm'
$sourceCandidates = @(
  (Join-Path $root 'main-source.webm'),
  (Join-Path $root 'main-source.mp4'),
  (Join-Path $root 'main.mp4'),
  $desktop
)

$source = $sourceCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $source) {
  Write-Error 'No source video found. Add main-source.webm, main-source.mp4, main.mp4, or main.webm.'
  exit 1
}

function Encode-HeroWebm {
  param(
    [string]$InputPath,
    [string]$OutputPath,
    [int]$Height,
    [int]$Crf
  )

  $temp = if ($InputPath -eq $OutputPath) { "$OutputPath.tmp" } else { $OutputPath }
  & ffmpeg -y -i $InputPath -c:v libvpx-vp9 -crf $Crf -b:v 0 -vf "scale=-2:$Height" -an -f webm $temp
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  if ($temp -ne $OutputPath) {
    Move-Item -LiteralPath $temp -Destination $OutputPath -Force
  }
  Write-Output ("Wrote {0} ({1:n0} bytes)" -f $OutputPath, (Get-Item -LiteralPath $OutputPath).Length)
}

Write-Output ("Source: {0}" -f (Split-Path -Leaf $source))
Encode-HeroWebm -InputPath $source -OutputPath $desktop -Height 720 -Crf 33
Encode-HeroWebm -InputPath $desktop -OutputPath $mobile -Height 480 -Crf 36

$poster = Join-Path $root 'hero-poster.jpg'
& ffmpeg -y -i $desktop -ss 00:00:00.5 -frames:v 1 -q:v 2 -update 1 $poster
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Output ("Wrote {0} ({1:n0} bytes)" -f $poster, (Get-Item -LiteralPath $poster).Length)

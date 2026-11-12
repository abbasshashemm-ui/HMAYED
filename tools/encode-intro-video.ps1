# Encodes the content-creation intro video for the web: 720p + 480p WebM and a poster frame.
# Drop a new source at assets/video/intro-source.mp4 (or .webm, .mov), then run:
#   pwsh tools/encode-intro-video.ps1
# Requires ffmpeg in PATH. The source file is never committed (see .gitignore).

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$videoDir = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets/video'
$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  Write-Output 'Install ffmpeg, then rerun this script.'
  exit 0
}

$desktop = Join-Path $videoDir 'intro-720.webm'
$mobile = Join-Path $videoDir 'intro-480.webm'
$poster = Join-Path $videoDir 'intro-poster.jpg'

$source = @('intro-source.mp4', 'intro-source.webm', 'intro-source.mov') |
  ForEach-Object { Join-Path $videoDir $_ } |
  Where-Object { Test-Path -LiteralPath $_ } |
  Select-Object -First 1
if (-not $source) { $source = $desktop }
if (-not (Test-Path -LiteralPath $source)) {
  Write-Error 'No source video found. Add assets/video/intro-source.mp4.'
  exit 1
}

function Encode-Webm {
  param([string]$InputPath, [string]$OutputPath, [int]$Height, [int]$Crf)
  $temp = "$OutputPath.tmp.webm"
  # Audio is kept (Opus) because the page offers a sound toggle.
  & ffmpeg -y -i $InputPath -c:v libvpx-vp9 -crf $Crf -b:v 0 -row-mt 1 -vf "scale=-2:$Height" -c:a libopus -b:a 96k $temp
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Move-Item -LiteralPath $temp -Destination $OutputPath -Force
  Write-Output ("Wrote {0} ({1:n0} bytes)" -f $OutputPath, (Get-Item -LiteralPath $OutputPath).Length)
}

Write-Output ("Source: {0}" -f (Split-Path -Leaf $source))
Encode-Webm -InputPath $source -OutputPath $desktop -Height 720 -Crf 33
Encode-Webm -InputPath $desktop -OutputPath $mobile -Height 480 -Crf 36

# H.264 fallback for browsers without WebM/VP9 (older iOS Safari).
$mp4 = Join-Path $videoDir 'intro-720.mp4'
& ffmpeg -y -i $source -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -profile:v high -vf "scale=-2:720" -c:a aac -b:a 128k -movflags +faststart $mp4
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Output ("Wrote {0} ({1:n0} bytes)" -f $mp4, (Get-Item -LiteralPath $mp4).Length)

& ffmpeg -y -i $desktop -ss 00:00:00.5 -frames:v 1 -q:v 2 -update 1 $poster
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Output ("Wrote {0} ({1:n0} bytes)" -f $poster, (Get-Item -LiteralPath $poster).Length)

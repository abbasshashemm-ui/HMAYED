# Optional: smaller hero stream, same resolution. Requires ffmpeg in PATH.
#   .\generate-webm.ps1

$input = Join-Path $PSScriptRoot 'main.mp4'
$output = Join-Path $PSScriptRoot 'main.webm'

if (-not (Test-Path -LiteralPath $input)) {
  Write-Error "main.mp4 not found."
  exit 1
}

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  Write-Output 'Install ffmpeg, then rerun. Example:'
  Write-Output '  ffmpeg -i main.mp4 -c:v libvpx-vp9 -crf 32 -b:v 0 -an main.webm'
  exit 0
}

& ffmpeg -y -i $input -c:v libvpx-vp9 -crf 32 -b:v 0 -an $output
if ($LASTEXITCODE -eq 0) {
  Write-Output ("Wrote {0} ({1:n0} bytes)" -f $output, (Get-Item $output).Length)
}

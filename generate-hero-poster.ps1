# Hero poster for main.mp4 (shown before video loads). Replace with a real frame when you can:
#   ffmpeg -y -i main.mp4 -ss 00:00:00.5 -vframes 1 -q:v 2 hero-poster.jpg

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot 'hero-poster.jpg'
$w = 1280
$h = 720

$bmp = New-Object System.Drawing.Bitmap($w, $h)
$gfx = [System.Drawing.Graphics]::FromImage($bmp)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  [System.Drawing.Rectangle]::FromLTRB(0, 0, $w, $h),
  [System.Drawing.Color]::FromArgb(8, 10, 13),
  [System.Drawing.Color]::FromArgb(3, 4, 5),
  [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
$gfx.FillRectangle($brush, 0, 0, $w, $h)
$brush.Dispose()
$gfx.Dispose()

$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, 88L)
$bmp.Save($out, $encoder, $encParams)
$encParams.Dispose()
$bmp.Dispose()

Write-Output ("Wrote {0} ({1:n0} bytes)" -f $out, (Get-Item $out).Length)

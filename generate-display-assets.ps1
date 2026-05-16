# Creates -display.jpg variants for carousel (max 840px @ Q90 — matches on-screen cards @ 2x).
# Originals are never modified — full resolution stays for archival / future lightbox.

param(
  [int]$MaxWidth = 840,
  [int]$Quality = 90,
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function Get-JpegEncoder {
  [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' } |
    Select-Object -First 1
}

function Save-Jpeg {
  param([System.Drawing.Image]$Image, [string]$Path, [int]$Q)
  $encoder = Get-JpegEncoder
  if (-not $encoder) { throw 'JPEG encoder not available.' }
  $quality = [Math]::Max(1, [Math]::Min(100, $Q))
  $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
  $Image.Save($Path, $encoder, $encParams)
  $encParams.Dispose()
}

function Export-DisplayAsset {
  param([System.IO.FileInfo]$File)

  $displayPath = [System.IO.Path]::Combine(
    $File.DirectoryName,
    ($File.BaseName + '-display.jpg'))

  if (-not $Force -and (Test-Path -LiteralPath $displayPath) -and
      (Get-Item -LiteralPath $displayPath).LastWriteTimeUtc -ge $File.LastWriteTimeUtc) {
    return $null
  }

  $stream = [System.IO.File]::Open($File.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
  $img = [System.Drawing.Image]::FromStream($stream)
  $stream.Dispose()

  try {
    $srcW = [double]$img.Width
    $srcH = [double]$img.Height
    $scale = if ($srcW -le $MaxWidth) { 1.0 } else { $MaxWidth / $srcW }
    $newW = [int][Math]::Max(1, [Math]::Round($srcW * $scale))
    $newH = [int][Math]::Max(1, [Math]::Round($srcH * $scale))

    if ($scale -lt 1.0) {
      $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
      $gfx = [System.Drawing.Graphics]::FromImage($bmp)
      $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $gfx.DrawImage($img, 0, 0, $newW, $newH)
      $gfx.Dispose()
      Save-Jpeg -Image $bmp -Path $displayPath -Q $Quality
      $bmp.Dispose()
    } else {
      Save-Jpeg -Image $img -Path $displayPath -Q $Quality
    }
  } finally {
    $img.Dispose()
  }

  return [PSCustomObject]@{
    Name = $File.Name
    Before = $File.Length
    After = (Get-Item -LiteralPath $displayPath).Length
    Path = $displayPath
  }
}

$roots = @(
  'content/cinema',
  'content/content-creation/talking-head',
  'content/content-creation/podcast',
  'content/content-creation/food'
)

$files = foreach ($root in $roots) {
  Get-ChildItem -Path $root -File -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Extension -match '^\.(jpe?g|png)$' -and
      $_.BaseName -notmatch '-display$'
    }
}

if (-not $files -or @($files).Count -eq 0) {
  Write-Output 'No portfolio images found.'
  exit 0
}

$totalBefore = 0L
$totalAfter = 0L
$count = 0

foreach ($file in $files) {
  $result = Export-DisplayAsset -File $file
  if ($null -eq $result) { continue }
  $count++
  $totalBefore += $result.Before
  $totalAfter += $result.After
  Write-Output ("{0} -> {1} ({2:n0} -> {3:n0} bytes)" -f $result.Name, [IO.Path]::GetFileName($result.Path), $result.Before, $result.After)
}

if (Test-Path -LiteralPath 'camera-wireframe.png') {
  $posterFile = Get-Item -LiteralPath 'camera-wireframe.png'
  $posterOut = Join-Path $posterFile.DirectoryName 'hero-poster.jpg'
  if (-not (Test-Path -LiteralPath $posterOut) -or
      (Get-Item -LiteralPath $posterOut).LastWriteTimeUtc -lt $posterFile.LastWriteTimeUtc) {
    $stream = [System.IO.File]::Open($posterFile.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
    $src = [System.Drawing.Image]::FromStream($stream)
    $stream.Dispose()
    try {
      $maxW = 1280
      $scale = if ($src.Width -le $maxW) { 1.0 } else { $maxW / [double]$src.Width }
      $newW = [int][Math]::Max(1, [Math]::Round($src.Width * $scale))
      $newH = [int][Math]::Max(1, [Math]::Round($src.Height * $scale))
      $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
      $gfx = [System.Drawing.Graphics]::FromImage($bmp)
      $gfx.Clear([System.Drawing.Color]::FromArgb(3, 4, 5))
      $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $gfx.DrawImage($src, 0, 0, $newW, $newH)
      $gfx.Dispose()
      Save-Jpeg -Image $bmp -Path $posterOut -Q 90
      $bmp.Dispose()
      Write-Output ("hero-poster.jpg ({0:n0} bytes)" -f (Get-Item -LiteralPath $posterOut).Length)
    } finally {
      $src.Dispose()
    }
  } else {
    Write-Output 'hero-poster.jpg is up to date'
  }
}

Write-Output ("Done. {0} display asset(s). Carousel total: {1:n0} -> {2:n0} bytes" -f $count, $totalBefore, $totalAfter)

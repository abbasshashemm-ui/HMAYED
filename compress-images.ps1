# Prefer generate-display-assets.ps1 — it keeps full-resolution originals
# and only adds -display.jpg files sized for the carousel (1080px @ Q92).

param(
  [int]$Quality = 78,
  [int]$MaxWidth = 1920,
  [int]$MaxHeight = 1920,
  [switch]$InPlace = $true
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
  param(
    [System.Drawing.Image]$Image,
    [string]$Path,
    [int]$Q
  )

  $encoder = Get-JpegEncoder
  if (-not $encoder) {
    throw 'JPEG encoder not available on this system.'
  }

  $quality = [Math]::Max(1, [Math]::Min(100, $Q))
  $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
  $Image.Save($Path, $encoder, $encParams)
  $encParams.Dispose()
}

function Resize-Image {
  param(
    [System.Drawing.Image]$InputImage,
    [int]$TargetMaxWidth,
    [int]$TargetMaxHeight
  )

  $srcW = [double]$InputImage.Width
  $srcH = [double]$InputImage.Height

  if ($srcW -le $TargetMaxWidth -and $srcH -le $TargetMaxHeight) {
    return $null
  }

  $scale = [Math]::Min($TargetMaxWidth / $srcW, $TargetMaxHeight / $srcH)
  $newW = [int][Math]::Max(1, [Math]::Round($srcW * $scale))
  $newH = [int][Math]::Max(1, [Math]::Round($srcH * $scale))

  $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
  $gfx = [System.Drawing.Graphics]::FromImage($bmp)
  $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gfx.DrawImage($InputImage, 0, 0, $newW, $newH)
  $gfx.Dispose()

  return $bmp
}

$targets = @(
  @{ Folder = 'content/cinema'; Pattern = 'cinema*.jpg' },
  @{ Folder = 'content/content-creation'; Pattern = 'cc*.jpg' }
)

$files = foreach ($t in $targets) {
  Get-ChildItem -Path $t.Folder -Filter $t.Pattern -File -ErrorAction SilentlyContinue
}

if (-not $files -or $files.Count -eq 0) {
  Write-Output 'No JPG files found. Add files first (cinema*.jpg, cc*.jpg), then rerun this script.'
  exit 0
}

$processed = 0
$savedBytes = 0L

foreach ($file in $files) {
  $before = $file.Length
  $tmpPath = "$($file.FullName).tmp.jpg"

  $stream = [System.IO.File]::Open($file.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
  $img = [System.Drawing.Image]::FromStream($stream)

  try {
    $resized = Resize-Image -InputImage $img -TargetMaxWidth $MaxWidth -TargetMaxHeight $MaxHeight
    if ($null -ne $resized) {
      Save-Jpeg -Image $resized -Path $tmpPath -Q $Quality
      $resized.Dispose()
    } else {
      Save-Jpeg -Image $img -Path $tmpPath -Q $Quality
    }
  }
  finally {
    $img.Dispose()
    $stream.Dispose()
  }

  if ($InPlace) {
    Move-Item -LiteralPath $tmpPath -Destination $file.FullName -Force
    $after = (Get-Item -LiteralPath $file.FullName).Length
  } else {
    $outPath = [System.IO.Path]::Combine($file.DirectoryName, ([System.IO.Path]::GetFileNameWithoutExtension($file.Name) + '-compressed.jpg'))
    Move-Item -LiteralPath $tmpPath -Destination $outPath -Force
    $after = (Get-Item -LiteralPath $outPath).Length
  }

  $processed++
  $savedBytes += [Math]::Max(0, ($before - $after))
  Write-Output ("Compressed {0} ({1:n0} -> {2:n0} bytes)" -f $file.Name, $before, $after)
}

Write-Output ("Done. Processed {0} file(s). Total bytes saved: {1:n0}" -f $processed, $savedBytes)

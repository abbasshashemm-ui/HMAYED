param(
  [ValidateSet('hero', 'carousel', 'all')]
  [string]$Task = 'all',
  [int]$MaxWidth = 840,
  [int]$Quality = 90,
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$homeDir = Join-Path $root 'content\home'

function Invoke-HeroBuild {
  $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if (-not $ffmpeg) {
    Write-Output 'Install ffmpeg, then rerun this script.'
    exit 0
  }

  if (-not (Test-Path -LiteralPath $homeDir)) {
    New-Item -ItemType Directory -Path $homeDir -Force | Out-Null
  }

  $desktop = Join-Path $homeDir 'main.webm'
  $mobile = Join-Path $homeDir 'main-mobile.webm'
  $sourceCandidates = @(
    (Join-Path $homeDir 'main-source.webm'),
    (Join-Path $homeDir 'main-source.mp4'),
    (Join-Path $homeDir 'main.mp4'),
    $desktop
  )

  $source = $sourceCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if (-not $source) {
    Write-Error 'No source video found in content/home/.'
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
    & ffmpeg -y -i $InputPath -c:v libvpx-vp9 -crf $Crf -b:v 0 -vf "scale=-2:$Height" -c:a libopus -b:a 96k -f webm $temp
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    if ($temp -ne $OutputPath) {
      Move-Item -LiteralPath $temp -Destination $OutputPath -Force
    }
    Write-Output ("Wrote {0} ({1:n0} bytes)" -f $OutputPath, (Get-Item -LiteralPath $OutputPath).Length)
  }

  Write-Output ("Source: {0}" -f (Split-Path -Leaf $source))
  Encode-HeroWebm -InputPath $source -OutputPath $desktop -Height 720 -Crf 33
  Encode-HeroWebm -InputPath $desktop -OutputPath $mobile -Height 480 -Crf 36

  $poster = Join-Path $homeDir 'hero-poster.jpg'
  & ffmpeg -y -i $desktop -ss 00:00:00.5 -frames:v 1 -q:v 2 -update 1 $poster
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Output ("Wrote {0} ({1:n0} bytes)" -f $poster, (Get-Item -LiteralPath $poster).Length)
}

function Invoke-CarouselBuild {
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
    (Join-Path $root 'content\cinema'),
    (Join-Path $root 'content\content-creation\talking-head'),
    (Join-Path $root 'content\content-creation\podcast'),
    (Join-Path $root 'content\content-creation\food')
  )

  $files = foreach ($dir in $roots) {
    Get-ChildItem -Path $dir -File -ErrorAction SilentlyContinue |
      Where-Object {
        $_.Extension -match '^\.(jpe?g|png)$' -and
        $_.BaseName -notmatch '-display$'
      }
  }

  if (-not $files -or @($files).Count -eq 0) {
    Write-Output 'No portfolio images found.'
    return
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

  Write-Output ("Done. {0} display asset(s). Carousel total: {1:n0} -> {2:n0} bytes" -f $count, $totalBefore, $totalAfter)
}

if ($Task -eq 'hero' -or $Task -eq 'all') { Invoke-HeroBuild }
if ($Task -eq 'carousel' -or $Task -eq 'all') { Invoke-CarouselBuild }

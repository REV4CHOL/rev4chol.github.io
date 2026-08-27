# Generates 26 placeholder projects (poster/preview/hover/stills) with ffmpeg.
# Skips any slug whose poster.jpg already exists, so re-runs only fill gaps.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/gen-placeholders.ps1
param([string]$OutDir = (Join-Path $PSScriptRoot "..\public\content\projects"))

$ErrorActionPreference = "Stop"
try { ffmpeg -version | Out-Null } catch {
  Write-Error "ffmpeg not found on PATH. Install it (e.g. winget install Gyan.FFmpeg) and retry."
  exit 1
}

$slugs = @("neon-dream","static-hymn","chrome-orchard","red-telemetry","void-cartography","tender-machines","glass-harvest","midnight-protocol","saline-throne","copper-lullaby","signal-decay","last-transmission","vhs-eden","night-cartel","pale-circuitry","orpheus-static","rust-choir","hollow-signal","neon-liturgy","ghost-freight","acid-pastoral","terminal-bloom","dead-channel","iron-lullaby","sodium-haze","last-arcade")
$accents = @("C8FF00","FF2E63","B79CFF","FF2E63","C8FF00","EDEDE6","B79CFF","C8FF00","EDEDE6","FF2E63","B79CFF","C8FF00","FF2E63","B79CFF","EDEDE6","C8FF00","FF2E63","B79CFF","C8FF00","EDEDE6","FF2E63","B79CFF","C8FF00","FF2E63","B79CFF","EDEDE6")

function Src([int]$i, [string]$size, [string]$acc) {
  switch ($i % 4) {
    0 { "gradients=s=${size}:speed=0.06:nb_colors=4" }
    1 { "mandelbrot=s=${size}:end_scale=0.08" }
    2 { "testsrc2=s=${size}:rate=24" }
    3 { "life=s=${size}:ratio=0.07:mold=14:life_color=#${acc}:death_color=#0a0a12" }
  }
}

for ($i = 0; $i -lt $slugs.Count; $i++) {
  $slug = $slugs[$i]; $acc = $accents[$i]
  $dir = Join-Path $OutDir $slug
  if (Test-Path (Join-Path $dir "poster.jpg")) { Write-Host "-- $slug (exists, skipped)"; continue }
  New-Item -ItemType Directory -Force (Join-Path $dir "stills") | Out-Null
  $vf = "hue=h=$($i * 33),noise=alls=10:allf=t,format=yuv420p"
  Write-Host ">> $slug"
  ffmpeg -y -loglevel error -f lavfi -i (Src $i "640x360" $acc)  -vf $vf -t 4 -r 24 -c:v libx264 -preset veryfast -crf 27 (Join-Path $dir "preview.mp4")
  ffmpeg -y -loglevel error -f lavfi -i (Src $i "960x540" $acc)  -vf $vf -t 9 -r 24 -c:v libx264 -preset veryfast -crf 26 (Join-Path $dir "hover.mp4")
  ffmpeg -y -loglevel error -f lavfi -i (Src $i "1280x720" $acc) -vf $vf -frames:v 1 -update 1 (Join-Path $dir "poster.jpg")
  foreach ($s in 1..3) {
    ffmpeg -y -loglevel error -ss $s -i (Join-Path $dir "preview.mp4") -frames:v 1 -vf "scale=1280:-2" -update 1 (Join-Path $dir ("stills\0" + $s + ".jpg"))
  }
  if ($slug -eq "saline-throne") {
    ffmpeg -y -loglevel error -f lavfi -i (Src $i "1280x720" $acc) -vf $vf -t 12 -r 24 -c:v libx264 -preset veryfast -crf 24 (Join-Path $dir "film.mp4")
  }
}
Write-Host "done — $($slugs.Count) placeholder projects in $OutDir"

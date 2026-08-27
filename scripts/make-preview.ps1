# Turns one master video into the site's per-project media set.
# Usage: powershell -File scripts/make-preview.ps1 -In "D:\path\master.mov" -Slug my-film
param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string]$Slug,
  [string]$ContentDir
)
$ErrorActionPreference = "Stop"
# NOTE: $ContentDir's default cannot be resolved inline in the param() block above --
# on Windows PowerShell 5.1, $PSScriptRoot reads as empty while evaluating a default
# parameter expression in a script that also has Mandatory parameters (confirmed by
# isolated repro during Task 18 verification). Resolving it here, after binding
# completes, sidesteps the bug without changing the script's documented CLI contract.
if (-not $ContentDir) { $ContentDir = Join-Path $PSScriptRoot "..\public\content\projects" }
try { ffmpeg -version | Out-Null } catch {
  Write-Error "ffmpeg not found on PATH. Install it (winget install Gyan.FFmpeg) and retry."
  exit 1
}
$dir = Join-Path $ContentDir $Slug
New-Item -ItemType Directory -Force (Join-Path $dir "stills") | Out-Null
ffmpeg -y -loglevel error -ss 1 -i $In -frames:v 1 -vf "scale=1280:-2" -update 1 (Join-Path $dir "poster.jpg")
ffmpeg -y -loglevel error -ss 1 -i $In -t 4 -vf "scale=640:-2" -an -r 24 -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p (Join-Path $dir "preview.mp4")
ffmpeg -y -loglevel error -ss 1 -i $In -t 10 -vf "scale=960:-2" -an -r 24 -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p (Join-Path $dir "hover.mp4")
Write-Host "done -> $dir"
Write-Host "Now add the project entry to public\content\projects.json (see HOW-TO-EDIT.md)."

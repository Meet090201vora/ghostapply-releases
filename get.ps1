# GhostApply engine installer for Windows testers.
#
# Users run this one line in PowerShell (also shown inside the app when the
# engine is missing):
#
#   powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/Meet090201vora/ghostapply-releases/main/get.ps1 | iex"
#
# It downloads the GhostApply engine (from the latest public release) into
# %LOCALAPPDATA%\GhostApply\app, sets up the Python environment, and tells the
# desktop app where to find it. Safe to re-run: it keeps the existing
# virtualenv and backend/.env, and re-running updates the engine in place.
#
# NOTE: the canonical copy lives in the private GhostApply repo (scripts/get.ps1)
# and is published to the public ghostapply-releases repo automatically.

$ErrorActionPreference = "Stop"

$PublicRepo = "Meet090201vora/ghostapply-releases"
$EngineUrl = "https://github.com/$PublicRepo/releases/latest/download/ghostapply-engine.zip"
$Data = Join-Path $env:LOCALAPPDATA "GhostApply"
$App = Join-Path $Data "app"

Write-Host "== GhostApply engine installer ==" -ForegroundColor Cyan

# 1. Python 3.11+
$PythonOk = $false
try {
    $Version = (& python --version 2>&1) -join ""
    if ($Version -match "Python 3\.(1[1-9]|[2-9]\d)") { $PythonOk = $true }
} catch {}
if (-not $PythonOk) {
    Write-Host "Python 3.11+ was not found. Installing it with winget..." -ForegroundColor Yellow
    winget install -e --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements
    Write-Host ""
    Write-Host "Python installed. Close this window, open a NEW PowerShell window," -ForegroundColor Yellow
    Write-Host "and run the install command again so Python is on the PATH." -ForegroundColor Yellow
    exit 1
}

# 2. Download the latest engine release
Write-Host "Downloading the GhostApply engine..."
$Zip = Join-Path $env:TEMP "ghostapply-engine.zip"
$Extract = Join-Path $env:TEMP "ghostapply-extract"
Invoke-WebRequest $EngineUrl -OutFile $Zip
Remove-Item $Extract -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive $Zip -DestinationPath $Extract

# The zip contains backend/, frontend/, scripts/ at its root.
$Source = $Extract
if (-not (Test-Path (Join-Path $Extract "backend"))) {
    # Tolerate a single wrapping folder.
    $Source = (Get-ChildItem $Extract -Directory | Select-Object -First 1).FullName
}

# 3. Install into %LOCALAPPDATA%\GhostApply\app, keeping venv and .env
New-Item -ItemType Directory -Force -Path $Data | Out-Null
$KeepVenv = Join-Path $env:TEMP "ghostapply-keep-venv"
$KeepEnv = Join-Path $env:TEMP "ghostapply-keep.env"
Remove-Item $KeepVenv -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path (Join-Path $App ".venv")) { Move-Item (Join-Path $App ".venv") $KeepVenv }
if (Test-Path (Join-Path $App "backend\.env")) { Copy-Item (Join-Path $App "backend\.env") $KeepEnv -Force }
Remove-Item $App -Recurse -Force -ErrorAction SilentlyContinue
Move-Item $Source $App
if (Test-Path $KeepVenv) { Move-Item $KeepVenv (Join-Path $App ".venv") }
if (Test-Path $KeepEnv) { Copy-Item $KeepEnv (Join-Path $App "backend\.env") -Force }

# 4. Python environment + browser
& powershell -ExecutionPolicy Bypass -File (Join-Path $App "scripts\setup.ps1")

# Customer builds always require a license (never ship with LICENSE_REQUIRED=false).
$EnvFile = Join-Path $App "backend\.env"
if (Test-Path $EnvFile) {
    $envText = Get-Content $EnvFile -Raw
    if ($envText -match '(?m)^LICENSE_REQUIRED=') {
        $envText = [regex]::Replace($envText, '(?m)^LICENSE_REQUIRED=.*$', 'LICENSE_REQUIRED=true')
    } else {
        $envText = $envText.TrimEnd() + "`nLICENSE_REQUIRED=true`n"
    }
    Set-Content -Path $EnvFile -Value $envText -NoNewline
}

# 5. Tell the desktop app where the engine lives
Set-Content -Path (Join-Path $Data "install-root.txt") -Value $App -NoNewline

Remove-Item $Zip, $Extract -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "All set!" -ForegroundColor Green
Write-Host "Open GhostApply (or click 'Try again' if it is already open)."

# Alchemist — Windows quick-start (development)
# Checks prerequisites, installs frontend deps if needed, and launches the app in dev mode.
#
# Usage:
#   ./run-windows.ps1
# or double-click run-windows.bat

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Test-Tool($name, $hint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "[X] '$name' not found. $hint" -ForegroundColor Red
        return $false
    }
    Write-Host "[ok] $name" -ForegroundColor Green
    return $true
}

Write-Host "Checking prerequisites..." -ForegroundColor Cyan
$ok = $true
$ok = (Test-Tool "node"  "Install Node.js: https://nodejs.org")            -and $ok
$ok = (Test-Tool "npm"   "npm ships with Node.js: https://nodejs.org")     -and $ok
$ok = (Test-Tool "cargo" "Install Rust (MSVC toolchain): https://rustup.rs") -and $ok

if (-not $ok) {
    Write-Host "`nMissing prerequisites above. Tauri on Windows also needs the" -ForegroundColor Yellow
    Write-Host "Microsoft C++ Build Tools (MSVC) and the WebView2 Runtime" -ForegroundColor Yellow
    Write-Host "(WebView2 ships with Windows 11 by default)." -ForegroundColor Yellow
    exit 1
}

# WebView2 best-effort check (non-fatal — present by default on Windows 11)
$wv2 = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
if (-not (Test-Path $wv2)) {
    Write-Host "[warn] WebView2 Runtime not detected. If the window fails to open, install it:" -ForegroundColor Yellow
    Write-Host "       https://developer.microsoft.com/microsoft-edge/webview2/" -ForegroundColor Yellow
}

if (-not (Test-Path "node_modules")) {
    Write-Host "`nInstalling frontend dependencies (npm install)..." -ForegroundColor Cyan
    npm install
}

Write-Host "`nLaunching Alchemist (npm run tauri dev)..." -ForegroundColor Cyan
npm run tauri dev

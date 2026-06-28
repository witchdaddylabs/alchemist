# Alchemist — Windows build (distributable executable + installer)
# Produces a standalone Alchemist.exe and an NSIS installer.
#
# Output:
#   src-tauri/target/release/Alchemist.exe
#   src-tauri/target/release/bundle/nsis/Alchemist_<version>_x64-setup.exe
#
# Usage:
#   ./build-windows.ps1

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

foreach ($tool in @("node", "npm", "cargo")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Host "[X] '$tool' not found. See run-windows.ps1 for prerequisite setup." -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies (npm install)..." -ForegroundColor Cyan
    npm install
}

Write-Host "Building Alchemist (npm run tauri build)..." -ForegroundColor Cyan
npm run tauri build

Write-Host "`nBuild complete. Artifacts:" -ForegroundColor Green
Write-Host "  src-tauri\target\release\Alchemist.exe"
Write-Host "  src-tauri\target\release\bundle\nsis\"

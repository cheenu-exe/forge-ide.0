#!/usr/bin/env pwsh
# Start the Forge IDE frontend (Next.js dev server)
# Usage: .\start-frontend.ps1 [port]

param(
    [int]$Port = 4028
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }

Write-Host "=== Forge IDE Frontend ===" -ForegroundColor Cyan
Write-Host "Starting on port $Port..." -ForegroundColor Cyan

# Check Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "ERROR: Node.js not found. Please install Node.js 18+." -ForegroundColor Red
    exit 1
}

# Install npm dependencies if needed
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    Set-Location $ProjectRoot
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install failed." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Starting frontend on http://localhost:$Port ..." -ForegroundColor Green
Set-Location $ProjectRoot
npx next dev -p $Port

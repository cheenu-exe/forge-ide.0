#!/usr/bin/env pwsh
# Start the Forge IDE backend server
# Usage: .\start-backend.ps1 [port]

param(
    [int]$Port = 8000
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }

Write-Host "=== Forge IDE Backend ===" -ForegroundColor Cyan
Write-Host "Starting on port $Port..." -ForegroundColor Cyan

# Check Python
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "ERROR: Python not found. Please install Python 3.10+." -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
$reqFile = Join-Path $ProjectRoot "backend" "requirements.txt"
$depsInstalled = $false
try {
    python -c "import fastapi, uvicorn, pydantic" 2>$null
    $depsInstalled = $true
} catch {}

if (-not $depsInstalled) {
    Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
    python -m pip install -r $reqFile
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Starting backend on http://localhost:$Port ..." -ForegroundColor Green
Set-Location $ProjectRoot
python -m uvicorn backend.main:app --host 0.0.0.0 --port $Port --log-level info

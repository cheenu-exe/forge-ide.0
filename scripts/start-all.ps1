#!/usr/bin/env pwsh
# Start both Forge IDE backend and frontend
# Usage: .\start-all.ps1

$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "      Forge IDE - Starting All Services   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "ERROR: Python not found. Please install Python 3.10+." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Python found: $(python --version)" -ForegroundColor Green

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "ERROR: Node.js not found. Please install Node.js 18+." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js found: $(node --version)" -ForegroundColor Green

# Install Python deps if needed
try {
    python -c "import fastapi" 2>$null
} catch {
    Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
    Set-Location $ProjectRoot
    python -m pip install -r (Join-Path $ProjectRoot "backend" "requirements.txt")
}

# Install npm deps if needed
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    Set-Location $ProjectRoot
    npm install
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Starting backend on http://localhost:8000" -ForegroundColor Green
Write-Host "  Starting frontend on http://localhost:4028" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectRoot

# Start backend
$backendJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location $root
    python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
} -ArgumentList $ProjectRoot

Start-Sleep -Seconds 3

# Start frontend
$frontendJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location $root
    npx next dev -p 4028
} -ArgumentList $ProjectRoot

Write-Host "Services starting up..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Frontend: http://localhost:4028" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services." -ForegroundColor Yellow

try {
    # Wait for either job to complete or user to press Ctrl+C
    while ($true) {
        $completed = Receive-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
        if ($completed) {
            Write-Host $completed -ForegroundColor Red
            break
        }
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host "`nShutting down..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "All services stopped." -ForegroundColor Green
}

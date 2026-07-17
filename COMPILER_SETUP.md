# Forge IDE - Code Compiler & Execution Platform

> **Status**: ✅ Production ready — local code compilation and execution

## Overview

Forge IDE is a web-based integrated development environment with:

- **Monaco Editor** (VS Code's editor) with syntax highlighting for 9 languages
- **Multi-language execution** via local compilers/runtimes
- **Dark/Light themes** with customizable font sizes
- **Panel-based layout** with resizable editor, input, and output panels
- **FastAPI backend** with Docker support (optional)

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Browser UI  │────▶│  Next.js 15.5    │────▶│  FastAPI       │
│  (Monaco)    │     │  (Port 4028)     │     │  (Port 8000)   │
│              │◀────│  API Proxy       │◀────│  CodeExecutor  │
└──────────────┘     └──────────────────┘     └────────────────┘
                                                       │
                                                       ▼
                                               Local Subprocess
                                               (Python, Node.js,
                                                g++, javac, etc.)
```

The frontend proxies `/api/compiler/*` requests to the FastAPI backend running on port 8000.

## Quick Start

### 1. Install Dependencies

```powershell
# Backend
cd backend
python -m pip install -r requirements.txt

# Frontend
npm install
```

### 2. Start Services

**Option A: Start both (recommended)**

```powershell
.\scripts\start-all.ps1
```

**Option B: Start individually**

```powershell
# Terminal 1: Backend
.\scripts\start-backend.ps1

# Terminal 2: Frontend
.\scripts\start-frontend.ps1
```

**Option C: Manual start**

```powershell
# Terminal 1: Backend
cd forge-ide
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd forge-ide
npx next dev -p 4028
```

### 3. Open the IDE

Open **http://localhost:4028** in your browser.

## Supported Languages

| Language   | Requires         | Status                     |
| ---------- | ---------------- | -------------------------- |
| Python 3   | (built-in)       | ✅ Always available        |
| JavaScript | `node`           | ✅ Always available        |
| C++        | `g++`            | ⬜ Requires MinGW/GCC      |
| C          | `gcc`            | ⬜ Requires MinGW/GCC      |
| Java       | `javac` + `java` | ⬜ Requires JDK            |
| Go         | `go`             | ⬜ Requires Go toolchain   |
| Rust       | `rustc`          | ⬜ Requires Rust toolchain |
| PHP        | `php`            | ⬜ Requires PHP CLI        |
| C#         | `dotnet`         | ⬜ Requires .NET SDK       |

Languages without required runtimes are hidden from the language selector. The backend auto-detects what's available.

## API Endpoints

### `POST /api/execute`

Execute user code and return results.

```json
{
  "language": "python",
  "code": "print('Hello, World!')",
  "stdin": "",
  "timeLimit": 30
}
```

Response:

```json
{
  "stdout": "Hello, World!\n",
  "stderr": "",
  "exitCode": 0,
  "executionTime": 45,
  "memoryUsage": 0,
  "status": "success",
  "compilationOutput": ""
}
```

Status codes: `success` | `compile_error` | `runtime_error` | `tle`

### `GET /api/languages`

List supported languages with availability status.

### `GET /api/health`

Runtime health check with engine status.

## Configuration

Set these environment variables to customize:

| Variable                        | Default                     | Description                    |
| ------------------------------- | --------------------------- | ------------------------------ |
| `BACKEND_PORT`                  | `8000`                      | Backend server port            |
| `BACKEND_ALLOWED_ORIGINS`       | `http://localhost:4028,...` | CORS origins (comma-separated) |
| `EXECUTION_ENGINE`              | `auto`                      | `auto`, `local`, or `docker`   |
| `EXECUTION_TIMEOUT_SECONDS`     | `30`                        | Default execution timeout      |
| `EXECUTION_MAX_TIMEOUT_SECONDS` | `60`                        | Maximum allowed timeout        |
| `EXECUTION_MEMORY_LIMIT_MB`     | `512`                       | Docker memory limit            |
| `COMPILER_BACKEND_URL`          | `http://127.0.0.1:8000`     | Backend URL for frontend proxy |

## Project Structure

```
forge-ide/
├── backend/               # FastAPI backend
│   ├── config.py          # Language configs & settings
│   ├── executor.py        # Code execution engine
│   ├── main.py            # FastAPI application
│   └── requirements.txt   # Python dependencies
├── src/                   # Next.js frontend
│   ├── app/
│   │   ├── api/compiler/  # API proxy routes
│   │   ├── components/    # React components
│   │   └── utils/         # Types & configs
│   └── styles/            # CSS/Tailwind
├── scripts/               # Startup scripts
│   ├── start-all.ps1      # Start both services
│   ├── start-backend.ps1  # Start backend only
│   └── start-frontend.ps1 # Start frontend only
└── package.json           # Node dependencies
```

## Troubleshooting

### Backend won't start

```powershell
# Check if port 8000 is in use
Get-NetTCPConnection -LocalPort 8000

# Kill the process
Stop-Process -Id <PID> -Force
```

### Frontend can't connect to backend

- Ensure backend is running on port 8000
- Check browser console for network errors (F12)
- Verify `COMPILER_BACKEND_URL` env var if set

### Language not showing in editor

- The backend auto-detects available runtimes
- Only languages with installed compilers are shown
- Run `python -c "from backend.main import app; print('OK')"` from project root to test imports

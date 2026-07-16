# Forge Compiler

Forge Compiler is a full-stack online coding workspace built with Next.js, Monaco Editor, and a FastAPI execution backend. The frontend now talks to the backend through same-origin API routes, the backend detects which runtimes are actually available, and the production build is clean.

## What is fixed

- Production `start` now runs `next start` instead of `next dev`
- Frontend execution requests go through `/api/compiler/*` proxy routes instead of hardcoded browser `localhost` calls
- Backend imports are packaged correctly under `backend.*`
- Runtime discovery is real, so unsupported languages are hidden from the language picker
- Type generation, linting, and production builds now pass
- Editor run/save shortcuts are wired all the way through
- Workspace theme, drafts, input, and font size are persisted locally

## Supported languages

- C++
- C
- Python
- Java
- JavaScript
- Go
- Rust
- PHP

The backend will automatically report which of these are available on the current machine.

## Local development

1. Install frontend dependencies:

   ```bash
   npm install
   ```

2. Install backend dependencies:

   ```bash
   python -m pip install -r backend/requirements.txt
   ```

3. Start the backend:

   ```bash
   npm run backend:dev
   ```

4. Start the frontend:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:4028`

## Useful scripts

- `npm run dev` starts the Next.js app on port `4028`
- `npm run backend:dev` starts the FastAPI backend on port `8000`
- `npm run lint` runs ESLint with the current flat config
- `npm run type-check` regenerates Next route types and runs TypeScript
- `npm run build` performs a clean production build
- `npm run start` serves the production Next.js build on port `4028`

## Environment variables

Copy `.env.example` and adjust values as needed.

- `COMPILER_BACKEND_URL` points the Next.js server routes at the backend
- `BACKEND_ALLOWED_ORIGINS` controls backend CORS
- `EXECUTION_ENGINE` can be `auto`, `local`, or `docker`
- `EXECUTION_TIMEOUT_SECONDS` sets the default time limit
- `EXECUTION_MAX_TIMEOUT_SECONDS` sets the maximum accepted time limit
- `EXECUTION_MEMORY_LIMIT_MB` sets the Docker memory cap when Docker execution is enabled
- `EXECUTION_CPU_LIMIT` sets the Docker CPU limit when Docker execution is enabled
- `EXECUTION_PID_LIMIT` sets the Docker process limit when Docker execution is enabled

## Deployment

### Frontend

The Next.js app builds as a standalone server:

```bash
npm run build
npm run start
```

### Backend

Run the FastAPI service with:

```bash
npm run backend:start
```

### Docker Compose

For container deployment on a Linux host with a Docker daemon available:

```bash
docker compose up --build
```

The backend container mounts `/var/run/docker.sock` so it can launch short-lived language runtime containers when `EXECUTION_ENGINE=docker`.

## API surface

- Frontend proxy routes:
  - `GET /api/compiler/health`
  - `GET /api/compiler/languages`
  - `POST /api/compiler/execute`
- Backend routes:
  - `GET /`
  - `GET /api/health`
  - `GET /api/languages`
  - `POST /api/execute`

## Verification

The project has been verified with:

- `npm run lint`
- `npm run type-check`
- `npm run build`
- Local backend execution for Python and JavaScript

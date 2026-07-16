import { NextResponse } from 'next/server';

const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000';

function getBackendBaseUrl() {
  const configured = process.env.COMPILER_BACKEND_URL?.trim();
  if (!configured) {
    return DEFAULT_BACKEND_URL;
  }

  return configured.endsWith('/') ? configured : `${configured}/`;
}

function buildBackendUrl(pathname: string) {
  return new URL(pathname.replace(/^\//, ''), getBackendBaseUrl()).toString();
}

export async function proxyCompilerRequest(pathname: string, request?: Request) {
  const body = request ? await request.text() : undefined;

  try {
    const response = await fetch(buildBackendUrl(pathname), {
      method: request?.method ?? 'GET',
      headers: {
        'content-type': request?.headers.get('content-type') ?? 'application/json',
      },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });

    const contentType = response.headers.get('content-type') ?? 'application/json';
    const payload = await response.text();

    return new NextResponse(payload, {
      status: response.status,
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : 'Compiler backend could not be reached.';

    return NextResponse.json(
      {
        detail,
      },
      {
        status: 503,
        headers: {
          'cache-control': 'no-store',
        },
      }
    );
  }
}

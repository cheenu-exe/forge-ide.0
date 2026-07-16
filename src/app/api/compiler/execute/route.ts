import { proxyCompilerRequest } from '../_lib/backendProxy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return proxyCompilerRequest('/api/execute', request);
}

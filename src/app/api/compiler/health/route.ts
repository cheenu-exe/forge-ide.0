import { proxyCompilerRequest } from '../_lib/backendProxy';

export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyCompilerRequest('/api/health');
}

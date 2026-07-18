import { NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';

function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

export async function POST(request: Request) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'GITHUB_TOKEN environment variable is not set. Add it in Vercel dashboard → Settings → Environment Variables.' },
      { status: 400 }
    );
  }

  let body: { repoUrl?: string; fileName?: string; code?: string; overwrite?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { repoUrl, fileName, code, overwrite } = body;
  if (!repoUrl || !fileName || code === undefined) {
    return NextResponse.json({ error: 'repoUrl, fileName, and code are required' }, { status: 400 });
  }

  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid GitHub repository URL' }, { status: 400 });
  }

  const { owner, repo } = parsed;
  const path = fileName.startsWith('/') ? fileName.slice(1) : fileName;
  const apiUrl = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
  };

  // Check if file already exists
  const existingRes = await fetch(apiUrl, {
    method: 'GET',
    headers: { ...headers, 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (existingRes.status === 200) {
    const existing = await existingRes.json();
    if (!overwrite) {
      return NextResponse.json(
        { conflict: true, sha: existing.sha, message: `File "${fileName}" already exists in ${owner}/${repo}. Send overwrite=true to replace.` },
        { status: 409 }
      );
    }
    // Update existing file
    const updateRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Update ${path}`,
        content: Buffer.from(code).toString('base64'),
        sha: existing.sha,
      }),
    });

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({ message: updateRes.statusText }));
      return NextResponse.json({ error: err.message || 'Failed to update file' }, { status: updateRes.status });
    }

    const data = await updateRes.json();
    return NextResponse.json({ success: true, action: 'updated', url: data.content.html_url });
  }

  if (existingRes.status !== 404) {
    const err = await existingRes.json().catch(() => ({ message: existingRes.statusText }));
    return NextResponse.json({ error: err.message || 'Failed to check file' }, { status: existingRes.status });
  }

  // Create new file
  const createRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Create ${path}`,
      content: Buffer.from(code).toString('base64'),
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({ message: createRes.statusText }));
    return NextResponse.json({ error: err.message || 'Failed to create file' }, { status: createRes.status });
  }

  const data = await createRes.json();
  return NextResponse.json({ success: true, action: 'created', url: data.content.html_url });
}

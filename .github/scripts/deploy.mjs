import { createHash } from 'crypto';
  import { readFileSync, readdirSync } from 'fs';
  import { join } from 'path';

  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId || !teamId) {
    console.error('Missing env vars: VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID');
    process.exit(1);
  }

  const excluded = new Set(['.git', 'node_modules', 'dist', '.vercel', 'tmp_api', '.env']);

  function collectFiles(dir, prefix = '') {
    const files = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (excluded.has(entry.name)) continue;
      const full = join(dir, entry.name);
      const virt = prefix + entry.name;
      if (entry.isDirectory()) {
        files.push(...collectFiles(full, virt + '/'));
      } else {
        const content = readFileSync(full);
        const sha = createHash('sha1').update(content).digest('hex');
        files.push({ path: virt, content, sha, size: content.length });
      }
    }
    return files;
  }

  const files = collectFiles(process.cwd());
  console.log('Files collected:', files.length);

  let uploaded = 0, cached = 0;
  for (const f of files) {
    const res = await fetch('https://api.vercel.com/v2/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'x-vercel-digest': f.sha,
        'Content-Length': String(f.size),
      },
      body: f.content,
    });
    if (res.status === 409) cached++;
    else if (res.ok) uploaded++;
    else { const t = await res.text(); console.error('Upload failed:', f.path, res.status, t.slice(0,100)); process.exit(1); }
  }
  console.log(`Uploaded: ${uploaded}, Cached: ${cached}`);

  const deployRes = await fetch(`https://api.vercel.com/v13/deployments?teamId=${teamId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'neonbeat-musik',
      project: projectId,
      target: 'production',
      files: files.map(f => ({ file: f.path, sha: f.sha, size: f.size })),
      projectSettings: { framework: 'vite', buildCommand: 'npm run build', outputDirectory: 'dist', nodeVersion: '20.x' },
    }),
  });

  const deploy = await deployRes.json();
  if (!deployRes.ok) { console.error('Deploy failed:', JSON.stringify(deploy)); process.exit(1); }
  console.log('Deployment created:', deploy.id, deploy.url);

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 8000));
    const poll = await fetch(`https://api.vercel.com/v13/deployments/${deploy.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await poll.json();
    console.log('State:', data.readyState);
    if (data.readyState === 'READY') {
      console.log('Deployed:', data.url);
      console.log('Aliases:', data.alias?.join(', '));
      break;
    }
    if (data.readyState === 'ERROR') {
      console.error('Error:', data.errorMessage);
      process.exit(1);
    }
  }
  
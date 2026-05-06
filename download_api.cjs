const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN = 'vcp_4D7ID3IjrWJ41aejZ3Yyn4KZCIOoLurYUzkVfVN58EFNqcVnTF2bfxBN';
const DEPLOYMENT_ID = 'dpl_35Hf88Bq7icTx7p8gfnbk2VdEm4P';

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Authorization: `Bearer ${TOKEN}` } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function downloadFile(uid, destPath) {
  return new Promise((resolve, reject) => {
    const fileUrl = `https://api.vercel.com/v7/deployments/${DEPLOYMENT_ID}/files/${uid}`;
    https.get(fileUrl, { headers: { Authorization: `Bearer ${TOKEN}` } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        https.get(res.headers.location, (redirectRes) => {
          const fileStream = fs.createWriteStream(destPath);
          redirectRes.pipe(fileStream);
          fileStream.on('finish', () => { fileStream.close(); resolve(); });
        }).on('error', reject);
      } else {
        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => { fileStream.close(); resolve(); });
      }
    }).on('error', reject);
  });
}

async function processNode(node, currentPath, relativePath = '') {
  const fullPath = path.join(currentPath, node.name);
  const relPath = path.join(relativePath, node.name);
  
  if (relPath.startsWith('api') && !relPath.startsWith('api/_')) {
    if (node.type === 'file') {
      console.log(`Downloading ${relPath} to tmp_api...`);
      await downloadFile(node.uid, path.join('tmp_api', node.name));
    } else if (node.type === 'directory') {
      for (const child of node.children) {
        await processNode(child, currentPath, relPath);
      }
    }
  } else if (node.type === 'directory') {
      for (const child of node.children) {
        await processNode(child, currentPath, relPath);
      }
  }
}

async function main() {
  console.log('Fetching file list...');
  if (!fs.existsSync('tmp_api')) fs.mkdirSync('tmp_api');
  const files = await fetchJson(`https://api.vercel.com/v6/deployments/${DEPLOYMENT_ID}/files`);
  
  for (const node of files) {
    if (node.name === 'src' && node.type === 'directory') {
      for (const child of node.children) {
        await processNode(child, process.cwd(), '');
      }
    }
  }
  console.log('Download complete!');
}

main().catch(console.error);

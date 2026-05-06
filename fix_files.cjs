const fs = require('fs');
const path = require('path');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Check if it's JSON with a "data" property containing base64
        if (content.startsWith('{"data":"')) {
          const json = JSON.parse(content);
          if (json.data) {
            const decoded = Buffer.from(json.data, 'base64').toString('utf8');
            fs.writeFileSync(fullPath, decoded);
            console.log(`Fixed ${fullPath}`);
          }
        }
      } catch (e) {
        // Ignore JSON parse errors, means it's already a normal file
      }
    }
  }
}

processDirectory('src');

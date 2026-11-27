// Builds a clean static publish directory (`dist/`) containing ONLY public frontend assets
// Prevents Python backend, SQL migrations, and internal reports from being served publicly.
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'dist';
const ASSETS = ['index.html', 'app.js', 'style.css', 'css', 'js'];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const item of ASSETS) {
  if (!fs.existsSync(item)) continue;
  fs.cpSync(item, path.join(OUT, item), { recursive: true });
}

console.log('Clean frontend bundle copied to dist/');

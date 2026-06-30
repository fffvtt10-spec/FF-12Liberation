import { cpSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules', '@3d-dice', 'dice-box', 'dist', 'assets');
const target = join(root, 'public', 'assets', 'dice-box');

if (!existsSync(source)) {
  console.warn('[copy-dice-assets] @3d-dice/dice-box assets not found — run npm install first.');
  process.exit(0);
}

mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
console.log('[copy-dice-assets] Copied dice-box assets to public/assets/dice-box/');

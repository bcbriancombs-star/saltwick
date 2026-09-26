import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = dirname(fileURLToPath(import.meta.url));
const out = resolve(root, '../hippity-hop');
const dev = process.argv.includes('--dev');

rmSync(out, { recursive: true, force: true });
mkdirSync(resolve(out, 'assets'), { recursive: true });
cpSync(resolve(root, 'static'), out, { recursive: true });
cpSync(resolve(root, 'CREDITS.md'), resolve(out, 'CREDITS.md'));

await esbuild.build({
  entryPoints: [resolve(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  target: ['es2020'],
  outfile: resolve(out, 'assets/game.js'),
  legalComments: 'none',
});

console.log(`Built ${out}${dev ? ' (dev)' : ''}`);

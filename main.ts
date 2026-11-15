// Emberfield: Hold the Light — the entry's program.
// Copies game/ and screenshots/ from this repository to the output
// directory and writes /output/dossier.json with buildDossier from
// vendor/makefun-game.ts (the kit's library, copied unchanged).
//
// The output directory is a mounted volume in the grader, so this program
// never removes it: it only creates it and copies into it, like the kit's
// own starter does. (Removing the output directory itself fails on a mount
// point — rmSync throws "Device or resource busy".)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function main(): void {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  if (existsSync(join(root, 'screenshots'))) {
    cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
  }
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log(`wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
}

main();

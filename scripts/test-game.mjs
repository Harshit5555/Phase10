import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
mkdirSync('work',{recursive:true});
await build({entryPoints:['tests/engine.test.ts'],outfile:'work/engine.test.mjs',bundle:true,platform:'node',format:'esm'});
const r=spawnSync(process.execPath,['--test','work/engine.test.mjs'],{stdio:'inherit'});process.exit(r.status??1);

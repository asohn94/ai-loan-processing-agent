import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const options = process.argv.slice(2).filter(arg => arg !== '--strictPort')
  .map(arg => arg === '--host' ? '--hostname' : arg);
const next = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const dev = spawn(process.execPath, [next, 'dev', '--webpack', ...options], {stdio: 'inherit'});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => dev.kill(signal));
dev.on('exit', code => { process.exitCode = code ?? 0; });

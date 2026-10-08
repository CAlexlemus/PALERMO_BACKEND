/**
 * Ejecuta un comando con DB_TARGET forzado (local | railway).
 *
 * Uso:
 *   node scripts/with-db-target.cjs local nest start --watch
 *   node scripts/with-db-target.cjs railway nest start --watch
 */
const { spawn } = require('child_process');

const target = (process.argv[2] || '').toLowerCase();
const commandArgs = process.argv.slice(3);

if (target !== 'local' && target !== 'railway') {
  console.error('Uso: node scripts/with-db-target.cjs <local|railway> <comando...>');
  process.exit(1);
}

if (commandArgs.length === 0) {
  console.error('Falta el comando a ejecutar.');
  process.exit(1);
}

process.env.DB_TARGET = target;

const child = spawn(commandArgs[0], commandArgs.slice(1), {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

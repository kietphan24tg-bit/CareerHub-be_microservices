import { rmSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function parseArgs(argv) {
  const args = {
    service: '',
    mode: 'unit',
    include: [],
    concurrency: undefined
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--service') {
      args.service = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (arg === '--mode') {
      args.mode = argv[index + 1] ?? 'unit';
      index += 1;
      continue;
    }

    if (arg === '--include') {
      args.include.push(argv[index + 1] ?? '');
      index += 1;
      continue;
    }

    if (arg === '--concurrency') {
      args.concurrency = argv[index + 1] ?? undefined;
      index += 1;
    }
  }

  if (!args.service) {
    throw new Error('Missing required --service argument');
  }

  return args;
}

function walkFiles(rootDir) {
  const results = [];
  const entries = readdirSync(rootDir);

  for (const entry of entries) {
    const fullPath = join(rootDir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      results.push(...walkFiles(fullPath));
      continue;
    }

    results.push(fullPath);
  }

  return results;
}

function shouldIncludeFile(filePath, options) {
  const fileName = filePath.split(/[/\\]/).pop() ?? '';
  const isLive = fileName.endsWith('.live.e2e.spec.js');

  if (options.mode === 'unit') {
    return fileName.endsWith('.spec.js') && !isLive;
  }

  if (options.mode === 'live') {
    return isLive;
  }

  if (options.mode === 'smoke') {
    if (options.include.length === 0) {
      return false;
    }

    return options.include.some((name) => fileName === name);
  }

  if (options.mode === 'all') {
    return fileName.endsWith('.spec.js');
  }

  throw new Error(`Unsupported test mode: ${options.mode}`);
}

function runOrThrow(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const repoRoot = resolve(import.meta.dirname, '..');
const options = parseArgs(process.argv.slice(2));
const serviceDir = resolve(repoRoot, options.service);
const distTestDir = resolve(serviceDir, 'dist-test');
const tsconfigSpecPath = resolve(serviceDir, 'tsconfig.spec.json');
const tscEntrypoint = resolve(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');

rmSync(distTestDir, { force: true, recursive: true });
runOrThrow(process.execPath, [tscEntrypoint, '-p', tsconfigSpecPath], serviceDir);

const testFiles = walkFiles(distTestDir).filter((filePath) =>
  shouldIncludeFile(filePath, options)
);

if (testFiles.length === 0) {
  console.error(`No test files matched for ${options.service} (${options.mode})`);
  process.exit(1);
}

const nodeArgs = ['--test'];

if (options.concurrency) {
  nodeArgs.push(`--test-concurrency=${options.concurrency}`);
}

nodeArgs.push(...testFiles);
runOrThrow(process.execPath, nodeArgs, serviceDir);

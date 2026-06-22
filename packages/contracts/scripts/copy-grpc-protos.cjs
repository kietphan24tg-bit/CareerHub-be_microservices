const fs = require('node:fs');
const path = require('node:path');

const sourceRoot = path.join(__dirname, '..', 'src', 'grpc');
const targetRoot = path.join(__dirname, '..', 'dist', 'grpc-protos');

function copyProtoFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const sourcePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      copyProtoFiles(sourcePath);
      continue;
    }

    if (!entry.name.endsWith('.proto')) {
      continue;
    }

    const relativePath = path.relative(sourceRoot, sourcePath);
    const targetPath = path.join(targetRoot, relativePath);

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
}

copyProtoFiles(sourceRoot);
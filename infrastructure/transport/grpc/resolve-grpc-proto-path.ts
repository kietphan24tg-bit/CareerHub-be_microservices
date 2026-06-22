import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const nodeRequire = createRequire(__filename);

export type GrpcServiceName =
  | 'application'
  | 'candidate'
  | 'communication'
  | 'employer'
  | 'iam'
  | 'job';

export function resolveGrpcProtoPath(serviceName: GrpcServiceName): string {
  const contractsRoot = dirname(
    nodeRequire.resolve('@careerhub/contracts/package.json')
  );
  const protoRelativePath = join(
    serviceName,
    'v1',
    `${serviceName}.proto`
  );
  const candidates = [
    join(contractsRoot, 'dist', 'grpc-protos', protoRelativePath),
    join(contractsRoot, 'src', 'grpc', protoRelativePath)
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to locate gRPC proto file for "${serviceName}". Checked: ${candidates.join(', ')}`
  );
}
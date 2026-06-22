export type GrpcServiceClientConfig = {
  deadlineMs: number;
  packageName: string;
  protoPath: string;
  serviceUrl: string;
};

export type InternalGrpcClientOptions = Record<string, GrpcServiceClientConfig>;

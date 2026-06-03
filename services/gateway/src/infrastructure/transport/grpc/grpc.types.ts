export type GatewayGrpcServiceClientConfig = {
  packageName: string;
  protoPath: string;
  serviceUrl?: string;
};

export type GatewayGrpcClientOptions = Record<string, GatewayGrpcServiceClientConfig>;

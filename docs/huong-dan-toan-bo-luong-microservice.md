# Hướng Dẫn Toàn Bộ Luồng Microservice — CareerHub (Học Chi Tiết)

> Tài liệu này tổng hợp **toàn bộ luồng hoạt động** của hệ microservices CareerHub, kèm **code thật** trích từ repo để bạn học sâu các pattern:
> **Clean Architecture · DDD · CQRS · gRPC · RabbitMQ (Outbox + DLQ) · Saga Orchestration · API Gateway · Observability**.
>
> Cách đọc hiệu quả: đọc tuần tự từ Phần 1 → 9. Mỗi pattern đều có (a) **lý thuyết ngắn**, (b) **code thật trong repo**, (c) **giải thích từng dòng**. Phần 9 ghép tất cả lại thành 2 luồng end-to-end hoàn chỉnh.

---

## Mục lục

1. [Tổng quan hệ thống & topology](#1-tổng-quan-hệ-thống--topology)
2. [Kiến trúc phân lớp & cấu trúc monorepo](#2-kiến-trúc-phân-lớp--cấu-trúc-monorepo)
3. [API Gateway — cổng vào duy nhất](#3-api-gateway--cổng-vào-duy-nhất)
4. [gRPC — kênh giao tiếp đồng bộ (sync)](#4-grpc--kênh-giao-tiếp-đồng-bộ-sync)
5. [DDD — Domain-Driven Design](#5-ddd--domain-driven-design)
6. [CQRS — tách Command và Query](#6-cqrs--tách-command-và-query)
7. [RabbitMQ + Outbox + DLQ — kênh bất đồng bộ (async)](#7-rabbitmq--outbox--dlq--kênh-bất-đồng-bộ-async)
8. [Saga — điều phối giao dịch phân tán](#8-saga--điều-phối-giao-dịch-phân-tán)
9. [Hai luồng end-to-end hoàn chỉnh](#9-hai-luồng-end-to-end-hoàn-chỉnh)
10. [Bảng tra cứu file quan trọng](#10-bảng-tra-cứu-file-quan-trọng)

---

## 1. Tổng quan hệ thống & topology

CareerHub là một nền tảng tuyển dụng (giống TopCV/LinkedIn Jobs) được tách thành **8 microservices**, mỗi service sở hữu một **bounded context** và **database Postgres riêng** (database-per-service).

### 1.1 Danh sách service

| Service | HTTP port | gRPC port | Bounded context (chịu trách nhiệm gì) | DB | Hạ tầng đặc thù |
|---|---|---|---|---|---|
| **gateway** | 3000 | — | Cổng vào HTTP duy nhất, auth, định tuyến, rate-limit | không | (stateless) |
| **iam-service** | 3001 | 50051 | Identity, đăng nhập/JWT, session, reset mật khẩu, gửi mail reset | iam_service | RabbitMQ + mail |
| **candidate-service** | 3002 | 50052 | Hồ sơ ứng viên, CV/resume, saved jobs | candidate_service | — |
| **employer-service** | 3003 | 50053 | Hồ sơ công ty, phòng ban | employer_service | — |
| **job-service** | 3004 | 50054 | Tin tuyển dụng (vòng đời job), tìm kiếm | job_service | Redis + Meilisearch |
| **application-service** | 3005 | 50055 | Đơn ứng tuyển, phỏng vấn, offer, ghi chú | application_service | Redis + RabbitMQ |
| **communication-service** | 3006 | 50056 | Notification, gửi mail tuyển dụng | communication_service | RabbitMQ + mail |
| **workflow-service** | 3007 | 50057 | Saga orchestrator (đăng ký candidate/employer) | workflow_service | RabbitMQ recovery |

Hạ tầng dùng chung: **RabbitMQ** (exchange `events`), **Redis** (cache job/dashboard), **Meilisearch** (search job), **Postgres** (mỗi service một DB).

### 1.2 Hai kênh giao tiếp

Đây là điểm cốt lõi cần nắm:

```
┌─────────┐   HTTP/JSON    ┌─────────┐
│ Client  │ ─────────────► │ Gateway │
└─────────┘                └────┬────┘
                                │  gRPC (đồng bộ - request/response)
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
        ┌─────────┐       ┌──────────┐      ┌──────────┐
        │   IAM   │       │   Job    │      │Application│
        └────┬────┘       └────┬─────┘      └────┬─────┘
             │                 │ outbox          │ outbox
             │ publish         ▼                 ▼
             └──────────►  ┌───────────────────────────┐
                           │   RabbitMQ (exchange:events)│  ◄── async, event-driven
                           └──────────────┬──────────────┘
                                          │ consume
                                          ▼
                                  ┌────────────────┐
                                  │ Communication  │ (gửi notification + mail)
                                  └────────────────┘
```

- **gRPC (đồng bộ)**: dùng khi cần **kết quả ngay** với độ trễ thấp — ví dụ Gateway hỏi IAM "token này hợp lệ không?", hoặc Application hỏi Job "tin này còn mở không?".
- **RabbitMQ (bất đồng bộ)**: dùng cho **side-effect không chặn luồng chính** + **eventual consistency** — ví dụ sau khi ứng tuyển thành công, phát event để Communication tạo notification/gửi mail. Producer không cần biết ai nghe.

> Quy tắc vàng: **đọc dữ liệu cross-service → gRPC**; **báo "đã có chuyện xảy ra" → event qua RabbitMQ**.

---

## 2. Kiến trúc phân lớp & cấu trúc monorepo

### 2.1 Monorepo (pnpm workspace)

```
CareerHub-be-microservices/
├── packages/                       # Code dùng chung giữa các service
│   ├── shared-kernel/              # Primitive DDD: AggregateRoot, Entity, ValueObject, DomainEvent...
│   ├── contracts/                  # "Hợp đồng" liên service: .proto (gRPC) + integration events + outbox types
│   ├── nest-common/                # Bootstrap NestJS, config, prisma, errors dùng chung
│   └── broker-ops/                 # CLI vận hành DLQ (peek/replay dead-letter)
├── infrastructure/                 # Hạ tầng dùng chung (transport, outbox, observability)
│   ├── transport/grpc/             # Tiện ích gRPC: proto path, metadata, request-id
│   ├── transport/rabbitmq/         # Publisher, consumer-retry, dead-letter topology
│   ├── outbox/                     # OutboxProcessor (worker polling) dùng chung
│   └── observability/              # Interceptor tracing/logging/metrics cho HTTP & gRPC
├── services/                       # 8 microservices
│   ├── gateway/
│   ├── iam-service/
│   ├── ... (mỗi service tách 4 lớp: presentation/application/domain/infrastructure)
│   └── workflow-service/
└── docker-compose.prod.yml         # Topology production
```

### 2.2 Clean Architecture trong mỗi service

Mỗi service nghiệp vụ chia **4 lớp** theo nguyên tắc **phụ thuộc hướng vào trong** (dependency points inward):

```
presentation/   → gRPC controller (entrypoint), map request ↔ command/query, map lỗi
   │ phụ thuộc vào
application/    → command/query handler, use case, PORT (interface), orchestration
   │ phụ thuộc vào
domain/         → aggregate, value object, domain event, domain error (business rule thuần)
   ▲ được hiện thực bởi
infrastructure/ → ADAPTER: Prisma repository, RabbitMQ publisher/consumer, gRPC client...
```

**Điểm mấu chốt (Dependency Inversion)**: `application/` chỉ khai báo **interface** (gọi là *port*), còn `infrastructure/` cung cấp **implementation** (gọi là *adapter*). Domain không biết gì về Prisma/RabbitMQ/gRPC → dễ test, dễ thay thế hạ tầng.

Ví dụ cây thư mục `application-service` (service phức tạp nhất):

```
services/application-service/src/
├── domain/value-objects/           # ApplicationStatus, InterviewStatus, OfferStatus
├── application/
│   ├── commands/apply-to-job/      # apply-to-job.command.ts + .command-handler.ts
│   ├── queries/get-candidate-application-by-id/
│   ├── ports/                      # application-repository.port.ts (INTERFACE)
│   │   └── transactions/application-write-transaction.port.ts
│   ├── services/application-operations.service.ts   # orchestrator
│   ├── outbox/                     # map domain event → outbox record
│   └── notifications/              # ApplicationNotificationEventFactory
├── infrastructure/
│   ├── database/repositories/prisma-application.repository.ts  # ADAPTER
│   ├── outbox/                     # publisher RabbitMQ
│   └── cache/                      # Redis adapter
└── presentation/grpc/controllers/application.grpc.controller.ts
```

---

## 3. API Gateway — cổng vào duy nhất

Gateway là **service HTTP duy nhất** lộ ra ngoài internet. Nó **stateless** (không DB, không cache, không queue) — chỉ làm nhiệm vụ: nhận HTTP → xác thực → định tuyến sang service nội bộ qua gRPC → trả JSON.

### 3.1 Bootstrap (`main.ts`)

`services/gateway/src/main.ts`:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService</* env types */>);
  const runtimeConfig = getRuntimeConfig(configService);
  const gatewayRuntimeConfig = getGatewayRuntimeConfig(configService);
  const metricsRegistry = app.get<MetricsRegistry>(GATEWAY_METRICS_TOKENS.registry);

  initializeOpenTelemetry(runtimeConfig);            // bật distributed tracing

  if (gatewayRuntimeConfig.corsOrigin) {
    const origins = gatewayRuntimeConfig.corsOrigin.split(',').map((o) => o.trim());
    app.enableCors({
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
      credentials: true,
      methods: ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT'],
      origin: origins.length === 1 && origins[0] === '*' ? '*' : origins
    });
  }

  configureHttpRuntime(app, { metricsRegistry, runtimeConfig }); // gắn logging/metrics/health
  await app.listen(runtimeConfig.port);
}
```

Đặc điểm: chỉ là HTTP app (không `connectMicroservice` như các service khác — vì Gateway không phải gRPC server, nó là gRPC *client*). Header `x-request-id` được cho phép để **truyền request-id xuyên suốt** mọi service (correlation).

### 3.2 Ba lớp Guard toàn cục (theo thứ tự)

Trong `app.module.ts`, Gateway đăng ký 3 `APP_GUARD` chạy lần lượt:

```typescript
{ provide: APP_GUARD, useClass: ThrottlerGuard },        // 1. rate limit
{ provide: APP_GUARD, useClass: GatewayJwtAuthGuard },   // 2. xác thực token
{ provide: APP_GUARD, useClass: GatewayRolesGuard },     // 3. phân quyền theo role
```

#### Guard 2 — Xác thực JWT bằng cách gọi IAM qua gRPC

Đây là minh hoạ rõ nhất việc Gateway **không tự verify JWT** mà uỷ quyền cho IAM (single source of truth):

`services/gateway/src/auth/guards/gateway-jwt-auth.guard.ts`:

```typescript
@Injectable()
export class GatewayJwtAuthGuard implements CanActivate {
  constructor(
    private readonly iamGrpcClient: IamGrpcClient,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Route gắn @Public() thì bỏ qua xác thực (vd: /auth/login, /auth/register)
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      GATEWAY_IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]
    );
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Missing bearer token' });
    }

    // ❗ Gọi gRPC sang IAM để validate token (đồng bộ)
    const response = await this.iamGrpcClient.validateAccessToken(
      { access_token: token },
      request.id // truyền request-id để trace
    );

    if (!response.valid) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid bearer token' });
    }

    // Gắn user đã xác thực vào request để controller dùng
    request.user = { email: response.email, id: response.user_id, role: response.role };
    return true;
  }
}
```

#### Guard 3 — Phân quyền theo role (`@Roles('candidate')`)

`services/gateway/src/auth/guards/gateway-roles.guard.ts`:

```typescript
@Injectable()
export class GatewayRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(GATEWAY_IS_PUBLIC_KEY, [...]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(GATEWAY_ROLES_KEY, [...]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: GatewayAuthenticatedUser }>();
    return request.user ? requiredRoles.includes(request.user.role) : false;
  }
}
```

Các decorator hỗ trợ (đơn giản nhưng quan trọng):

```typescript
export const Public = () => SetMetadata(GATEWAY_IS_PUBLIC_KEY, true);
export const Roles  = (...roles: string[]) => SetMetadata(GATEWAY_ROLES_KEY, roles);
export const CurrentUser = createParamDecorator((_d, ctx) =>
  ctx.switchToHttp().getRequest().user as GatewayAuthenticatedUser | undefined);
```

### 3.3 Controller → Service → orchestration nhiều gRPC

Ví dụ: ứng viên nộp đơn ứng tuyển. Controller mỏng, chỉ map input:

`services/gateway/src/presentation/http/applications/candidate-applications.controller.ts`:

```typescript
@ApiTags('Applications')
@Controller()
@Roles('candidate')                       // chỉ candidate vào được
export class CandidateApplicationsController {
  constructor(private readonly gatewayApplicationsService: GatewayApplicationsService) {}

  @Post('candidate/jobs/:jobId/applications')
  async applyToJob(
    @CurrentUser() user: GatewayAuthenticatedUser,   // lấy user từ guard
    @Param('jobId') jobId: string,
    @Body() dto: ApplyToJobRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayApplicationsService.applyToJob({
        coverLetter: dto.coverLetter,
        identityId: user.id,
        jobId, requestId, resumeId: dto.resumeId
      }),
      message: 'Application submitted successfully'
    };
  }
}
```

Service tầng application của Gateway **điều phối nhiều service** trước khi tạo đơn — minh hoạ rõ "API composition":

`services/gateway/src/application/applications/gateway-applications.service.ts`:

```typescript
@Injectable()
export class GatewayApplicationsService {
  constructor(
    private readonly applicationGrpcClient: ApplicationGrpcClient,
    private readonly candidateGrpcClient: CandidateGrpcClient,
    private readonly jobGrpcClient: JobGrpcClient
  ) {}

  async applyToJob(input: { coverLetter?: string; identityId: string; jobId: string; requestId?: string; resumeId: string; }) {
    // Bước 1: hỏi Job-service tin còn mở không (gRPC)
    const job = await this.jobGrpcClient.getJobForApplication({ job_id: input.jobId }, input.requestId);
    this.ensureJobOpenForApplication(job.status, job.expires_at, job.null_fields ?? []);

    // Bước 2: hỏi Candidate-service resume có tồn tại & thuộc ứng viên không (gRPC)
    await this.candidateGrpcClient.getResumeById(
      { identity_id: input.identityId, resume_id: input.resumeId }, input.requestId
    );

    // Bước 3: gọi Application-service tạo đơn (gRPC)
    const response = await this.applicationGrpcClient.applyToJob({
      candidate_identity_id: input.identityId,
      cover_letter: input.coverLetter,
      employer_identity_id: job.employer_identity_id,
      job_id: input.jobId,
      resume_id: input.resumeId
    }, input.requestId);

    return toGatewayHttpApplicationWriteResponse(response.application);
  }
}
```

> Lưu ý kiến trúc: việc phát **notification/mail** KHÔNG nằm ở Gateway. Gateway chỉ proxy. Application-service mới là nơi ghi DB + ghi outbox + (worker) phát event. Xem Phần 7 & 9.

### 3.4 Sơ đồ luồng request đầy đủ qua Gateway

```
HTTP Request
  → CORS
  → ThrottlerGuard (rate limit: short 10/1s, medium 100/60s)
  → GatewayJwtAuthGuard
       ├─ @Public? → cho qua
       └─ else: gRPC IAM.ValidateAccessToken → gắn request.user = {id,email,role}
  → GatewayRolesGuard (@Roles khớp role?)
  → Controller (@CurrentUser, @Headers x-request-id)
  → Gateway application service
       └─ gọi nhiều gRPC client (Job, Candidate, Application...) — kèm requestId + OTel span
  → map kết quả → HTTP JSON { data, message }
```

---

## 4. gRPC — kênh giao tiếp đồng bộ (sync)

gRPC dùng cho **request/response nội bộ** giữa các service. Contract được định nghĩa trong file `.proto` đặt tập trung tại `packages/contracts/src/grpc/<service>/v1/<service>.proto`, version hoá theo `v1`.

### 4.1 File `.proto` — hợp đồng

`packages/contracts/src/grpc/iam/v1/iam.proto`:

```protobuf
syntax = "proto3";
package careerhub.iam.v1;

service IamService {
  rpc RegisterIdentity (RegisterIdentityRequest) returns (RegisterIdentityResponse);
  rpc ActivateIdentity (ActivateIdentityRequest) returns (ActivateIdentityResponse);
  rpc CancelPendingIdentity (CancelPendingIdentityRequest) returns (CancelPendingIdentityResponse);
  rpc LoginIdentity (LoginIdentityRequest) returns (LoginIdentityResponse);
  rpc ValidateAccessToken (ValidateAccessTokenRequest) returns (ValidateAccessTokenResponse);
  rpc GetCurrentIdentity (GetCurrentIdentityRequest) returns (GetCurrentIdentityResponse);
  // ... refresh, logout, request/reset password
}

message ValidateAccessTokenRequest {
  string access_token = 1;
  string request_id = 2;        // luôn có để trace
}
message ValidateAccessTokenResponse {
  bool valid = 1;
  string user_id = 2;
  string role = 3;
  string email = 4;
}
```

> `application.proto` có tới **34 RPC** (apply, withdraw, interview create/cancel/confirm, offer send/accept/decline, dashboard, recruiter notes...). Mỗi RPC là một "API nội bộ" của service đó.

Mỗi proto đi kèm file TypeScript type sinh sẵn để type-safe (`iam.ts`):

```typescript
export const IAM_GRPC_PACKAGE_NAME = 'careerhub.iam.v1';
export const IAM_GRPC_SERVICE_NAME = 'IamService';

export type ValidateAccessTokenResponse = {
  email: string; role: string; user_id: string; valid: boolean;
};
```

Khi build, script copy `.proto` vào `dist` để runtime load được (`packages/contracts/scripts/copy-grpc-protos.cjs`), và resolver tìm proto path lúc chạy:

`infrastructure/transport/grpc/resolve-grpc-proto-path.ts`:

```typescript
export function resolveGrpcProtoPath(serviceName: GrpcServiceName): string {
  const contractsRoot = dirname(nodeRequire.resolve('@careerhub/contracts/package.json'));
  const protoRelativePath = join(serviceName, 'v1', `${serviceName}.proto`);
  const candidates = [
    join(contractsRoot, 'dist', 'grpc-protos', protoRelativePath),  // ưu tiên bản build
    join(contractsRoot, 'src', 'grpc', protoRelativePath)           // fallback bản source
  ];
  for (const candidate of candidates) if (existsSync(candidate)) return candidate;
  throw new Error(`Unable to locate gRPC proto file for "${serviceName}"`);
}
```

### 4.2 Phía Server — mỗi service vừa là HTTP vừa là gRPC server

`services/candidate-service/src/main.ts`:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(CandidateModule, { bufferLogs: true });
  // ... config, metrics, prisma readiness
  const runtime = configureHttpRuntime(app, { metricsRegistry, readinessChecks: [prismaReadinessCheck], runtimeConfig });
  initializeOpenTelemetry(runtimeConfig);

  // ❗ Gắn thêm transport gRPC vào cùng app
  const grpcMicroservice = app.connectMicroservice<MicroserviceOptions>({
    options: {
      loader: { defaults: true, enums: String, keepCase: true, longs: String, oneofs: true },
      package: CANDIDATE_GRPC_PACKAGE_NAME,                // careerhub.candidate.v1
      protoPath: resolveGrpcProtoPath('candidate'),
      url: candidateRuntimeConfig.grpcCandidateUrl          // 0.0.0.0:50052
    },
    transport: Transport.GRPC
  });
  configureGrpcRuntime(grpcMicroservice, runtime);          // gắn interceptor tracing/log/metrics

  await app.startAllMicroservices();   // chạy gRPC server
  await app.listen(runtimeConfig.port); // chạy HTTP server (health/metrics)
}
```

gRPC controller — mỗi method gắn `@GrpcMethod`, nhận message proto rồi **uỷ quyền cho command/query handler** (đây chính là điểm CQRS gặp gRPC):

`services/candidate-service/src/presentation/grpc/controllers/candidate.grpc.controller.ts`:

```typescript
@Controller()
export class CandidateGrpcController {
  constructor(
    private readonly createCandidateProfileCommandHandler: CreateCandidateProfileCommandHandler,
    // ... các handler khác
  ) {}

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'CreateCandidateProfile')
  async createCandidateProfile(request: CreateCandidateProfileRequest): Promise<CreateCandidateProfileResponse> {
    try {
      const result = await this.createCandidateProfileCommandHandler.execute({
        identityId: request.identity_id,
        fullName: request.full_name,
        phone: request.phone,
        requestId: request.request_id
      });
      return { profile_id: result.id, identity_id: result.identityId };
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);   // map domain error → gRPC status
    }
  }
}
```

### 4.3 Phía Client — gọi service khác

Gateway có một factory tạo gRPC client động (load proto, tạo channel):

`services/gateway/src/infrastructure/transport/grpc/gateway-grpc.client.ts`:

```typescript
@Injectable()
export class GatewayGrpcClient {
  constructor(@Inject(GRPC_CLIENT_OPTIONS) private readonly options: GatewayGrpcClientOptions) {}

  createClient(serviceName: string) {
    const serviceConfig = this.options[serviceName];
    if (!serviceConfig) throw new Error(`Missing gRPC config for service: ${serviceName}`);

    const packageDefinition = loadSync(serviceConfig.protoPath, {
      keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
    });
    const loadedPackage = loadPackageDefinition(packageDefinition) as Record<string, unknown>;

    return {
      metadata: (requestId?: string) => createGrpcMetadata(requestId),  // gắn request-id + trace
      packageDefinition: loadedPackage,
      target: serviceConfig.serviceUrl   // vd: iam-service:50051
    };
  }
}
```

Client cụ thể (IAM) bọc callback gRPC thành Promise + tạo OpenTelemetry span:

`services/gateway/src/infrastructure/transport/grpc/iam-grpc.client.ts`:

```typescript
private invokeUnary<TRequest, TResponse>(methodName, operation, request, requestId?): Promise<TResponse> {
  const { client, metadata } = this.createServiceClient();
  const span = startSpan(`iam.${methodName}`, {
    attributes: { 'rpc.method': methodName, 'rpc.service': IAM_GRPC_SERVICE_NAME, 'rpc.system': 'grpc' },
    kind: SpanKind.CLIENT
  }, context.active());

  return runWithSpanContext(span, context.active(), () =>
    new Promise<TResponse>((resolve, reject) => {
      operation(client, request, metadata(requestId), (error, response) => {
        if (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span.end();
          reject(mapRpcErrorToHttpException(error));  // gRPC status → HTTP exception
          return;
        }
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        resolve(response);
      });
    })
  );
}

async validateAccessToken(request, requestId?): Promise<ValidateAccessTokenResponse> {
  const grpcRequest = { ...request, accessToken: request.access_token, request_id: requestId ?? '' };
  return this.invokeUnary('ValidateAccessToken',
    (client, payload, metadata, cb) => client.ValidateAccessToken(payload, metadata, cb),
    grpcRequest, requestId);
}
```

### 4.4 Interceptor dùng chung (observability)

Server gRPC tự động chạy 3 interceptor (đăng ký 1 lần ở `configureGrpcRuntime`):

`infrastructure/runtime/bootstrap/configure-grpc-runtime.ts`:

```typescript
export function configureGrpcRuntime(target, foundation): void {
  target.useGlobalInterceptors(
    new GrpcTracingInterceptor(),                        // 1. tạo span SERVER, extract trace context
    new GrpcLoggingInterceptor(foundation.logger),       // 2. log start/complete/error + latency
    new GrpcMetricsInterceptor(foundation.metricsRegistry) // 3. Prometheus metrics
  );
}
```

Request-id và trace context được nhét vào **gRPC metadata** và lấy ra ở đầu nhận — nhờ đó một request HTTP có thể được trace xuyên suốt nhiều service:

`infrastructure/transport/grpc/grpc-request-context.ts`:

```typescript
export function createGrpcMetadata(requestId?: string): Metadata {
  const metadata = new Metadata();
  if (requestId) metadata.set(REQUEST_ID_HEADER, requestId);
  propagation.inject(otelContext.active(), metadata, metadataCarrierSetter); // chèn traceparent
  return metadata;
}
```

---

## 5. DDD — Domain-Driven Design

DDD giữ **business rule trong domain layer** thay vì rải vào controller/service. Các primitive nằm ở `packages/shared-kernel`.

### 5.1 Các lớp nền (shared-kernel)

**AggregateRoot** — gốc của một cụm nhất quán, tự gom domain event:

`packages/shared-kernel/src/domain/entities/aggregate.ts`:

```typescript
export abstract class AggregateRoot<Props> extends Entity<Props> {
  #domainEvents: DomainEvent[] = [];

  get domainEvents(): DomainEvent[] { return [...this.#domainEvents]; }

  protected addDomainEvent(domainEvent: DomainEvent | DomainEvent[]): void {
    if (Array.isArray(domainEvent)) this.#domainEvents.push(...domainEvent);
    else this.#domainEvents.push(domainEvent);
  }

  clearDomainEvents(): void { this.#domainEvents = []; }

  pullDomainEvents(): DomainEvent[] {           // lấy + xoá — dùng sau khi persist
    const events = [...this.#domainEvents];
    this.clearDomainEvents();
    return events;
  }
}
```

**Entity** — định danh bất biến, props private, bắt buộc `validate()`:

`packages/shared-kernel/src/domain/entities/entities.ts`:

```typescript
export abstract class Entity<Props> {
  #id: UniqueEntityID;
  readonly #props: Props;
  // ...
  constructor({ id, props, createdAt, updatedAt }: CreateEntityProps<Props>) {
    this.#validateId(id);
    this.#validateProps(props);
    this.#id = id; this.#props = props;
    // ...
    this.validate();                 // mỗi entity tự kiểm bất biến khi tạo
  }
  abstract validate(): void;
  getProps(): Props & BaseEntityProps { return Object.freeze({ ...this.#props, id: this.id, ... }); }
}
```

**ValueObject** — bất biến, so sánh theo giá trị, validate trong constructor:

`packages/shared-kernel/src/domain/entities/value-object.ts`:

```typescript
export abstract class ValueObject<Props> {
  protected readonly props: ValueObjectProps<Props>;
  constructor(props: ValueObjectProps<Props>) {
    this.#validateProps(props);
    this.validate(props);            // rule riêng của từng VO
    this.props = props;
  }
  protected abstract validate(props: ValueObjectProps<Props>): void;
  equals(vo?: ValueObject<Props>): boolean {
    return !!vo && JSON.stringify(this.raw()) === JSON.stringify(vo.raw());
  }
}
```

**DomainEvent** — có metadata correlation/causation/timestamp:

```typescript
export abstract class DomainEvent {
  readonly aggregateId: UniqueEntityID;
  readonly metadata: DomainEventMetadata;
  constructor(props: DomainEventProps) {
    if (!props?.aggregateId) throw new ValidationError('Domain event aggregate id is required');
    this.aggregateId = props.aggregateId;
    this.metadata = { timestamp: props.metadata?.timestamp ?? Date.now(), /* correlationId... */ };
  }
}
```

**DomainError** — lỗi nghiệp vụ có `code` để map ra HTTP/gRPC:

```typescript
export class DomainError extends Error {
  readonly code: string;
  constructor(message: string, options?: DomainErrorOptions) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = options?.code ?? 'DOMAIN_ERROR';
  }
}
```

### 5.2 Aggregate thực tế — `Identity` (IAM)

`services/iam-service/src/domain/aggregates/identity.aggregate.ts`:

```typescript
export class Identity extends AggregateRoot<IdentityProps> {
  private constructor(props: ReconstituteIdentityProps) { super(props); this.propsRef = props.props; }

  // Factory tạo mới — trạng thái khởi đầu là pending_profile
  static register(props: RegisterIdentityProps): Identity {
    return new Identity({
      id: props.id,
      createdAt: props.createdAt ?? new Date(),
      props: {
        acceptedTerms: props.acceptedTerms,
        email: props.email,
        passwordHash: props.passwordHash,
        role: props.role,
        status: IdentityStatus.pendingProfile()
      }
    });
  }

  // Factory dựng lại từ DB
  static reconstitute(props: ReconstituteIdentityProps): Identity { return new Identity(props); }

  // ❗ Hành vi nghiệp vụ, KHÔNG phải setter — có kiểm bất biến
  enable(): void {
    if (this.propsRef.status.isActive()) throw new InvalidIdentityStateError('Identity is already active');
    this.replaceProps({ ...this.propsRef, status: IdentityStatus.active() });
  }
  disable(): void {
    if (this.propsRef.status.isDisabled()) throw new InvalidIdentityStateError('Identity is already disabled');
    this.replaceProps({ ...this.propsRef, status: IdentityStatus.disabled() });
  }
  changePassword(next: PasswordHash): void {
    if (this.propsRef.status.isDisabled()) throw new IdentityDisabledError();
    if (this.propsRef.passwordHash.equals(next)) return;
    this.replaceProps({ ...this.propsRef, passwordHash: next });
  }

  validate(): void {                 // bất biến: mọi props phải là VO hợp lệ
    const p = this.getProps();
    if (p.acceptedTerms !== true) throw new ValidationError('Identity accepted terms must be true');
    if (!(p.email instanceof Email)) throw new ValidationError('Identity email must be an Email value object');
    // ... role, passwordHash, status
  }
}
```

Value object đi kèm tự bảo vệ rule. Ví dụ `IdentityStatus` (state machine của identity):

`services/iam-service/src/domain/value-objects/identity-status.vo.ts`:

```typescript
export const IDENTITY_STATUSES = ['pending_profile', 'active', 'disabled'] as const;

export class IdentityStatus extends ValueObject<string> {
  static pendingProfile() { return new IdentityStatus('pending_profile'); }
  static active()         { return new IdentityStatus('active'); }
  static disabled()       { return new IdentityStatus('disabled'); }

  isActive()         { return this.value === 'active'; }
  isPendingProfile() { return this.value === 'pending_profile'; }
  isDisabled()       { return this.value === 'disabled'; }

  protected validate(props: { value: string }): void {
    if (!IDENTITY_STATUSES.includes(props.value as IdentityStatusValue))
      throw new ValidationError('Identity status is invalid');
  }
}
```

### 5.3 Aggregate phát domain event — `Job` (Job service)

Đây là ví dụ aggregate **state machine + phát event** rõ nhất:

`services/job-service/src/domain/aggregates/job.aggregate.ts`:

```typescript
/**
 * Luật chuyển trạng thái:
 *   draft     --publish--> published
 *   published --close----> closed
 *   closed    --archive--> archived
 *   closed    --reopen---> published
 */
export class Job extends AggregateRoot<JobProps> {
  publish(): void {
    this.transition(['draft', 'closed'], JobStatus.published());
    this.addDomainEvent(new JobPublishedEvent({ aggregateId: this.id }));  // ❗ phát event
  }
  close(): void {
    this.transition(['published'], JobStatus.closed());
    this.addDomainEvent(new JobClosedEvent({ aggregateId: this.id }));
  }
  archive(): void {
    this.transition(['closed'], JobStatus.archived());
    this.addDomainEvent(new JobArchivedEvent({ aggregateId: this.id }));
  }
  reopen(): void {
    this.transition(['closed'], JobStatus.published());
    this.addDomainEvent(new JobReopenedEvent({ aggregateId: this.id }));
  }

  private transition(allowedFrom: JobStatusValue[], next: JobStatus): void {
    if (!this.propsRef.status.isOneOf(allowedFrom))
      throw new InvalidJobStatusTransitionError(this.propsRef.status.value, next.value);
    this.propsRef.status = next;
  }
}
```

> Phân biệt 2 loại event:
> - **Domain event** (vd `JobPublishedEvent`) = sự kiện *nội bộ domain*, sống trong aggregate.
> - **Integration event** (vd `job.published.v1`) = hợp đồng *liên service*, đi qua RabbitMQ (Phần 7). Command handler thường nhận domain event/state-change rồi map sang integration event để ghi outbox.

---

## 6. CQRS — tách Command và Query

CQRS = tách **Command (ghi, đổi state)** khỏi **Query (đọc, không side-effect)**.

> Quyết định kiến trúc của dự án (xem `docs/cqrs-convention.md`): **KHÔNG dùng** `CommandBus`/`QueryBus` của NestJS. Thay vào đó **inject handler trực tiếp** vào controller — đơn giản hơn, ít "ceremony". Cấu trúc thư mục:
> - `application/commands/<flow>/<flow>.command.ts` + `.command-handler.ts`
> - `application/queries/<flow>/<flow>.query.ts` + `.query-handler.ts`

### 6.1 Command handler — `RegisterIdentity` (IAM)

`services/iam-service/src/application/commands/register-identity/register-identity.command-handler.ts`:

```typescript
export class RegisterIdentityCommandHandler {
  constructor(
    private readonly identityRepository: IdentityRepository,   // PORT (interface)
    private readonly writeTransaction: IamWriteTransaction,     // PORT
    private readonly idGenerator: IdGenerator,                  // PORT
    private readonly passwordHasher: PasswordHasher             // PORT
  ) {}

  async execute(command: RegisterIdentityCommand): Promise<RegisterIdentityResult> {
    const email = new Email(command.email);          // tạo VO → validate ngay
    const role = new Role(command.role);
    if (command.acceptedTerms !== true) throw new ValidationError('Identity accepted terms must be true');

    if (await this.identityRepository.existsByEmail(email))
      throw new IdentityAlreadyExistsError(email.value);

    const passwordHash = new PasswordHash(await this.passwordHasher.hash(command.password));

    // ❗ Mọi thay đổi state nằm trong 1 transaction
    return this.writeTransaction.execute(async ({ identityRepository }) => {
      const identity = Identity.register({
        acceptedTerms: command.acceptedTerms,
        email, id: new UniqueEntityID(this.idGenerator.generate()),
        passwordHash, role
      });
      await identityRepository.save(identity);
      const domainEvents = identity.pullDomainEvents();  // lấy event sau khi lưu
      return {
        createdAt: identity.createdAt?.toISOString() ?? new Date().toISOString(),
        domainEvents,
        email: identity.email.value,
        identityId: identity.id.toString(),
        role: identity.role.value,
        status: identity.status.value
      };
    });
  }
}
```

### 6.2 Query handler — `GetCurrentIdentity` (IAM)

`services/iam-service/src/application/queries/get-current-identity/get-current-identity.query-handler.ts`:

```typescript
export class GetCurrentIdentityQueryHandler {
  constructor(private readonly identityRepository: IdentityRepository) {}

  async execute(query: GetCurrentIdentityQuery): Promise<CurrentIdentityResponse> {
    const identityId = query.identityId.trim();
    if (!identityId) throw new ValidationError('Identity id is required');

    const identity = await this.identityRepository.findById(identityId);
    if (!identity) throw new IdentityNotFoundError(identityId);

    return {                          // ❗ chỉ đọc, trả DTO, KHÔNG đổi state
      email: identity.email.value,
      identityId: identity.id.toString(),
      role: identity.role.value,
      status: identity.status.value
    };
  }
}
```

### 6.3 Port & Adapter (Hexagonal)

**Port (interface) trong application** — không biết gì về DB:

`services/iam-service/src/application/ports/identity/identity-repository.port.ts`:

```typescript
export interface IdentityRepository {
  deleteById(identityId: string): Promise<void>;
  existsByEmail(email: Email): Promise<boolean>;
  findByEmail(email: Email): Promise<Identity | null>;
  findById(identityId: string): Promise<Identity | null>;
  save(identity: Identity): Promise<void>;
  update(identity: Identity): Promise<void>;
}
```

**Adapter (Prisma) trong infrastructure** — hiện thực port, dùng mapper domain ↔ persistence:

`services/iam-service/src/infrastructure/database/repositories/prisma-identity.repository.ts`:

```typescript
export class PrismaIdentityRepository implements IdentityRepository {
  constructor(private readonly prismaClient: IamPrismaRepositoryClient) {}

  async findById(identityId: string): Promise<Identity | null> {
    const identity = await this.prismaClient.identity.findUnique({ where: { id: identityId } });
    return identity ? toIdentityDomain(identity) : null;   // record → aggregate
  }
  async save(identity: Identity): Promise<void> {
    await this.prismaClient.identity.create({ data: toIdentityPersistence(identity) }); // aggregate → record
  }
}
```

Mapper (chuyển đổi 2 chiều, dựng lại VO khi đọc):

```typescript
export function toIdentityPersistence(identity: Identity): PrismaIdentityCreateInput {
  return {
    email: identity.email.value,                 // VO → primitive
    id: identity.id.toString(),
    passwordHash: identity.passwordHash.value,
    role: identity.role.value,
    status: identity.status.value,
    // ...
  };
}
export function toIdentityDomain(record: IdentityPersistenceRecord): Identity {
  return Identity.reconstitute({                  // primitive → VO
    id: new UniqueEntityID(record.id),
    props: {
      email: new Email(record.email),
      passwordHash: new PasswordHash(record.passwordHash),
      role: new Role(record.role),
      status: toDomainStatus(record.status),
      acceptedTerms: record.acceptedTerms
    }, /* createdAt, updatedAt */
  });
}
```

### 6.4 Write Transaction — gói nhiều repository + outbox vào 1 giao dịch

`services/iam-service/src/application/ports/transactions/iam-write-transaction.port.ts`:

```typescript
export type IamWriteTransactionContext = {
  authSessionRepository: AuthSessionRepository;
  identityRepository: IdentityRepository;
  outboxRepository: OutboxRepository;             // ❗ outbox cùng transaction
  passwordResetTokenRepository: PasswordResetTokenRepository;
};

export interface IamWriteTransaction {
  execute<T>(work: (context: IamWriteTransactionContext) => Promise<T>): Promise<T>;
}
```

Đây là chìa khoá để Outbox Pattern hoạt động: **ghi business data + ghi outbox record nằm trong cùng 1 DB transaction** → không bao giờ mất event (Phần 7).

---

## 7. RabbitMQ + Outbox + DLQ — kênh bất đồng bộ (async)

Đây là phần "event-driven" của hệ thống. Mục tiêu: phát event đáng tin cậy (không mất, không trùng) mà không chặn luồng chính.

### 7.1 Integration event — hợp đồng async

`packages/contracts/src/events/integration-event.ts`:

```typescript
export type IntegrationEvent<TPayload = Record<string, unknown>> = {
  name: string;          // = routing key, dạng {domain}.{action}.v{n}
  occurredAt: string;
  payload: TPayload;
  requestId?: string;    // để trace
  version: 1;
};
```

Factory + quy ước routing key = chính tên event:

`packages/contracts/src/events/rabbitmq-event.ts`:

```typescript
export type IntegrationEventName = `${string}.v${number}`;

export function createIntegrationEvent<TPayload, TName extends IntegrationEventName>(
  name: TName, payload: TPayload, requestId?: string
): IntegrationEvent<TPayload> & { name: TName } {
  return { name, occurredAt: new Date().toISOString(), payload, requestId, version: 1 };
}

export function toRabbitMqRoutingKey<TName extends IntegrationEventName>(eventName: TName) {
  return eventName;   // routing key === event name
}
```

Ví dụ event cụ thể (`packages/contracts/src/events/iam/iam-password-reset-requested.event.ts`):

```typescript
export const IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME = 'iam.password-reset-requested.v1';
export type IamPasswordResetRequestedPayload = {
  email: string; expiresAt: string; identityId: string; occurredAt: string; resetTokenId: string;
};
```

**Quy ước đặt tên event**: `{domain}.{entity}.{action}.v{version}` — ví dụ:
`iam.password-reset-requested.v1`, `application.created.v1`, `job.published.v1`,
`mail.offer-sent.v1`, `notifications.application-received.v1`.

### 7.2 Outbox Pattern — vì sao cần?

Vấn đề: nếu bạn `commit DB` rồi mới `publish RabbitMQ`, lỡ service chết giữa 2 bước → mất event. Nếu publish trước rồi commit fail → event "ma".

Giải pháp Outbox:
1. Command handler đổi state **+ ghi 1 outbox record** trong **cùng transaction**.
2. Một **worker polling** đọc outbox record `pending`.
3. Worker publish ra RabbitMQ; thành công → đánh dấu `processed`, lỗi → `failed` + lên lịch retry.

Kiểu dữ liệu outbox (`packages/contracts/src/outbox/outbox-record.ts`):

```typescript
export type OutboxStatus = 'pending' | 'processing' | 'processed' | 'failed';
export type OutboxRecord<TPayload = Record<string, unknown>> = {
  id: string; eventName: string; payload: TPayload;
  status: OutboxStatus; retryCount: number;
  occurredAt: string; processingAt?: string; processedAt?: string;
  nextRetryAt?: string; lastError?: string;
};
```

#### Ghi outbox cùng transaction (IAM reset password)

`services/iam-service/src/application/commands/request-password-reset/request-password-reset.command-handler.ts`:

```typescript
await this.writeTransaction.execute(async ({ outboxRepository, passwordResetTokenRepository }) => {
  await passwordResetTokenRepository.invalidateActiveForIdentity(identity.id.toString(), now);
  await passwordResetTokenRepository.create({
    expiresAt, id: resetTokenId, identityId: identity.id.toString(),
    tokenHash: this.tokenService.hashRefreshToken(resetToken)
  });
  // ❗ Ghi outbox cùng transaction với business data
  await outboxRepository.create(
    mapPasswordResetRequestedToOutboxRecord({
      email: identity.email.value, expiresAt: expiresAtIso,
      identityId: identity.id.toString(), occurredAt,
      requestId: command.requestId, resetTokenId
    }, { createId: () => this.idGenerator.generate() })
  );
});
```

### 7.3 Outbox worker — polling loop (dùng chung)

`infrastructure/outbox/outbox.processor.ts` — chạy 3 vòng lặp định kỳ:

```typescript
async onModuleInit(): Promise<void> {
  if (!this.options.publisher.isEnabled()) { this.logger.log(this.options.disabledLogMessage); return; }
  await this.runPublishCycle(); await this.runBacklogCycle(); await this.runCleanupCycle();

  this.pollingTimer = setInterval(() => void this.runPublishCycle(), cfg.outboxPollIntervalMs);   // ~5s
  this.backlogTimer = setInterval(() => void this.runBacklogCycle(), cfg.outboxBacklogIntervalMs); // ~30s
  if (cfg.outboxCleanupEnabled)
    this.cleanupTimer = setInterval(() => void this.runCleanupCycle(), cfg.outboxCleanupIntervalMs); // ~60s
}

async runPublishCycle(): Promise<void> {
  if (this.publishRunning) return;
  this.publishRunning = true;
  try {
    const now = new Date();
    // requeue record kẹt ở 'processing' quá lâu (service chết giữa chừng)
    await this.options.repository.requeueStaleProcessing(new Date(now.getTime() - cfg.outboxStaleProcessingTimeoutMs));
    // requeue record 'failed' đã tới hạn retry
    await this.options.repository.requeueRetryableFailed(now, cfg.outboxMaxRetryCount);

    // claim 1 batch record pending (atomic, lock-free giữa nhiều instance)
    const claimedRecords = await this.options.repository.findAndClaimPendingBatch(now, cfg.outboxBatchSize);

    // publish song song theo concurrency cấu hình
    for (let i = 0; i < claimedRecords.length; i += cfg.outboxPublishConcurrency) {
      await Promise.all(
        claimedRecords.slice(i, i + cfg.outboxPublishConcurrency).map((r) => this.publishClaimedRecord(r))
      );
    }
  } finally { this.publishRunning = false; }
}
```

Publish + retry với **exponential backoff**:

```typescript
private async publishClaimedRecord(record: OutboxRecord): Promise<void> {
  try {
    await this.options.publisher.publish(record);
    await this.options.repository.markProcessed(record.id, new Date());
  } catch (error) {
    await this.options.repository.markFailed(record.id, this.buildFailureRecord(record, error));
  }
}
private buildFailureRecord(record, error): SharedOutboxFailureRecord {
  const retryCount = record.retryCount + 1;
  const shouldRetry = retryCount < cfg.outboxMaxRetryCount;
  return {
    lastError: /* cắt 2000 ký tự */,
    nextRetryAt: shouldRetry
      ? new Date(Date.now() + cfg.outboxRetryDelayMs * Math.pow(2, retryCount - 1))  // 1s,2s,4s,8s...
      : undefined,   // hết retry → để failed vĩnh viễn (cleanup sau 30 ngày)
    retryCount
  };
}
```

**Claim batch chống tranh chấp giữa nhiều instance** — dùng `FOR UPDATE SKIP LOCKED` của Postgres:

`services/iam-service/src/infrastructure/database/repositories/prisma-outbox.repository.ts`:

```typescript
async findAndClaimPendingBatch(processingAt: Date, limit: number): Promise<OutboxRecord[]> {
  const records = await raw.$queryRawUnsafe<OutboxPersistenceRecord[]>(
    `UPDATE outbox
       SET status = 'processing', processing_at = $1
     WHERE id IN (
       SELECT id FROM outbox
       WHERE status = 'pending'
       ORDER BY occurred_at ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED          -- mỗi record chỉ 1 instance lấy, không chờ nhau
     )
     RETURNING *`,
    processingAt, limit
  );
  return records.map(toOutboxRecord);
}
```

### 7.4 Publisher RabbitMQ

`infrastructure/transport/rabbitmq/rabbitmq-outbox.publisher.ts`:

```typescript
async publish(record: OutboxRecord): Promise<void> {
  const channel = await this.getChannel();             // ConfirmChannel (chờ broker ACK)
  const event = isIntegrationEvent(record.payload) ? record.payload : { /* dựng tối thiểu */ };
  const exchange = getRabbitMqExchangeName(this.runtimeConfig, this.exchangeName); // 'events'

  channel.publish(exchange, record.eventName, Buffer.from(JSON.stringify(event)), {
    contentType: 'application/json',
    deliveryMode: this.runtimeConfig.brokerDurable ? 2 : 1,   // 2 = persistent
    headers: createRabbitMqHeaders(event.requestId),         // request-id + traceparent
    messageId: record.id,                                    // dùng cho idempotency
    type: record.eventName                                   // routing key
  });
  await channel.waitForConfirms();                           // ❗ chờ broker xác nhận mới coi là thành công
}
```

Exchange là **topic** `events`, được assert idempotent khi mở channel:

```typescript
await channel.assertExchange(exchange, 'topic', { durable: this.runtimeConfig.brokerDurable });
```

### 7.5 Consumer — tiêu thụ event (Communication service)

`services/communication-service/src/infrastructure/messaging/communication-notification.consumer.ts`:

```typescript
private async startConsumer(): Promise<void> {
  this.connection = await connect(this.runtimeConfig.brokerUrl);
  this.channel = await this.connection.createConfirmChannel();

  // tạo topology: exchange + queue + DLQ
  const topology = await assertRabbitMqParkingDeadLetterTopology(
    this.channel, this.runtimeConfig, OUTBOX_EVENTS_EXCHANGE, NOTIFICATIONS_QUEUE
  );
  // bind queue với pattern "notifications.#" (nghe tất cả notifications.*)
  await this.channel.bindQueue(topology.queue, topology.exchange, NOTIFICATIONS_ROUTING_PATTERN);
  await this.channel.prefetch(this.runtimeConfig.brokerPrefetchCount);    // QoS, vd 10

  const consumeResult = await this.channel.consume(topology.queue,
    (message) => void this.handleMessage(this.channel, message),
    { noAck: false }   // ❗ manual ack
  );
  this.consumerTag = consumeResult.consumerTag;
}
```

Xử lý message — **idempotent + retry + DLQ**:

```typescript
async handleMessage(channel, message): Promise<void> {
  // parse JSON; nếu hỏng → ack & bỏ (không retry vô ích)
  // validate đúng shape; sai → ack & bỏ
  try {
    const outcome = await this.processNotificationEvent(parsed);  // tạo notification nếu chưa có
    channel.ack(message);
  } catch (error) {
    const retryCount = getRabbitMqRetryCount(message);
    if (retryCount < this.maxRetryCount) {
      await republishRabbitMqMessageForRetry(channel, this.runtimeConfig, message, OUTBOX_EVENTS_EXCHANGE, retryCount + 1);
      channel.ack(message);     // republish bản mới + ack bản cũ
    } else if (this.runtimeConfig.brokerDeadLetterEnabled) {
      channel.nack(message, false, false);   // ❗ hết retry → đẩy vào DLQ
    } else {
      channel.nack(message, false, true);    // requeue (không khuyến nghị production)
    }
  }
}

private async processNotificationEvent(event): Promise<NotificationConsumerOutcomeReason> {
  const result = await this.notificationOperationsService.createNotificationIfNew({  // ❗ idempotency
    identityId: event.payload.recipientIdentityId,
    sourceEventId: event.payload.sourceEventId,   // khoá chống trùng
    title: event.payload.title, message: event.payload.message,
    metadataJson: JSON.stringify(event.payload.metadata), type: event.payload.type
  });
  return result.created ? 'created' : 'duplicate';
}
```

### 7.6 Retry có độ trễ (TTL queue) — cho gửi mail

Với gửi mail (lỗi tạm thời như SMTP timeout), dùng **retry queue có TTL** thay vì republish ngay:

`infrastructure/transport/rabbitmq/rabbitmq-consumer-retry.ts`:

```typescript
export async function assertRabbitMqTimedRetryTopology(channel, config, exchange, queue, routingKey, delayStepsMs) {
  for (const delayMs of delayStepsMs) {            // vd [30s, 2m, 10m]
    const retryQueueName = getRabbitMqRetryQueueName(config, queue, delayMs);
    await channel.assertQueue(retryQueueName, {
      durable: config.brokerDurable,
      arguments: {
        'x-dead-letter-exchange': mainExchange,     // hết TTL → quay lại main exchange
        'x-dead-letter-routing-key': routingKey,
        'x-message-ttl': delayMs                    // ❗ message tự "chín" sau delayMs
      }
    });
  }
}
```

Cơ chế: message lỗi → đẩy vào `...retry.30s` (TTL 30s) → hết hạn → RabbitMQ tự dead-letter về main queue → consumer thử lại (với `retry-count` tăng dần). Đây là cách làm **delay retry** không cần scheduler riêng.

### 7.7 Dead Letter Queue (DLQ) — "bãi đỗ" message lỗi

`infrastructure/transport/rabbitmq/rabbitmq-dead-letter-topology.ts`:

```typescript
export async function assertRabbitMqParkingDeadLetterTopology(channel, config, exchange, queue) {
  await channel.assertExchange(topology.exchange, 'topic', { durable: config.brokerDurable });
  if (config.brokerDeadLetterEnabled) {
    await channel.assertExchange(topology.deadLetterExchange, 'topic', { durable: config.brokerDurable });
    await channel.assertQueue(topology.deadLetterQueue, { durable: config.brokerDurable });
    await channel.bindQueue(topology.deadLetterQueue, topology.deadLetterExchange, topology.deadLetterRoutingKey);
    // main queue trỏ dead-letter sang DLQ exchange
    await channel.assertQueue(topology.queue, {
      durable: config.brokerDurable,
      arguments: {
        'x-dead-letter-exchange': topology.deadLetterExchange,
        'x-dead-letter-routing-key': topology.deadLetterRoutingKey
      }
    });
  } else {
    await channel.assertQueue(topology.queue, { durable: config.brokerDurable });
  }
}
```

**Quy ước đặt tên** (`rabbitmq-transport-options.ts`): có prefix theo môi trường.
- Exchange chính: `{prefix}events` (vd `events`)
- Queue: `{prefix}communication.notifications`
- DLQ exchange: `{prefix}dlq.events`
- DLQ queue: `{prefix}dlq.communication.notifications`
- Retry queue: `{prefix}communication.notifications.retry.30s`

**Vận hành DLQ** — package `broker-ops` cung cấp CLI để peek/replay message từ DLQ:

`packages/broker-ops/src/communication-dlq/replay-communication-dlq.ts`:

```typescript
async function replaySingleMessage(topology, message, options, deps): Promise<ReplayResult> {
  const parsed = parseDlqMessage(message, options.routingKey);
  if (options.dryRun) { deps.nack(message, true); return { outcome: 'dry_run', parsed }; }
  try {
    // republish về main exchange với routing key gốc → reprocess
    await deps.publish(topology.exchange, parsed.routingKey, message.content, message.properties);
    deps.ack(message);   // xoá khỏi DLQ
    return { outcome: 'replayed', parsed };
  } catch (error) {
    deps.nack(message, true);   // publish fail → trả lại DLQ
    return { outcome: 'publish_failed', parsed };
  }
}
```

Chạy: `pnpm ops:communication-dlq` hoặc `pnpm ops:iam-email-dlq` (xem `package.json`).

### 7.8 Ai produce / consume event nào?

| Event | Producer | Consumer | Queue |
|---|---|---|---|
| `iam.password-reset-requested.v1` | iam-service | iam-service (mail consumer nội bộ) | `iam.password-reset-mail` |
| `notifications.*` (application-received, interview-scheduled, offer-sent...) | **application-service** | communication-service | `communication.notifications` (bind `notifications.#`) |
| `mail.interview-created.v1`, `mail.offer-sent.v1` | application-service | communication-service (gửi mail) | mail queue |
| `job.published.v1`, `job.closed.v1`... | job-service | (search index / cache) | — |

> Lưu ý quan trọng: **Gateway KHÔNG produce notification event**. Application-service là producer chuẩn (ghi outbox cùng transaction nghiệp vụ). Điều này tránh phụ thuộc đồng bộ cross-service ở producer path.

---

## 8. Saga — điều phối giao dịch phân tán

Khi một thao tác cần **nhiều service** thay đổi state mà không có transaction phân tán (2PC), ta dùng **Saga**: chuỗi bước, mỗi bước có **bước bù trừ (compensation)** để rollback nếu bước sau thất bại.

CareerHub dùng **orchestration saga** (có 1 orchestrator điều khiển, KHÔNG phải choreography). Đặt tại `workflow-service`, dùng cho **đăng ký candidate/employer**.

### 8.1 Vì sao đăng ký cần saga?

Đăng ký 1 ứng viên = 3 bước trên 2 service:
1. **IAM**: tạo identity (`pending_profile`).
2. **Candidate**: tạo hồ sơ ứng viên.
3. **IAM**: kích hoạt identity (`active`).

Nếu bước 2 hoặc 3 fail → phải rollback (xoá hồ sơ + huỷ identity). Đó là việc của saga.

### 8.2 State machine của saga

`services/workflow-service/src/application/saga/registration-saga.types.ts`:

```typescript
export const REGISTRATION_SAGA_STEP_NAMES = {
  registerIdentity: 'REGISTER_IDENTITY',
  createProfile: 'CREATE_PROFILE',
  activateIdentity: 'ACTIVATE_IDENTITY'
} as const;

export type RegistrationSagaStatus =
  | 'PENDING' | 'IN_PROGRESS' | 'RECOVERING' | 'COMPENSATING'
  | 'COMPLETED' | 'FAILED' | 'COMPENSATED' | 'COMPENSATION_FAILED' | 'ABANDONED';
```

Luồng trạng thái:
```
PENDING → IN_PROGRESS → COMPLETED                         (happy path)
          IN_PROGRESS → FAILED → COMPENSATING → COMPENSATED  (rollback)
          (stale)     → RECOVERING                          (worker phục hồi)
          COMPENSATION_FAILED → COMPENSATING                (retry bù trừ)
          ABANDONED                                         (không cứu được)
```

### 8.3 Lưu state saga (Prisma)

`services/workflow-service/prisma/schema.prisma`:

```prisma
model RegistrationSaga {
  id             String  @id @db.VarChar(64)
  flow           String  @db.VarChar(64)         // candidate_registration | employer_registration
  requestId      String? @unique                  // ❗ idempotency key
  status         String  @db.VarChar(64)
  lastStep       String? @map("last_step")
  email          String
  role           String  @db.VarChar(32)
  identityId     String? @unique @map("identity_id")
  profileId      String? @map("profile_id")
  profilePayloadJson String? @map("profile_payload_json")   // để recovery không cần query lại
  failureCode    String? @map("failure_code")
  failureMessage String? @map("failure_message")
  steps          RegistrationSagaStep[]
  @@index([flow, status])
  @@map("registration_sagas")
}

model RegistrationSagaStep {
  id                 String @id @db.VarChar(64)
  sagaId             String @map("saga_id")
  stepName           String @map("step_name")
  status             String                          // PENDING/IN_PROGRESS/COMPLETED/FAILED
  compensationStatus String @default("NOT_REQUIRED") @map("compensation_status")
  attempts           Int    @default(0)
  resultSnapshotJson String? @map("result_snapshot_json")  // lưu identity_id/profile_id trả về
  @@unique([sagaId, stepName])
  @@map("registration_saga_steps")
}
```

### 8.4 Orchestrator — luồng chính

`services/workflow-service/src/application/saga/registration-saga.orchestrator.ts`:

```typescript
private async executeRegistration(input: ExecuteRegistrationInput): Promise<RegistrationSagaExecutionResult> {
  // 0) Idempotency: nếu đã có saga với requestId này → trả kết quả cũ
  const existingSaga = await this.findExistingSaga(input.requestId);
  if (existingSaga) return this.toCompletedResult(existingSaga);

  // 1) Tạo saga record với 3 step
  const saga = await this.registrationSagaRepository.createSaga({
    email: input.email, flow: input.flow, id: this.idGenerator.generate(),
    profilePayload: input.profilePayload, requestId: input.requestId, role: input.role,
    steps: [
      { id: ..., stepName: REGISTRATION_SAGA_STEP_NAMES.registerIdentity },
      { id: ..., stepName: REGISTRATION_SAGA_STEP_NAMES.createProfile },
      { id: ..., stepName: REGISTRATION_SAGA_STEP_NAMES.activateIdentity }
    ]
  });

  // STEP 1 — IAM.RegisterIdentity (gRPC)
  await this.startStep(saga.id, REGISTRATION_SAGA_STEP_NAMES.registerIdentity);
  let identity;
  try {
    identity = await this.iamGrpcClient.registerIdentity(input.registerIdentityRequest, input.requestId);
  } catch (error) {
    await this.failSaga(saga.id, REGISTRATION_SAGA_STEP_NAMES.registerIdentity, error);
    throw error;   // step đầu fail thì chưa có gì để rollback
  }
  await this.completeStep(saga.id, REGISTRATION_SAGA_STEP_NAMES.registerIdentity, { ... });

  // STEP 2 — Candidate/Employer.CreateProfile (gRPC) — có compensation nếu fail
  await this.runCreateProfileStep({ identityId: identity.identity_id, profilePayload: input.profilePayload, ... });

  // STEP 3 — IAM.ActivateIdentity (gRPC) — fail thì bù trừ cả profile lẫn identity
  return this.runActivateIdentityStep({ email: input.email, identityId: identity.identity_id, ... });
}
```

### 8.5 Compensation — rollback ngược thứ tự

Khi 1 bước fail, saga chuyển `COMPENSATING` và bù trừ **ngược thứ tự**:

```typescript
private async resumeCompensation(input: RecoveryCompensationInput): Promise<void> {
  await this.registrationSagaRepository.updateSaga(input.sagaId, { lastStep: input.failedStep, status: 'COMPENSATING' });

  const tasks: Array<Promise<boolean>> = [];
  if (input.compensateProfile) {        // bù trừ profile (nếu đã tạo)
    tasks.push(this.compensateProfileCreation(input.sagaId, input.identityId, input.requestId, input.reason, input.role));
  } else tasks.push(Promise.resolve(true));

  tasks.push(this.compensateIdentityRegistration(input.sagaId, input.identityId, input.requestId, input.reason)); // luôn huỷ identity

  const [profileOk, identityOk] = await Promise.all(tasks);
  await this.finalizeCompensation(input.sagaId, profileOk && identityOk);  // → COMPENSATED / COMPENSATION_FAILED
}

// Bù trừ profile = gọi gRPC xoá hồ sơ (thao tác idempotent)
private async deleteProfileCompensation(identityId, role, requestId?): Promise<boolean> {
  if (role === 'candidate') {
    const res = await this.candidateGrpcClient.deleteCandidateProfileCompensation({ identity_id: identityId }, requestId);
    return res.compensated;
  }
  const res = await this.employerGrpcClient.deleteEmployerProfileCompensation({ identity_id: identityId }, requestId);
  return res.compensated;
}

// Bù trừ identity = gọi IAM huỷ identity đang pending
private async compensateIdentityRegistration(sagaId, identityId, requestId, reason): Promise<boolean> {
  await this.registrationSagaRepository.updateStep(sagaId, REGISTRATION_SAGA_STEP_NAMES.registerIdentity, { compensationStatus: 'IN_PROGRESS' });
  const response = await this.iamGrpcClient.cancelPendingIdentity({ identity_id: identityId }, requestId);
  await this.registrationSagaRepository.updateStep(sagaId, REGISTRATION_SAGA_STEP_NAMES.registerIdentity, {
    compensatedAt: new Date(),
    compensationStatus: response.cancelled ? 'COMPENSATED' : 'FAILED',
    resultSnapshot: { cancelled: response.cancelled }
  });
  return response.cancelled;
}
```

Test minh hoạ thứ tự gọi (forward + compensation ngược):

```typescript
assert.deepEqual(calls, [
  'iam.register',              // STEP 1
  'candidate.createProfile',   // STEP 2
  'iam.activate',              // STEP 3 — FAIL
  'iam.getCurrentIdentity',    // recovery read (kiểm tra downstream)
  'candidate.deleteCompensation',  // bù trừ 2 (ngược thứ tự)
  'iam.cancelPending'          // bù trừ 1
]);
```

### 8.6 Recovery — phục hồi saga "kẹt"

Nếu workflow-service chết giữa chừng, một **recovery processor** polling tìm saga "stale" và resume:

`services/workflow-service/src/infrastructure/recovery/registration-saga-recovery.processor.ts`:

```typescript
async onModuleInit(): Promise<void> {
  if (!this.runtimeConfig.registrationSagaRecoveryEnabled) return;
  await this.runRecoveryCycle();
  this.timer = setInterval(() => void this.runRecoveryCycle(), this.runtimeConfig.registrationSagaRecoveryPollIntervalMs);
}

private async runRecoveryCycle(): Promise<void> {
  const claimed = await this.registrationSagaOrchestrator.recoverStaleSagas({
    limit: this.runtimeConfig.registrationSagaRecoveryBatchSize,
    staleBefore: new Date(Date.now() - this.runtimeConfig.registrationSagaRecoveryStaleAfterMs)
  });
  if (claimed > 0) this.logger.log(`Claimed ${claimed} stale registration saga(s) for recovery`);
}
```

Claim "optimistic lock" để nhiều instance không giẫm chân nhau:

```typescript
const claimResult = await prisma.registrationSaga.updateMany({
  data: { status: nextStatus },
  where: { id: candidate.id, status: candidate.status, updatedAt: candidate.updatedAt }  // chỉ claim nếu chưa ai đổi
});
if (claimResult.count === 1) claimed.push({ ...mapSagaRecord(candidate), status: nextStatus });
```

**Recovery thông minh — verify downstream**: nếu step báo fail nhưng thực ra downstream đã tạo thành công (lỗi mạng lúc trả response), saga đọc lại profile và coi như đã xong, không bù trừ nhầm:

```typescript
private async recoverFailedCreateProfileStep(input): Promise<void> {
  const existingProfile = await this.loadExistingProfile(input.identityId, input.saga.role, input.saga.requestId);
  if (existingProfile) {
    // profile có thật → đánh dấu completed (recoveredByRead) → tiếp tục activate
    await this.completeStep(input.saga.id, REGISTRATION_SAGA_STEP_NAMES.createProfile,
      { profileId: existingProfile.profileId, recoveredByRead: true }, { profileId: existingProfile.profileId });
    await this.runActivateIdentityStep({ ... });
    return;
  }
  // không có thật → bù trừ
  await this.resumeCompensation({ compensateProfile: false, ... });
}
```

### 8.7 Saga được kích hoạt thế nào?

Gateway → workflow-service qua gRPC. Controller workflow nhận request:

`services/workflow-service/src/presentation/grpc/controllers/workflow.grpc.controller.ts`:

```typescript
@GrpcMethod(WORKFLOW_GRPC_SERVICE_NAME, 'RegisterCandidate')
async registerCandidate(request: RegisterCandidateRequest): Promise<RegistrationSagaResponse> {
  try {
    const result = await this.registerCandidateCommandHandler.execute({
      acceptTerms: request.accept_terms, email: request.email,
      fullName: request.full_name, password: request.password, phone: request.phone,
      requestId: request.request_id   // idempotency
    });
    return { email: result.email, identity_id: result.identityId, role: result.role,
             saga_id: result.sagaId, status: result.status };
  } catch (error) { throw mapErrorToWorkflowGrpcException(error); }
}
```

---

## 9. Hai luồng end-to-end hoàn chỉnh

Ghép tất cả pattern lại. Đây là phần đáng học nhất — đọc kỹ để thấy gRPC + DDD + CQRS + Saga + Outbox + RabbitMQ phối hợp.

### 9.1 LUỒNG A — Đăng ký ứng viên (Saga + gRPC)

```
[Client] POST /auth/candidate/register   (email, password, fullName, phone, acceptTerms)
   │
   ▼
[Gateway] AuthController.registerCandidate   (@Public → bỏ qua auth guard)
   │  validate confirmPassword, resolve requestId
   ▼
[Gateway] GatewayAuthService.registerCandidate
   │  gRPC → workflow-service
   ▼
[Workflow] WorkflowGrpcController.RegisterCandidate
   │  → RegisterCandidateCommandHandler → RegistrationSagaOrchestrator
   │
   │  Idempotency: tìm saga theo requestId. Chưa có → tạo saga (3 step) status=IN_PROGRESS
   │
   ├─ STEP 1: gRPC IAM.RegisterIdentity
   │     [IAM] command handler: tạo Identity aggregate (pending_profile), lưu DB
   │     → trả identity_id
   │     saga: step REGISTER_IDENTITY = COMPLETED, lưu identity_id vào snapshot
   │
   ├─ STEP 2: gRPC Candidate.CreateCandidateProfile
   │     [Candidate] tạo CandidateProfile (DDD aggregate), lưu DB → trả profile_id
   │     saga: step CREATE_PROFILE = COMPLETED
   │     │  Nếu FAIL → đọc lại profile (verify). Không có thật → COMPENSATING:
   │     │     gRPC IAM.CancelPendingIdentity (bù trừ step 1) → COMPENSATED → throw
   │
   ├─ STEP 3: gRPC IAM.ActivateIdentity
   │     [IAM] Identity.enable() → status=active, lưu DB
   │     │  Nếu FAIL → COMPENSATING (ngược thứ tự):
   │     │     gRPC Candidate.DeleteCandidateProfileCompensation (xoá hồ sơ)
   │     │     gRPC IAM.CancelPendingIdentity (huỷ identity)
   │     │     → COMPENSATED → throw
   │     saga: step ACTIVATE_IDENTITY = COMPLETED, saga status=COMPLETED
   │
   ▼
[Workflow] trả { saga_id, identity_id, email, role, status: COMPLETED }
   ▼
[Gateway] trả HTTP { data: { userId, email, role }, message: 'Candidate registered successfully' }
```

Nếu workflow-service chết giữa chừng → recovery processor resume saga từ step dở dang (Phần 8.6).

### 9.2 LUỒNG B — Ứng tuyển việc làm (gRPC composition + Outbox + RabbitMQ + Notification)

```
[Client] POST /candidate/jobs/:jobId/applications   (resumeId, coverLetter)  + Bearer token
   │
   ▼
[Gateway] ThrottlerGuard → JwtAuthGuard (gRPC IAM.ValidateAccessToken → request.user)
   │         → RolesGuard (@Roles('candidate'))
   ▼
[Gateway] CandidateApplicationsController.applyToJob → GatewayApplicationsService.applyToJob
   │
   ├─ gRPC Job.GetJobForApplication      → kiểm tra tin còn 'published' & chưa hết hạn
   ├─ gRPC Candidate.GetResumeById        → kiểm tra resume thuộc ứng viên
   └─ gRPC Application.ApplyToJob
        │
        ▼
   [Application] ApplyToJobCommandHandler → ApplicationOperations.applyToJob
        │  - kiểm tra trùng đơn (findByJobAndCandidate)
        │  - writeTransaction.execute:
        │       • tạo Application (status='applied')
        │       • ghi application history
        │       • ❗ ghi OUTBOX record: notifications.application-received.v1
        │           (CÙNG transaction với business data)
        │  - commit
        ▼
   [Application] OutboxProcessor (polling ~5s)
        │  - findAndClaimPendingBatch (FOR UPDATE SKIP LOCKED)
        │  - RabbitMqOutboxPublisher.publish → exchange 'events', routing key 'notifications.application-received.v1'
        │  - waitForConfirms → markProcessed
        ▼
   [RabbitMQ] exchange 'events' (topic) → queue 'communication.notifications' (bind 'notifications.#')
        ▼
   [Communication] CommunicationNotificationConsumer.handleMessage
        │  - parse + validate event
        │  - createNotificationIfNew (idempotent theo sourceEventId)
        │  - ack
        │  (lỗi → republish retry-count++; hết retry → DLQ 'dlq.communication.notifications')
   │
   ▼ (song song, không chặn)
[Gateway] nhận response từ Application.ApplyToJob → trả HTTP { data, message }
```

Điểm cần nhớ:
- **Đọc cross-service** (job còn mở? resume hợp lệ?) → **gRPC đồng bộ**, chặn cho tới khi có kết quả.
- **Báo "đã ứng tuyển"** → **outbox + RabbitMQ bất đồng bộ**, client không phải chờ notification được tạo. Eventual consistency.
- **Atomicity**: business write + outbox write cùng 1 transaction → không bao giờ "ứng tuyển thành công nhưng mất notification".
- **Idempotency 2 lớp**: producer (messageId = outbox id) + consumer (`createNotificationIfNew` theo `sourceEventId`).

---

## 10. Bảng tra cứu file quan trọng

| Chủ đề | File |
|---|---|
| **Topology production** | [docker-compose.prod.yml](../docker-compose.prod.yml) |
| **Gateway bootstrap** | [services/gateway/src/main.ts](../services/gateway/src/main.ts) |
| **Gateway module (DI, guards, gRPC clients)** | [services/gateway/src/app.module.ts](../services/gateway/src/app.module.ts) |
| **JWT auth guard (gọi IAM)** | [services/gateway/src/auth/guards/gateway-jwt-auth.guard.ts](../services/gateway/src/auth/guards/gateway-jwt-auth.guard.ts) |
| **Roles guard** | [services/gateway/src/auth/guards/gateway-roles.guard.ts](../services/gateway/src/auth/guards/gateway-roles.guard.ts) |
| **Gateway gRPC client factory** | [services/gateway/src/infrastructure/transport/grpc/gateway-grpc.client.ts](../services/gateway/src/infrastructure/transport/grpc/gateway-grpc.client.ts) |
| **IAM gRPC client (invokeUnary + span)** | [services/gateway/src/infrastructure/transport/grpc/iam-grpc.client.ts](../services/gateway/src/infrastructure/transport/grpc/iam-grpc.client.ts) |
| **Composition: applyToJob** | [services/gateway/src/application/applications/gateway-applications.service.ts](../services/gateway/src/application/applications/gateway-applications.service.ts) |
| **Proto IAM** | [packages/contracts/src/grpc/iam/v1/iam.proto](../packages/contracts/src/grpc/iam/v1/iam.proto) |
| **Proto Application (34 RPC)** | [packages/contracts/src/grpc/application/v1/application.proto](../packages/contracts/src/grpc/application/v1/application.proto) |
| **Resolve proto path** | [infrastructure/transport/grpc/resolve-grpc-proto-path.ts](../infrastructure/transport/grpc/resolve-grpc-proto-path.ts) |
| **gRPC server bootstrap (candidate)** | [services/candidate-service/src/main.ts](../services/candidate-service/src/main.ts) |
| **gRPC interceptors (đăng ký)** | [infrastructure/runtime/bootstrap/configure-grpc-runtime.ts](../infrastructure/runtime/bootstrap/configure-grpc-runtime.ts) |
| **gRPC metadata / request-id** | [infrastructure/transport/grpc/grpc-request-context.ts](../infrastructure/transport/grpc/grpc-request-context.ts) |
| **shared-kernel: AggregateRoot** | [packages/shared-kernel/src/domain/entities/aggregate.ts](../packages/shared-kernel/src/domain/entities/aggregate.ts) |
| **shared-kernel: ValueObject** | [packages/shared-kernel/src/domain/entities/value-object.ts](../packages/shared-kernel/src/domain/entities/value-object.ts) |
| **Aggregate Identity** | [services/iam-service/src/domain/aggregates/identity.aggregate.ts](../services/iam-service/src/domain/aggregates/identity.aggregate.ts) |
| **Aggregate Job (state + event)** | [services/job-service/src/domain/aggregates/job.aggregate.ts](../services/job-service/src/domain/aggregates/job.aggregate.ts) |
| **Command handler (RegisterIdentity)** | [services/iam-service/src/application/commands/register-identity/register-identity.command-handler.ts](../services/iam-service/src/application/commands/register-identity/register-identity.command-handler.ts) |
| **Query handler (GetCurrentIdentity)** | [services/iam-service/src/application/queries/get-current-identity/get-current-identity.query-handler.ts](../services/iam-service/src/application/queries/get-current-identity/get-current-identity.query-handler.ts) |
| **Repository port** | [services/iam-service/src/application/ports/identity/identity-repository.port.ts](../services/iam-service/src/application/ports/identity/identity-repository.port.ts) |
| **Prisma repository adapter** | [services/iam-service/src/infrastructure/database/repositories/prisma-identity.repository.ts](../services/iam-service/src/infrastructure/database/repositories/prisma-identity.repository.ts) |
| **Integration event base** | [packages/contracts/src/events/integration-event.ts](../packages/contracts/src/events/integration-event.ts) |
| **Outbox record type** | [packages/contracts/src/outbox/outbox-record.ts](../packages/contracts/src/outbox/outbox-record.ts) |
| **Outbox worker (polling loop)** | [infrastructure/outbox/outbox.processor.ts](../infrastructure/outbox/outbox.processor.ts) |
| **RabbitMQ publisher** | [infrastructure/transport/rabbitmq/rabbitmq-outbox.publisher.ts](../infrastructure/transport/rabbitmq/rabbitmq-outbox.publisher.ts) |
| **Notification consumer** | [services/communication-service/src/infrastructure/messaging/communication-notification.consumer.ts](../services/communication-service/src/infrastructure/messaging/communication-notification.consumer.ts) |
| **Consumer retry (TTL queue)** | [infrastructure/transport/rabbitmq/rabbitmq-consumer-retry.ts](../infrastructure/transport/rabbitmq/rabbitmq-consumer-retry.ts) |
| **DLQ topology** | [infrastructure/transport/rabbitmq/rabbitmq-dead-letter-topology.ts](../infrastructure/transport/rabbitmq/rabbitmq-dead-letter-topology.ts) |
| **DLQ replay CLI** | [packages/broker-ops/src/communication-dlq/replay-communication-dlq.ts](../packages/broker-ops/src/communication-dlq/replay-communication-dlq.ts) |
| **Saga orchestrator** | [services/workflow-service/src/application/saga/registration-saga.orchestrator.ts](../services/workflow-service/src/application/saga/registration-saga.orchestrator.ts) |
| **Saga state types** | [services/workflow-service/src/application/saga/registration-saga.types.ts](../services/workflow-service/src/application/saga/registration-saga.types.ts) |
| **Saga schema (Prisma)** | [services/workflow-service/prisma/schema.prisma](../services/workflow-service/prisma/schema.prisma) |
| **Saga recovery processor** | [services/workflow-service/src/infrastructure/recovery/registration-saga-recovery.processor.ts](../services/workflow-service/src/infrastructure/recovery/registration-saga-recovery.processor.ts) |
| **Workflow gRPC controller** | [services/workflow-service/src/presentation/grpc/controllers/workflow.grpc.controller.ts](../services/workflow-service/src/presentation/grpc/controllers/workflow.grpc.controller.ts) |

### Tài liệu liên quan trong `docs/`
- [system-architecture.md](./system-architecture.md) — tổng quan kiến trúc (lưu ý: một số mục "target" nay đã hiện thực).
- [cqrs-convention.md](./cqrs-convention.md) — quy ước CQRS (không dùng Nest bus).
- [outbox-pattern.md](./outbox-pattern.md) — chi tiết outbox.
- [notification-events.md](./notification-events.md) — hợp đồng notification event.
- [recruitment-flow.md](./recruitment-flow.md) + [state-machine.md](./state-machine.md) — nghiệp vụ tuyển dụng & state machine.
- [dlq-operations-runbook.md](./dlq-operations-runbook.md) — vận hành DLQ.

---

## Tóm tắt 10 ý cốt lõi để nhớ

1. **Gateway** là cổng HTTP stateless duy nhất; xác thực bằng cách gọi **gRPC IAM.ValidateAccessToken**, không tự verify JWT.
2. **Hai kênh**: gRPC (đồng bộ, đọc/ghi cần kết quả ngay) vs RabbitMQ (bất đồng bộ, side-effect, eventual consistency).
3. **Clean Architecture 4 lớp** + **Dependency Inversion**: application khai báo *port*, infrastructure cấp *adapter*.
4. **DDD**: business rule nằm trong **aggregate/value object**; state đổi qua **hành vi có kiểm bất biến**, không phải setter.
5. **CQRS nhẹ**: command (ghi) / query (đọc) handler inject trực tiếp, không dùng Nest CommandBus.
6. **Outbox Pattern**: ghi business data + outbox record trong **cùng transaction**; worker polling publish → không mất event.
7. **`FOR UPDATE SKIP LOCKED`** cho phép nhiều instance outbox/recovery chạy song song an toàn.
8. **Retry**: producer dùng exponential backoff trong DB; consumer dùng **TTL retry queue**; hết retry → **DLQ**.
9. **Idempotency** ở cả producer (messageId) lẫn consumer (`sourceEventId` / claim token).
10. **Saga orchestration** (workflow-service) cho đăng ký: 3 step gRPC, **compensation ngược thứ tự**, **recovery** cho saga kẹt, **idempotency** theo `requestId`.

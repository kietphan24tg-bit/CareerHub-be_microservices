# Quan Sát Hệ Thống Local

Cấu hình runtime cho observability được tập trung tại `infrastructure/runtime/config`.
Mỗi service nên giữ cùng một bộ cấu hình local cơ bản:

- `LOG_FILE_PATH=../../tmp/logs/<service>.jsonl`
- `HEALTH_ENABLED=true`
- `HEALTH_PATH=/health`
- `HEALTH_LIVENESS_PATH=/health/live`
- `HEALTH_READINESS_PATH=/health/ready`
- `METRICS_ENABLED=true`
- `METRICS_PATH=/metrics`
- `OTEL_ENABLED=true`
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318/v1/traces`

## Mỗi Thành Phần Dùng Để Làm Gì

- `Prometheus`: đi scrape metrics từ endpoint `/metrics` của từng service
- `Loki`: lưu trữ logs
- `Promtail`: đọc `tmp/logs/*.jsonl` rồi đẩy logs sang Loki
- `Tempo`: nhận traces theo chuẩn OTLP từ các service
- `Grafana`: đọc dữ liệu từ Prometheus, Loki, Tempo để hiển thị dashboard, logs, traces

Luồng dữ liệu:

- Metrics: service -> `/metrics` -> Prometheus -> Grafana
- Logs: service -> `tmp/logs/*.jsonl` -> Promtail -> Loki -> Grafana
- Traces: service -> OTLP `:4318` -> Tempo -> Grafana

## Chạy Các Service Ứng Dụng

Khởi động các service ứng dụng trên máy host:

```powershell
pnpm --filter @careerhub/iam-service start
pnpm --filter @careerhub/candidate-service start
pnpm --filter @careerhub/employer-service start
pnpm --filter @careerhub/job-service start
pnpm --filter @careerhub/gateway start
```

Mỗi service sau khi chạy cần:

- ghi log JSON vào `tmp/logs/*.jsonl`
- mở endpoint `/health`
- mở endpoint `/health/live`
- mở endpoint `/health/ready`
- mở endpoint `/metrics`

Nếu bạn thay đổi `HEALTH_*` hoặc `METRICS_PATH`, hãy cập nhật lại local stack config cho khớp.

## Stack Observability

Cấu hình stack nằm trong `infrastructure/observability/stack/`.

Khởi động stack observability local:

```powershell
pnpm observability:up
```

Dừng stack:

```powershell
pnpm observability:down
```

Các endpoint:

- Grafana: `http://127.0.0.1:3300`
- Prometheus: `http://127.0.0.1:9092`
- Loki: `http://127.0.0.1:3100`
- Tempo: `http://127.0.0.1:3200`

Kết nối hiện tại của stack:

- Prometheus scrape từng service qua `/metrics`
- Prometheus cũng scrape `prometheus`, `loki`, và `tempo` để theo dõi sức khỏe của stack
- Promtail đọc `tmp/logs/*.jsonl`
- Tempo nhận traces OTLP HTTP tại `:4318`
- Tempo cũng mở OTLP gRPC tại `:4317` cho nhu cầu mở rộng sau này
- Grafana tự động tạo datasource cho Prometheus, Loki, và Tempo

Grafana hiện đã được cấu hình sẵn với:

- datasource `Prometheus`
- datasource `Loki`
- datasource `Tempo`
- dashboard `CareerHub Observability`

## Quy Trình Khuyến Nghị Khi Chạy Local

Nên kiểm tra observability theo đúng thứ tự sau:

1. Khởi động stack observability.
2. Khởi động toàn bộ service ứng dụng trên host.
3. Xác nhận các endpoint health và metrics phản hồi bình thường.
4. Gửi ít nhất một request thật đi qua gateway.
5. Kiểm tra metrics trong Prometheus hoặc Grafana.
6. Kiểm tra logs trong Loki.
7. Kiểm tra traces trong Tempo.
8. Dùng `requestId` và `traceId` để nối cùng một request giữa logs và traces.

## Bước 1: Khởi Động Stack

Chạy:

```powershell
pnpm observability:up
```

Mở các endpoint sau:

- Grafana: `http://127.0.0.1:3300`
- Prometheus: `http://127.0.0.1:9092`
- Loki: `http://127.0.0.1:3100`
- Tempo: `http://127.0.0.1:3200`

Những gì cần kiểm tra đầu tiên:

- Grafana mở được
- Grafana hiển thị đủ datasource `Prometheus`, `Loki`, `Tempo`
- dashboard `CareerHub Observability` đã xuất hiện

## Bước 2: Khởi Động Các Service Ứng Dụng

Chạy các service trên host:

```powershell
pnpm --filter @careerhub/iam-service start
pnpm --filter @careerhub/candidate-service start
pnpm --filter @careerhub/employer-service start
pnpm --filter @careerhub/job-service start
pnpm --filter @careerhub/gateway start
```

Mỗi service cần:

- ghi log JSON vào `tmp/logs/*.jsonl`
- mở `/health`
- mở `/health/live`
- mở `/health/ready`
- mở `/metrics`

Kiểm tra nhanh:

- mở `http://127.0.0.1:3000/health`
- mở `http://127.0.0.1:3000/metrics`
- xác nhận các file log xuất hiện trong `tmp/logs`

Nếu bạn thay đổi `HEALTH_*` hoặc `METRICS_PATH`, hãy cập nhật lại local stack config cho khớp.

## Bước 3: Gửi Một Request Thật

Hãy gửi ít nhất một request đi qua gateway để stack có dữ liệu hiển thị.

Ví dụ:

- `POST /auth/login`
- `GET /candidate-profiles/me`
- bất kỳ route gateway nào có gọi xuống service gRPC
- bất kỳ flow hoặc route nào có publish hoặc consume RabbitMQ message

Mục tiêu:

- tạo ra một request có đủ logs, metrics, và traces

## Bước 4: Kiểm Tra Metrics

Đầu tiên, kiểm tra trực tiếp endpoint metrics của app:

- gateway: `http://127.0.0.1:3000/metrics`
- iam: `http://127.0.0.1:3001/metrics`
- candidate: `http://127.0.0.1:3002/metrics`
- employer: `http://127.0.0.1:3003/metrics`

Sau đó kiểm tra trên Grafana:

- mở dashboard `CareerHub Observability`
- xác nhận `HTTP Requests Rate` thay đổi sau khi gọi request qua gateway
- xác nhận `HTTP Errors Rate` thay đổi nếu bạn cố tình tạo request lỗi
- xác nhận `gRPC Requests Rate` thay đổi khi gateway gọi xuống downstream service
- xác nhận các panel RabbitMQ thay đổi khi flow consumer chạy
- xác nhận `Infrastructure Stack Health` vẫn ở trạng thái `Up`

## Bước 5: Kiểm Tra Logs

Mở Grafana Explore và chọn datasource `Loki`.

Một số query hữu ích:

```logql
{job="careerhub"}
```

```logql
{service="careerhub-gateway"}
```

```logql
{service="careerhub-gateway"} |= "traceId"
```

Những gì cần xác nhận:

- logs đã xuất hiện
- có các label như `service`, `level`, `context`
- log line có chứa `requestId` và `traceId`

Lưu ý:

- `service`, `level`, `context` là Loki labels
- `requestId`, `traceId`, `spanId` được giữ trong nội dung log để phục vụ correlation

## Bước 6: Kiểm Tra Traces

Mở Grafana Explore và chọn datasource `Tempo`.

Những gì cần xác nhận:

- traces xuất hiện sau khi bạn gọi request qua gateway
- một trace có cả span của gateway và downstream service nếu flow có gRPC
- trace đó có cùng `traceId` với log liên quan

Tempo hiện nhận traces qua:

- OTLP HTTP: `http://127.0.0.1:4318/v1/traces`
- OTLP gRPC: `127.0.0.1:4317`

## Bước 7: Nối Một Request Từ Đầu Đến Cuối

Chọn một request làm mốc rồi lần theo nó qua cả ba loại dữ liệu.

Quy trình gợi ý:

1. Gửi một request tới gateway.
2. Tìm log line tương ứng trong Loki.
3. Lấy `traceId` từ log line đó.
4. Mở trace tương ứng trong Tempo từ Grafana.
5. Kiểm tra các panel dùng Prometheus để xác nhận counters và latency có thay đổi cùng thời điểm.

Kết quả mong đợi:

- cùng một request xuất hiện trong logs
- cùng một request xuất hiện trong traces
- metrics tổng hợp thay đổi do request đó tạo ra

## Grafana Được Nối Như Thế Nào

Cấu hình Grafana nằm trong `infrastructure/observability/stack/grafana/`.

Các file quan trọng:

- `provisioning/datasources/datasources.yml`
- `provisioning/dashboards/dashboards.yml`
- `dashboards/careerhub-observability.json`

Vai trò của từng file:

- `datasources.yml`: định nghĩa kết nối tới `Prometheus`, `Loki`, và `Tempo`
- `dashboards.yml`: chỉ cho Grafana biết thư mục chứa dashboard JSON
- `careerhub-observability.json`: định nghĩa các panel thực tế của dashboard

Cơ chế correlation:

- datasource Loki trích `traceId` từ log JSON
- Grafana có thể nhảy từ một log line sang trace tương ứng trong Tempo
- datasource Tempo có thể query ngược lại Loki bằng `traceId` để tìm logs liên quan

## Những Gì Cần Xác Minh

1. Gọi một HTTP endpoint của gateway như `/auth/login` hoặc `/candidate-profiles/me`.
2. Xác nhận gateway `/metrics` tăng các HTTP request counters và latency metrics.
3. Xác nhận downstream service `/metrics` tăng các gRPC request counters.
4. Nếu có flow RabbitMQ consumer, hãy publish hoặc consume một message rồi xác nhận RMQ counters và latency metrics thay đổi.
5. Mở Grafana và xác nhận:
   - metrics đã xuất hiện trên dashboard
   - `Infrastructure Stack Health` vẫn là `Up`
   - các panel RabbitMQ có dữ liệu khi consumer xử lý message
   - logs xuất hiện trong Loki với `service`, `level`, `context`
   - traces xuất hiện trong Tempo cho đúng request vừa gọi
6. Dùng `requestId` và `traceId` trong logs để nối gateway và downstream spans.
7. Từ một log line trong Loki có chứa `traceId`, nhảy sang trace tương ứng trong Tempo qua derived field link của Grafana.

## Checklist Luồng End-To-End

- HTTP:
  - gọi một gateway endpoint
  - xác nhận `careerhub_http_requests_total` tăng
  - xác nhận có trace tương ứng trong Tempo
- gRPC:
  - trigger một route gateway có gọi xuống downstream gRPC service
  - xác nhận `careerhub_rpc_requests_total` tăng ở downstream service
  - xác nhận logs và traces có cùng `traceId`
- RabbitMQ:
  - trigger một luồng publish hoặc consume integration-event
  - xác nhận `careerhub_rmq_messages_total` hoặc `careerhub_rmq_errors_total` thay đổi
  - xác nhận log RabbitMQ consumer có `requestId`, `traceId`, và metadata về queue hoặc pattern

## Dừng Stack

```powershell
pnpm observability:down
```

## Quick Start Ports

Use these local ports when the observability stack is running:

- Grafana: `http://127.0.0.1:3300`
- Prometheus: `http://127.0.0.1:9092`
- Loki: `http://127.0.0.1:3100`
- Tempo: `http://127.0.0.1:3200`

Recommended local run order:

1. Run `pnpm observability:up`
2. Start `iam-service`, `candidate-service`, `employer-service`, and `gateway`
3. Call a real gateway flow such as login, register, or profile update
4. Verify metrics in Prometheus/Grafana and logs in Loki

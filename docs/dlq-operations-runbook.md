# DLQ Operations Runbook

Tài liệu hướng dẫn vận hành khi có message vào DLQ.
Áp dụng cho `communication-service` (notification) và `iam-service` (password reset mail).

---

## 1. Khi nào cần dùng runbook này

- Grafana báo `dead_lettered` tăng
- User phản ánh không nhận được notification hoặc email đặt lại mật khẩu
- Thấy `dlq.*` queue có message trong RabbitMQ UI

---

## 2. Kiểm tra nhanh tình trạng DLQ

```bash
# Xem tất cả queue và số message
rabbitmqadmin list queues name messages

# Các queue cần chú ý
# dlq.communication.notifications     → notification bị lỗi
# dlq.iam.password-reset-mail         → email đặt lại mật khẩu bị lỗi
```

---

## 3. Quy trình xử lý DLQ (áp dụng cho cả 2 service)

### Bước 1 — Xác định nguyên nhân

Không replay trước khi biết tại sao message vào DLQ. Replay khi root cause chưa fix sẽ tạo ra DLQ mới ngay lập tức.

Tìm log theo `messageId` hoặc `sourceEventId`:

```bash
# Xem log communication-service
grep "dead-lettered" logs/careerhub-communication-service.jsonl | tail -20

# Xem log iam-service
grep "dead-lettered\|retries exhausted\|not configured" logs/careerhub-iam-service.jsonl | tail -20
```

Grafana → panel **Integration Consumer Outcomes by Reason** → xem `reason` label:

| `reason` | Nguyên nhân |
|---|---|
| `dead_lettered` | Xử lý thất bại sau khi hết retry |
| `config_error` | SMTP chưa cấu hình (iam-service) |
| `retry_exhausted` | Hết số lần retry |

### Bước 2 — Fix nguyên nhân trước

| Nguyên nhân | Cách fix |
|---|---|
| DB không kết nối được | Restore DB, kiểm tra connection pool |
| SMTP lỗi | Kiểm tra `MAIL_HOST`, `MAIL_PORT`, credentials |
| Code bug | Deploy fix trước rồi mới replay |
| Transient network | Đợi ổn định rồi replay |

### Bước 3 — Inspect DLQ (không ack, an toàn)

```bash
# Notification DLQ
pnpm ops:communication-dlq list --count 5

# IAM email DLQ
pnpm ops:iam-email-dlq list --count 5
```

Xem output để xác nhận đúng message cần replay.

### Bước 4 — Dry-run (bắt buộc trước khi replay thật)

```bash
# Notification DLQ
pnpm ops:communication-dlq replay --dry-run --count 1

# IAM email DLQ
pnpm ops:iam-email-dlq replay --dry-run --count 1
```

Dry-run in ra payload nhưng **không publish, không ack** — hoàn toàn an toàn.

### Bước 5 — Replay 1 message trước

```bash
# Notification DLQ
pnpm ops:communication-dlq replay --count 1

# IAM email DLQ
pnpm ops:iam-email-dlq replay --count 1
```

Sau đó kiểm tra log service xem message đã được xử lý thành công chưa.

### Bước 6 — Xác nhận thành công rồi mới replay batch

```bash
# Notification: replay 10 message
pnpm ops:communication-dlq replay --count 10

# IAM email: replay 10 message
pnpm ops:iam-email-dlq replay --count 10
```

Replay một message cụ thể theo messageId:

```bash
pnpm ops:communication-dlq replay --message-id <outbox-record-id>
pnpm ops:iam-email-dlq replay --message-id <outbox-record-id>
```

---

## 4. Các tình huống đặc biệt

### Message không nên replay

| `reason` trong log | Hành động |
|---|---|
| `malformed_payload` | Không replay — message đã bị ack, không còn trong DLQ. Fix producer. |
| `unsupported_payload` | Không replay — fix contract/schema rồi kiểm tra lại. |
| `duplicate_or_in_flight` | Không replay — đây là dedup bình thường. |
| `config_error` (SMTP) | Fix SMTP config trước, sau đó mới replay. |

### Replay xong nhưng notification không tạo mới

Đây là **hành vi bình thường** nếu `sourceEventId` đã tồn tại — idempotent, không tạo duplicate. Kiểm tra DB xem notification đã có chưa.

### Replay xong nhưng email vẫn không đến

1. Kiểm tra SMTP config (`MAIL_HOST`, `MAIL_PORT`)
2. Kiểm tra MailHog (local) hoặc SMTP provider log
3. Nếu lỗi `config_error`, fix env rồi restart service trước khi replay

### Consumer reconnect loop

Triệu chứng: log liên tục `RabbitMQ connection closed` / `channel closed`

1. Kiểm tra RabbitMQ broker còn sống không
2. Kiểm tra credentials, vhost, TLS config
3. **Không replay** khi consumer chưa ổn định

---

## 5. Queue migration (chỉ cần khi thay đổi TTL)

> Phần này chỉ áp dụng khi thay đổi giá trị `EMAIL_RETRY_DELAY_STEPS_MS` trong code.
> **Deploy bình thường không cần làm phần này.**

### Khi nào cần

- Đổi TTL retry queue (ví dụ: 30s → 60s)
- Service start báo lỗi `PRECONDITION_FAILED`

### Các bước

1. **Stop service** trước khi xóa queue

2. **Kiểm tra backlog** — không xóa khi còn message quan trọng:
   ```bash
   rabbitmqadmin list queues name messages
   ```

3. **Xóa retry queue cũ** (IAM email):
   ```bash
   rabbitmqadmin delete queue name=iam.password-reset-mail.retry.30s
   rabbitmqadmin delete queue name=iam.password-reset-mail.retry.2m
   rabbitmqadmin delete queue name=iam.password-reset-mail.retry.10m
   ```
   Nếu có `BROKER_QUEUE_PREFIX`, thêm prefix vào tên queue.

4. **Start service** — consumer tự tạo lại queue với TTL mới

5. **Kiểm tra log startup** có dòng:
   ```
   Password reset mail retry topology: queues=[...], dlq=...
   ```

### Không xóa các queue này khi chưa chắc chắn

- Main queue còn backlog chưa xử lý
- DLQ đang có message cần replay
- Retry queue đang giữ message đang chờ TTL hết hạn

---

## 6. Checklist trước khi replay batch lớn

- [ ] Đã xác định nguyên nhân root cause
- [ ] Đã fix root cause (code deploy / config / infra)
- [ ] Đã dry-run thành công
- [ ] Đã replay 1 message và xác nhận consumer xử lý OK
- [ ] Service đang chạy ổn định, không có reconnect loop
- [ ] Hiểu rằng duplicate `sourceEventId` là bình thường, không phải lỗi

---

## 7. Tham khảo

- [notification-consumer-dlq.md](./notification-consumer-dlq.md) — chi tiết topology và observability notification
- [iam-password-reset-mail-dlq.md](./iam-password-reset-mail-dlq.md) — chi tiết topology và failure semantics IAM
- [rabbitmq-phase-signoff-checklist.md](./rabbitmq-phase-signoff-checklist.md) — checklist rollout đầy đủ

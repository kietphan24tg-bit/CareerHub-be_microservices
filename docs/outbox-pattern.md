# Outbox Pattern

## Mục đích

Tài liệu này chốt contract và luồng chuẩn cho các service có database khi triển khai outbox pattern trong CareerHub microservices.

## Khi nào dùng

- Service có transaction với database
- Service cần publish integration event ra RabbitMQ
- Cần tránh lệch trạng thái giữa `DB commit` và `message publish`

## Luồng chuẩn

1. Command handler thay đổi aggregate/domain state
2. Cùng transaction, service ghi thêm một bản ghi vào bảng `outbox`
3. Worker hoặc poller đọc các bản ghi `pending`
4. Worker publish integration event ra broker
5. Nếu publish thành công, bản ghi outbox được đánh dấu `processed`
6. Nếu publish thất bại, tăng `retry_count` và giữ `pending` hoặc đổi `failed`

## Cấu trúc outbox record

- `id`
- `event_name`
- `payload`
- `status`
- `retry_count`
- `occurred_at`
- `processed_at`

## Ghi chú

- `gateway` không phải nơi triển khai outbox runtime thật trong phase đầu
- `gateway` chỉ định nghĩa interface và contract để các service có DB triển khai đúng pattern sau này

# Dockerfile là gì?

Hãy tưởng tượng bạn muốn **đóng gói ứng dụng** để chạy trên máy khác (server, cloud) mà không cần cài Node.js, pnpm, source code... trên máy đó.

**Dockerfile** giống như **công thức nấu ăn**: ghi từng bước để Docker tự động:
1. Lấy môi trường cần thiết (Node.js, thư viện...)
2. Copy code vào
3. Cài dependency, build code
4. Tạo ra **image** - một "hộp" chứa mọi thứ cần để chạy app

Khi chạy image -> tạo **container** - app thật sự đang chạy.

---

# Vì sao mỗi service có Dockerfile riêng?

Dự án CareerHub là **microservices**: mỗi service (iam, job, gateway...) chạy **độc lập**, có port riêng.

Mỗi service có Dockerfile riêng, nhưng **7 file gần như giống hệt nhau** - chỉ khác:
- Tên service
- Port
- Vài chi tiết nhỏ (Prisma, thư viện native)

Bạn chỉ cần hiểu **1 file**, các file còn lại áp dụng tương tự.

---

# Build context: copy từ đâu?

Khi build image, Docker cần biết **thư mục gốc** để copy file. Ở đây là **toàn bộ monorepo** (`CareerHub-be-microservices/`), không phải chỉ thư mục `services/iam-service/`.

**Vì sao?** Mỗi service dùng chung code trong:
- `packages/` (shared-kernel, contracts...)
- `infrastructure/`

Nên Dockerfile phải "nhìn" từ thư mục cha.

```bash
# Đứng trong CareerHub-be-microservices, rồi chạy:
docker build -f services/iam-service/Dockerfile -t careerhub-iam .
#                                                              ^
#                                                              thư mục gốc monorepo
```

---

# Hai giai đoạn: Builder và Runner

Đây là điểm quan trọng nhất. Dockerfile chia làm **2 stage** (2 giai đoạn):

```text
+-------------------------------------+
|  STAGE 1: BUILDER (bếp nấu)         |
|  - Cài đầy đủ công cụ build         |
|  - pnpm install, compile TypeScript |
|  - Tạo file chạy được               |
+--------------+----------------------+
               | chỉ mang phần cần thiết sang
               v
+-------------------------------------+
|  STAGE 2: RUNNER (phòng phục vụ)    |
|  - Image nhẹ, sạch                  |
|  - Chỉ có code đã build + lib chạy  |
|  - Không có source, không có compiler |
+-------------------------------------+
```

**Ví dụ đời thường:** Bếp nấu món ăn (builder) -> đĩa thức ăn đã nấu xong mang ra bàn (runner). Khách không cần thấy bếp, dao, thớt.

**Lợi ích:**
- Image nhỏ hơn -> deploy nhanh hơn
- An toàn hơn -> không lộ source code, không thừa công cụ dev

---

# Giải thích từng phần (dùng `iam-service` làm ví dụ)

## Phần 1 - Chuẩn bị môi trường build

```dockerfile
FROM node:20-alpine AS builder
```

| Từ khóa | Nghĩa đơn giản |
|---------|----------------|
| `FROM` | "Bắt đầu từ image có sẵn" |
| `node:20-alpine` | Node.js phiên bản 20, trên Alpine Linux (bản Linux rất nhẹ) |
| `AS builder` | Đặt tên giai đoạn này là `builder` |

```dockerfile
RUN apk add --no-cache python3 make g++
```

Cài thêm công cụ compile. Một số thư viện Node (ví dụ **argon2** trong iam-service) không phải JavaScript thuần - cần compile native code khi `pnpm install`.

```dockerfile
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
```

Bật **pnpm** - công cụ quản lý package trong monorepo (nhiều package trong 1 repo).

```dockerfile
WORKDIR /app
```

Vào thư mục `/app` trong container - mọi lệnh sau chạy ở đây.

---

## Phần 2 - Cài dependency (tối ưu cache)

```dockerfile
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared-kernel/package.json ./packages/shared-kernel/
# ... các package.json khác ...
COPY services/iam-service/package.json   ./services/iam-service/

RUN pnpm install --frozen-lockfile
```

**Bước này làm gì?**
1. Copy **chỉ file `package.json`** (chưa copy source code)
2. Chạy `pnpm install` để tải thư viện

**Tại sao không copy hết source ngay?**

Docker **cache từng bước**. Nếu bạn sửa code nhưng **không đổi** `package.json` -> Docker **bỏ qua** bước `pnpm install` (đã cache) -> build nhanh hơn nhiều.

`--frozen-lockfile` = cài đúng phiên bản trong `pnpm-lock.yaml`, không tự ý cập nhật.

---

## Phần 3 - Copy source và build

```dockerfile
COPY packages/shared-kernel  ./packages/shared-kernel
COPY packages/contracts      ./packages/contracts
# ...
COPY services/iam-service    ./services/iam-service
```

Giờ mới copy **toàn bộ source code**.

```dockerfile
RUN pnpm build:packages
```

Build các package dùng chung (`shared-kernel`, `contracts`...) - giống "nấu nguyên liệu chung" trước khi nấu món chính.

```dockerfile
RUN pnpm --filter @careerhub/iam-service run prisma:generate
RUN pnpm --filter @careerhub/iam-service build
```

| Lệnh | Làm gì |
|------|--------|
| `prisma:generate` | Tạo code kết nối database (Prisma Client) từ file schema |
| `build` | Biên dịch TypeScript -> JavaScript trong thư mục `dist/` |

`--filter @careerhub/iam-service` = chỉ build đúng service này trong monorepo.

**Lưu ý:** `gateway` **không có** bước Prisma vì không dùng database trực tiếp qua Prisma.

---

## Phần 4 - Copy Prisma vào `dist/` (bước dễ bỏ qua)

```dockerfile
RUN cp -r services/iam-service/src/generated/prisma/. \
       services/iam-service/dist/services/iam-service/src/generated/prisma/
```

**Vấn đề:** TypeScript compiler (`tsc`) chỉ copy file `.ts` -> `.js`. Nhưng Prisma tạo ra file `.js`, `.wasm` sẵn - `tsc` **không tự copy** sang `dist/`.

**Giải pháp:** Dùng lệnh `cp` (copy) để đưa Prisma client vào đúng chỗ trong `dist/`, để khi chạy app tìm được file database.

Nếu thiếu bước này -> app chạy trong Docker sẽ báo lỗi không tìm thấy Prisma.

---

## Phần 5 - Gói bản production

```dockerfile
RUN pnpm deploy --filter @careerhub/iam-service --prod /deploy
```

**`pnpm deploy`** = gom service + thư viện **cần để chạy** vào thư mục `/deploy`:
- Giữ: code đã build, dependency production
- Bỏ: devDependencies (eslint, typescript compiler...)

Kết quả: một "gói" gọn, sẵn sàng chạy.

---

## Phần 6 - Stage Runner (image cuối cùng)

```dockerfile
FROM node:20-alpine AS runner
```

Bắt đầu **image mới, sạch** - không mang theo rác từ builder.

```dockerfile
RUN apk add --no-cache dumb-init libstdc++
```

| Package | Vì sao cần |
|---------|------------|
| `dumb-init` | Xử lý tín hiệu dừng (SIGTERM) đúng cách khi Docker/K8s tắt container |
| `libstdc++` | Chỉ **iam-service** cần - thư viện argon2 dùng native code lúc chạy |

```dockerfile
WORKDIR /app
COPY --from=builder /deploy ./
```

Copy **chỉ** thư mục `/deploy` từ stage builder sang - không copy source, không copy `node_modules` thừa.

```dockerfile
ENV NODE_ENV=production
```

Báo cho Node/NestJS: đang chạy môi trường production (tắt debug, tối ưu hiệu năng).

```dockerfile
EXPOSE 3001
```

Khai báo app lắng nghe port **3001**. (Chỉ là tài liệu - port thật còn phụ thuộc lúc `docker run -p`.)

```dockerfile
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/services/iam-service/src/main.js"]
```

| Lệnh | Nghĩa |
|------|-------|
| `ENTRYPOINT` | Luôn chạy `dumb-init` trước |
| `CMD` | Rồi chạy `node` file `main.js` - điểm vào của NestJS app |

Khi container start -> app iam-service chạy lên.

---

# Bảng port từng service

| Service | Port | Có Prisma? | Đặc biệt |
|---------|------|------------|----------|
| gateway | 3000 | Không | API gateway, không DB |
| iam-service | 3001 | Có | Cần `libstdc++` (argon2) |
| candidate-service | 3002 | Có | - |
| employer-service | 3003 | Có | - |
| job-service | 3004 | Có | - |
| application-service | 3005 | Có | - |
| communication-service | 3006 | Có | Prisma gộp trong script `build` |

---

# `.dockerignore` - file "không mang theo"

Ở thư mục gốc có `.dockerignore` - liệt kê thứ **không** copy vào image khi build:

- `node_modules/` - sẽ cài lại trong Docker
- `dist/` - sẽ build lại trong Docker
- `.env` - **không** nhét secret vào image; inject lúc chạy container
- `.git/`, log, cache...

Giống danh sách "đồ không mang khi đi du lịch".

---

# Luồng tổng thể (nhìn một lần là nhớ)

```text
Bạn chạy docker build
        |
        v
Docker đọc Dockerfile
        |
        v
+-------------------------------------+
| 1. Cài Node + pnpm + công cụ build  |
| 2. Copy package.json -> pnpm install|
| 3. Copy source code                 |
| 4. Build packages chung             |
| 5. Generate Prisma (nếu có)         |
| 6. Build service -> dist/           |
| 7. Copy Prisma vào dist/            |
| 8. pnpm deploy -> /deploy           |
+-------------------------------------+
        |
        v (chỉ lấy /deploy)
+-------------------------------------+
| 1. Image Alpine nhẹ                 |
| 2. Copy /deploy vào /app            |
| 3. NODE_ENV=production              |
| 4. node main.js -> app chạy         |
+-------------------------------------+
        |
        v
Image sẵn sàng deploy
```

---

# Flow deploy thực tế nên như này

Đây là flow dễ hiểu và an toàn hơn cho production:

```text
1. Build và push image
   GitHub Actions build 7 image và push lên Docker Hub

2. Chạy migration trước
   Trên máy deploy hoặc trong pipeline deploy,
   chạy prisma migrate deploy cho các service có Prisma

3. Nếu migration chạy xong hết và pass
   mới đi tiếp

4. Sau đó mới docker run hoặc docker compose up
   - gateway chạy luôn vì không có Prisma
   - các service còn lại chạy với schema DB đã được cập nhật sẵn
```

Nói ngắn gọn:

**Image build xong chưa có nghĩa là app nên chạy ngay.**
Với các service dùng Prisma, bạn nên **cập nhật schema database trước**, rồi mới start container app.

---

# Vì sao migration nên chạy riêng, không nên nhét vào lúc app start?

Migration là thao tác **thay đổi trạng thái của database**.
Container app thì nên tập trung vào việc **serve traffic**.

Nếu nhét migration vào lúc app start, sẽ có các rủi ro sau:

- Nhiều replicas có thể cùng lúc chạy migration
- Khó phân biệt lỗi do app hay do DB migration
- Container có thể crash chỉ vì migration fail, dù code app không sai
- Rollout khó kiểm soát hơn, nhất là khi có nhiều services dùng Prisma

Hiểu đơn giản:

- **Migration** là bước "chuẩn bị nhà cửa"
- **App container** là bước "mở cửa đón khách"

Bạn nên dọn nhà xong rồi mới mở cửa.

---

# Chạy migration riêng thì được gì?

Khi tách migration ra thành bước riêng, bạn có các lợi ích này:

- Rõ ràng thứ tự: migrate xong rồi mới start app
- Fail sớm nếu schema có vấn đề
- Dễ rollback hoặc quản lý release hơn
- Phù hợp production hơn khi scale nhiều containers

Đây là lý do trong thực tế production, người ta thường làm:

1. Build image
2. Push image
3. Chạy migration
4. Chỉ khi migration pass thì mới deploy app

---

# Các service cần chạy Prisma migration

Các service có Prisma cần chạy migration là:

- `iam-service`
- `application-service`
- `candidate-service`
- `employer-service`
- `job-service`
- `communication-service`

`gateway` **không cần** chạy migration vì không dùng Prisma.

---

# Lệnh migration tương ứng

Chạy các lệnh này trên máy deploy hoặc trong pipeline deploy:

```bash
pnpm --filter @careerhub/iam-service run prisma:migrate:deploy
pnpm --filter @careerhub/application-service run prisma:migrate:deploy
pnpm --filter @careerhub/candidate-service run prisma:migrate:deploy
pnpm --filter @careerhub/employer-service run prisma:migrate:deploy
pnpm --filter @careerhub/job-service run prisma:migrate:deploy
pnpm --filter @careerhub/communication-service run prisma:migrate:deploy
```

Ý nghĩa của các lệnh này:

- `pnpm --filter ...` = chạy đúng trong service đó
- `prisma:migrate:deploy` = áp dụng migration đã có sẵn lên database production

Lưu ý:

- Chạy **xong hết**
- Nếu tất cả đều **pass**
- Thì mới `docker run` hoặc `docker compose up`

---

# Câu hỏi thường gặp (người mới)

**Q: Tại sao không copy cả monorepo vào image?**  
A: Mỗi Dockerfile chỉ copy **1 service** + **packages dùng chung**. Không copy service khác -> image nhỏ hơn.

**Q: `EXPOSE 3001` có tự mở port không?**  
A: Không. Khi chạy cần map port: `docker run -p 3001:3001 ...`

**Q: Biến môi trường (DB URL, JWT secret) để đâu?**  
A: **Không** ghi trong Dockerfile. Truyền lúc chạy: `docker run -e DATABASE_URL=...` hoặc qua docker-compose / K8s.

**Q: Local dev có cần Docker không?**  
A: Không bắt buộc. Dockerfile chủ yếu cho **deploy production** và CI (GitHub Actions build push lên Docker Hub, ví dụ `kietphan24/careerhub-iam-service`).

---

Nếu bạn muốn, tôi có thể viết thêm một phiên bản siêu ngắn kiểu "cheat sheet 1 trang" cho phần Docker và deploy flow này.

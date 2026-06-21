# Tổng quan CI/CD (CareerHub-be-microservices)

Tài liệu này giải thích **CI/CD hiện tại** trong repo cho người mới: khi nào chạy, từng bước làm gì, cần truyền giá trị gì, và phần nào **chưa được tự động hóa**.

---

## Tóm tắt nhanh

Repo có **2 workflow GitHub Actions**, chia theo **2 thời điểm** khác nhau:

| Khi nào | Workflow | File | Mục đích |
|---------|----------|------|----------|
| Mở **PR** vào `main` | CI - Validation | `.github/workflows/ci.yml` | Kiểm tra code trước khi merge |
| **Push/merge** vào `main` | Release - Validate and Publish | `.github/workflows/docker-publish.yml` | Kiểm tra lại + build/push Docker image |

**Chưa có trong repo:**

- Workflow tự deploy lên server
- Tự SSH vào máy production
- Tự chạy migration DB
- Tự `docker run` / `docker compose up`

---

## Bức tranh tổng thể

```text
Developer
    |
    +-- [PR vào main] -----> ci.yml (chỉ kiểm tra)
    |                              |
    |                         pass/fail
    |                              |
    +-- [Merge/push main] --> docker-publish.yml
                                    |
                    +---------------+---------------+
                    |                               |
              Job 1: validate                 Job 2: publish
              (type-check)                 (7 image -> Docker Hub)
                    |                               |
                    v                               v
               pass mới chạy tiếp            Image sẵn sàng deploy
                                                    |
                                                    v
                                    [THỦ CÔNG trên server]
                                    migrate DB -> pull -> docker up
```

---

# PHẦN 1 — CI (khi mở Pull Request)

**File:** `.github/workflows/ci.yml`

**Kích hoạt:** tạo hoặc cập nhật PR vào nhánh `main`

**Mục tiêu:** trả lời câu hỏi *"Code này merge được không?"*

**Không làm:** build Docker image, deploy lên server.

## Từng bước

| # | Bước | Giải thích cho người mới |
|---|------|---------------------------|
| 1 | **Checkout code** | GitHub tải code từ PR về máy ảo (runner Ubuntu) |
| 2 | **Cài pnpm 10.12.4** | Công cụ quản lý package của monorepo |
| 3 | **Cài Node.js 20** | Môi trường chạy JavaScript/TypeScript |
| 4 | **`pnpm install --frozen-lockfile`** | Cài dependency đúng phiên bản trong lockfile |
| 5 | **`pnpm build:packages`** | Build các package dùng chung (`shared-kernel`, `contracts`...) |
| 6 | **Build từng service** | Compile TypeScript — nếu lỗi type thì CI fail |

## 7 service — cách build hơi khác nhau

| Service | CI làm gì |
|---------|-----------|
| `gateway` | Chỉ `build` |
| `iam`, `application`, `candidate`, `employer`, `job` | `prisma:generate` rồi `build` |
| `communication-service` | Chỉ `build` (Prisma gộp trong script `build`) |

## Cần truyền giá trị gì không?

**Không.**

- Không cần secret thủ công
- Không cần file `.env`
- Không cần kết nối database thật

`prisma:generate` trong CI chỉ tạo Prisma Client để compile, **không chạy migration** lên DB production.

## CI hiện tại chưa làm gì?

- Unit test (script test đang dùng PowerShell, chưa chạy được trên Linux runner)
- Build Docker image
- Deploy

## Kết quả

- **Pass** → PR có thể merge (nếu review OK)
- **Fail** → sửa code, push lại PR

---

# PHẦN 2 — CD / Release (khi push vào `main`)

**File:** `.github/workflows/docker-publish.yml`

**Tên workflow:** `Release - Validate and Publish Images`

**Kích hoạt:** push hoặc merge vào `main`

**Mục tiêu:** validate lại toàn bộ monorepo, **đóng gói 7 service thành Docker image**, **push lên Docker Hub** (`docker.io`).

Repo gọi đây là **"CD boundary"** — ranh giới CD **dừng ở publish image**, **không deploy runtime**.

## Job 1: `ci_release` — Release validation

Giống CI ở PR: kiểm tra lại toàn bộ monorepo trước khi publish.

| # | Bước | Ý nghĩa |
|---|------|---------|
| 1 | Checkout | Lấy code commit mới nhất trên `main` |
| 2 | Cài pnpm + Node 20 | Chuẩn bị môi trường build |
| 3 | `pnpm install` | Cài dependency |
| 4 | `build:packages` | Build shared packages |
| 5 | Build 7 service | Type-check / compile tất cả service |

**Job 2 chỉ chạy nếu Job 1 pass** (`needs: ci_release`).

## Job 2: `publish_images` — Build & push Docker (7 job song song)

GitHub tạo **7 job chạy song song** qua matrix:

- `gateway`
- `iam-service`
- `candidate-service`
- `employer-service`
- `job-service`
- `application-service`
- `communication-service`

Mỗi job thực hiện:

| # | Bước | Giải thích |
|---|------|------------|
| 1 | **Checkout** | Lấy code trên runner riêng |
| 2 | **Login Docker Hub** | Đăng nhập `docker.io` bằng `DOCKERHUB_USERNAME` + `DOCKERHUB_TOKEN` |
| 3 | **Tạo tag image** | Ví dụ: `kietphan24/careerhub-iam-service` |
| 4 | **Setup Docker Buildx** | Công cụ build Docker image |
| 5 | **Build + push** | Đọc `services/<service>/Dockerfile`, build, push lên Docker Hub |

## Image sau khi push

```text
kietphan24/careerhub-gateway:<short-sha>
kietphan24/careerhub-gateway:latest

kietphan24/careerhub-iam-service:<short-sha>
kietphan24/careerhub-iam-service:latest

... (tương tự cho 7 service)
```

- `kietphan24` = namespace Docker Hub đã chốt
- `<short-sha>` = hash commit ngắn
- `latest` = bản mới nhất trên `main`

## 7 service có giống nhau không?

**Rất giống nhau.**

Cùng một template workflow, chỉ khác:

- Tên service trong matrix
- Đường dẫn Dockerfile
- Tên image
- Cache scope riêng từng service

`port` trong matrix **chỉ để tham chiếu**, workflow **không dùng** port đó khi build.

## Cần truyền giá trị gì không?

| Giá trị | Ai cung cấp | Bạn cần setup? |
|---------|-------------|----------------|
| `DOCKERHUB_USERNAME` | GitHub Actions Secret | Có |
| `DOCKERHUB_TOKEN` | GitHub Actions Secret | Có |
| `DATABASE_URL`, JWT, SMTP... | — | **Không** (không dùng lúc build image) |

Push `main` chỉ cần code trong repo. **Không** cần secret thủ công cho workflow cơ bản này.

## Kết quả Job 2

- 7 Docker image nằm trên **Docker Hub**
- App production **chưa tự chạy bản mới**

---

# PHẦN 3 — Deploy production (CHƯA có trong repo)

Đây **không phải** CI/CD tự động trong GitHub Actions.

Đây là bước **thủ công** trên server (hoặc pipeline riêng bạn tự thêm sau).

## Thứ tự deploy đúng

```text
[1] Image đã có trên Docker Hub (sau push main)
         |
         v
[2] SSH vào server production
         |
         v
[3] Chuẩn bị .env (DB, RabbitMQ, JWT...)
         |
         v
[4] Chạy migration DB (6 service có Prisma)
         |
    pass hết?
         |
         v
[5] docker pull image mới
         |
         v
[6] docker run / docker compose up
         |
         v
[7] Kiểm tra /health -> user dùng app
```

## Migration

Migration **không** chạy trong container lúc app start.

Chạy **trước** khi start app, trên máy có quyền kết nối DB.

Lệnh gợi ý trong repo:

```bash
pnpm prisma:migrate:deploy:all
```

Hoặc từng service:

```bash
pnpm --filter @careerhub/iam-service run prisma:migrate:deploy
pnpm --filter @careerhub/application-service run prisma:migrate:deploy
pnpm --filter @careerhub/candidate-service run prisma:migrate:deploy
pnpm --filter @careerhub/employer-service run prisma:migrate:deploy
pnpm --filter @careerhub/job-service run prisma:migrate:deploy
pnpm --filter @careerhub/communication-service run prisma:migrate:deploy
```

Cần truyền:

- `DATABASE_URL` — URL DB của từng service
- `DIRECT_URL` — URL kết nối trực tiếp (dùng cho migration, tránh lỗi PgBouncer)

| Service cần migrate | Không cần migrate |
|---------------------|-------------------|
| iam, application, candidate, employer, job, communication | gateway |

Chi tiết biến môi trường: xem `docs/production-env-guide.md`.

---

# So sánh 3 giai đoạn (dễ nhớ)

| Giai đoạn | Khi nào | Ở đâu chạy | Tự động? | User dùng app mới? |
|-----------|---------|------------|----------|---------------------|
| **CI (PR)** | Mở PR | GitHub Actions | Có | Không |
| **Release (push main)** | Merge vào `main` | GitHub Actions | Có | Không |
| **Deploy runtime** | Sau release | Server production | **Không** (hiện tại) | **Có** |

---

# Luồng làm việc thường gặp của developer

```text
1. Code trên branch feature
2. Mở PR -> ci.yml chạy -> pass
3. Review + merge PR -> push main
4. docker-publish.yml chạy:
      validate -> build 7 image -> push Docker Hub
5. (Ops/dev) vào server:
      migrate -> pull -> docker up
6. User truy cập bản mới
```

- Bước 2–4: **GitHub tự làm**
- Bước 5: **bạn/ops làm tay**

---

# Những gì CI/CD hiện tại KHÔNG làm

- Không SSH vào server
- Không `docker login` để pull image public từ Docker Hub
- Không `docker run` / `docker compose up`
- Không migration DB tự động
- Không chạy unit test
- Không deploy frontend

---

# Câu hỏi thường gặp

**Q: Push `main` xong app production tự update không?**

A: **Không.** Chỉ có image mới trên Docker Hub. Muốn user dùng bản mới thì phải deploy trên server.

**Q: CI có cần DATABASE_URL không?**

A: **Không.** Chỉ deploy/migration trên server mới cần.

**Q: CD có tự SSH vào server không?**

A: **Không.** CD hiện tại trong repo = validate + publish image.

**Q: Dùng registry nào?**

A: **Docker Hub** (`docker.io`), namespace `kietphan24`.

**Q: PR và push main có chạy cùng workflow không?**

A: **Không.**

- PR → `ci.yml`
- Push `main` → `docker-publish.yml`

---

# Một câu tóm lại

**CI/CD hiện tại = kiểm tra code (PR) + khi merge `main` thì validate lại, build 7 Docker image và push lên Docker Hub. Deploy production (migrate DB, pull image, chạy container trên server) là bước riêng, chưa được automate trong repo.**

---

## Tài liệu liên quan

- `docs/dockerfile-explanation.md` — giải thích Dockerfile và flow deploy
- `docs/production-env-guide.md` — biến môi trường production và migration
- `.github/workflows/ci.yml` — CI validation cho PR
- `.github/workflows/docker-publish.yml` — release validation + publish image

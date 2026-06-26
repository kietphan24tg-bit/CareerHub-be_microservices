# Nghiệp Vụ & Luồng Kỹ Thuật Toàn Hệ Thống — CareerHub

> Tài liệu này mô tả **toàn bộ chức năng nghiệp vụ** của CareerHub + **luồng kỹ thuật từng bước**: FE gọi endpoint nào → Gateway verify gì → gọi service nào (gRPC) → tạo/cập nhật gì trong DB → bắn MQ event ra sao → consumer xử lý gì.
>
> Tài liệu chị em (đọc kèm để hiểu *cơ chế*): [huong-dan-toan-bo-luong-microservice.md](./huong-dan-toan-bo-luong-microservice.md) (Clean Arch / DDD / CQRS / gRPC / Outbox / Saga).
>
> Quy ước viết luồng:
> - **FE →** : request HTTP từ frontend.
> - **Verify** : guard ở Gateway (auth JWT + role).
> - **gRPC** : Gateway hoặc service gọi service khác đồng bộ.
> - **DB** : INSERT/UPDATE/DELETE bảng nào (✚ create, ✎ update, ✗ delete).
> - **OUTBOX → MQ** : event ghi vào outbox cùng transaction, worker publish ra RabbitMQ.
> - **CONSUMER** : service nghe event và làm gì.

---

## Mục lục
1. [Bức tranh nghiệp vụ tổng thể](#1-bức-tranh-nghiệp-vụ-tổng-thể)
2. [Bảng toàn bộ API theo module](#2-bảng-toàn-bộ-api-theo-module)
3. [Nhóm AUTH & tài khoản](#3-nhóm-auth--tài-khoản)
4. [Nhóm CANDIDATE (hồ sơ, CV, saved jobs)](#4-nhóm-candidate-hồ-sơ-cv-saved-jobs)
5. [Nhóm EMPLOYER (công ty, phòng ban)](#5-nhóm-employer-công-ty-phòng-ban)
6. [Nhóm JOB (đăng tin & tìm kiếm)](#6-nhóm-job-đăng-tin--tìm-kiếm)
7. [Nhóm APPLICATION (ứng tuyển & ATS)](#7-nhóm-application-ứng-tuyển--ats)
8. [Nhóm INTERVIEW (phỏng vấn)](#8-nhóm-interview-phỏng-vấn)
9. [Nhóm OFFER (đề nghị tuyển dụng)](#9-nhóm-offer-đề-nghị-tuyển-dụng)
10. [Recruiter notes & Notifications & Dashboard](#10-recruiter-notes--notifications--dashboard)
11. [Bảng tổng hợp Event (producer/consumer)](#11-bảng-tổng-hợp-event-producerconsumer)
12. [Bảng tổng hợp DB writes & Cache](#12-bảng-tổng-hợp-db-writes--cache)

---

## 1. Bức tranh nghiệp vụ tổng thể

CareerHub là nền tảng tuyển dụng + CV builder. Có **2 actor chính**:

- **Candidate (ứng viên)**: tạo hồ sơ, dựng CV theo template, tìm & lưu việc, ứng tuyển, theo dõi tiến trình, xác nhận phỏng vấn, nhận/đồng ý offer.
- **Employer (nhà tuyển dụng)**: tạo hồ sơ công ty + phòng ban, đăng tin (vòng đời job), quản lý ứng viên trên bảng ATS, lên lịch phỏng vấn, gửi offer, ghi chú nội bộ.

Hệ thống chia thành các **module nghiệp vụ** (ánh xạ sang microservice):

| Module nghiệp vụ | Service sở hữu | Chức năng chính |
|---|---|---|
| Tài khoản & xác thực | iam-service (+ workflow-service cho đăng ký) | đăng ký, đăng nhập, refresh, logout, quên/đặt lại mật khẩu |
| Hồ sơ ứng viên & CV | candidate-service | profile, resume CRUD, template, saved jobs |
| Hồ sơ công ty | employer-service | company profile, departments |
| Tin tuyển dụng | job-service | tạo/sửa/đăng/đóng/lưu trữ/mở lại/xoá tin; tìm kiếm (Meilisearch + Redis) |
| Ứng tuyển & tuyển dụng | application-service | đơn ứng tuyển, lịch sử, phỏng vấn, offer, recruiter notes, dashboard |
| Thông báo & email | communication-service | tạo notification, gửi mail phỏng vấn/offer |
| Điều phối đăng ký | workflow-service | saga đăng ký candidate/employer |

**Vòng đời tuyển dụng (state machine đơn ứng tuyển):**
```
applied → reviewed → shortlisted → interview → offer → hired
   └────────────────── rejected (có thể tại bất kỳ giai đoạn nào) ───────┘
   candidate có thể → withdrawn
```

**Vòng đời tin tuyển dụng (job):** `draft → published → closed → archived`; `closed → published` (reopen); chỉ `draft` mới được xoá.

**Vòng đời offer:** `draft → sent → (viewed) → accepted | rejected | expired`; employer có thể withdraw (soft-delete).

**Vòng đời phỏng vấn (interview):** `scheduled → confirmed | declined | cancelled`; employer reschedule → `rescheduled` (chờ candidate confirm).

---

## 2. Bảng toàn bộ API theo module

> Tất cả request (trừ `@Public`) đi qua 3 guard: **ThrottlerGuard** (rate limit) → **JwtAuthGuard** (gọi gRPC `IAM.ValidateAccessToken` → gắn `request.user`) → **RolesGuard** (so `@Roles`). Mọi request mang header `x-request-id` để trace xuyên suốt.

**AUTH** (`@Public` trừ `/auth/me`)
| Method | Path | Role | gRPC downstream |
|---|---|---|---|
| POST | `/auth/candidate/register` | public | **Workflow.RegisterCandidate** (saga) |
| POST | `/auth/employer/register` | public | **Workflow.RegisterEmployer** (saga) |
| POST | `/auth/login` | public | IAM.LoginIdentity |
| POST | `/auth/refresh` | public | IAM.RefreshSession |
| POST | `/auth/logout` | public | IAM.LogoutSession |
| POST | `/auth/forgot-password` | public | IAM.RequestPasswordReset |
| POST | `/auth/reset-password` | public | IAM.ResetPassword |
| GET | `/auth/me` | candidate, employer | IAM.GetCurrentIdentity + Candidate/Employer.GetProfile |

**CANDIDATE — Profile / Resume / Saved jobs** (role `candidate`)
| Method | Path | gRPC downstream |
|---|---|---|
| GET / PATCH | `/candidate/profile` | Candidate.Get/UpdateCandidateProfile |
| GET | `/candidate/resumes/templates` `(/:id)` | Candidate.ListResumeTemplates / GetResumeTemplateById |
| POST | `/candidate/resumes/templates/:templateId/draft` | Candidate.CreateOrGetTemplateDraft |
| GET/POST | `/candidate/resumes` | Candidate.ListResumesByIdentityId / CreateResume |
| GET/PATCH/DELETE | `/candidate/resumes/:resumeId` | Candidate.GetResumeById / UpdateResume / DeleteResume |
| POST | `/candidate/resumes/:resumeId/export-pdf` | Candidate (export payload) + render PDF |
| GET | `/candidate/resumes/export-payload/:token` (public) | Candidate.GetResumeExportPayload |
| GET/POST | `/candidate/saved-jobs` | Candidate.ListSavedJobs + Job.ListJobsByIds / Job.JobExists + Candidate.SaveJob |
| DELETE | `/candidate/saved-jobs/:jobId` | Candidate.RemoveSavedJob |

**EMPLOYER — Company / Departments** (role `employer`)
| Method | Path | gRPC downstream |
|---|---|---|
| GET/PATCH | `/employer/company-profile` (alias `/company-profiles`, `/company-profiles/me`) | Employer.Get/UpdateEmployerProfile |
| GET/POST | `/employer/departments` | Employer.ListDepartmentsByCompany / CreateDepartment |
| PATCH/DELETE | `/employer/departments/:id` | Employer.Update/DeleteDepartment |

**JOB** (public + employer)
| Method | Path | Role | gRPC downstream |
|---|---|---|---|
| GET | `/jobs` , `/jobs/:slug` | public | Job.ListPublicJobs / GetPublicJobBySlug |
| GET/POST | `/employer/jobs` | employer | Job.ListEmployerJobs (+ App.GetApplicationCounts) / Job.CreateJob |
| GET/PATCH/DELETE | `/employer/jobs/:jobId` | employer | Job.GetEmployerJobById / UpdateJob / DeleteJob |
| POST | `/employer/jobs/:jobId/{publish,close,archive,reopen}` | employer | Job.Publish/Close/Archive/ReopenJob |

**APPLICATION** (candidate + employer)
| Method | Path | Role | gRPC downstream |
|---|---|---|---|
| POST | `/candidate/jobs/:jobId/applications` | candidate | Job.GetJobForApplication + Candidate.GetResumeById + App.ApplyToJob |
| GET | `/candidate/applications` `(/:id)` | candidate | App.ListCandidateApplications / GetApplication + Job.ListJobsByIds |
| POST | `/candidate/applications/:id/withdraw` | candidate | App.WithdrawApplication |
| GET | `/employer/jobs/:jobId/applications` , `/employer/ats/:jobId` | employer | App.ListJobApplications |
| GET | `/employer/applications/:id` `(/history)` | employer | App.GetApplication / GetApplicationStatusHistory |
| PATCH | `/employer/applications/:id/status` | employer | App.UpdateApplicationStatus |

**INTERVIEW**
| Method | Path | Role | gRPC |
|---|---|---|---|
| GET | `/candidate/applications/:id/interview` | candidate | App.GetInterview |
| POST | `/candidate/interviews/:id/{confirm,decline,request-reschedule}` | candidate | App.Confirm/Decline/RequestRescheduleInterview |
| GET | `/employer/interviews` | employer | App.ListEmployerInterviews |
| POST | `/employer/applications/:id/interviews` | employer | App.CreateInterview |
| PATCH | `/employer/interviews/:id` | employer | App.UpdateInterview |
| POST | `/employer/interviews/:id/cancel` | employer | App.CancelInterview |

**OFFER**
| Method | Path | Role | gRPC |
|---|---|---|---|
| GET | `/employer/offers/benefits/catalog` | employer | App.ListBenefitCatalog |
| POST | `/employer/applications/:id/offers` | employer | App.CreateOffer |
| POST | `/employer/offers/:id/send` | employer | App.SendOffer |
| PATCH/DELETE | `/employer/offers/:id` | employer | App.UpdateOffer / SoftDeleteOffer |
| GET | `/employer/applications/:id/offers` , `/employer/offers/:id` | employer | App.ListEmployerOffers… / GetOffer |
| GET | `/candidate/applications/:id/offers` , `/candidate/offers/:id` | candidate | App.ListCandidateOffers… / GetOffer |
| POST | `/candidate/offers/:id/{accept,decline}` | candidate | App.Accept/DeclineOffer |

**NOTES / NOTIFICATIONS / DASHBOARD / METADATA**
| Method | Path | Role | gRPC |
|---|---|---|---|
| GET/POST | `/employer/applications/:id/notes` | employer | App.ListRecruiterNotes (+IAM author) / CreateRecruiterNote |
| PATCH/DELETE | `/employer/notes/:noteId` | employer | App.Update/DeleteRecruiterNote |
| GET | `/notifications` `(/:id)` | both | Communication.ListNotifications / GetNotification |
| PATCH | `/notifications/read-all` , `/notifications/:id/read` | both | Communication.MarkAll/MarkNotificationRead |
| GET | `/candidate/dashboard` | candidate | App.GetCandidateDashboardData + Candidate.ListSavedJobs + Communication.List + Job.ListJobsByIds |
| GET | `/employer/dashboard` | employer | Job.GetEmployerDashboardJobsSummary + App.GetEmployerDashboardData + Communication.List + Job.ListJobsByIds |
| GET | `/metadata/industries` | public | (static) |

---

## 3. Nhóm AUTH & tài khoản

### 3.1 Đăng ký ứng viên (Saga) — `POST /auth/candidate/register`
- **FE →** `{ email, password, confirmPassword, fullName, phone, acceptTerms }`
- **Verify** `@Public` (không cần token). Gateway kiểm `password === confirmPassword`, resolve `requestId`.
- **gRPC** Gateway → **Workflow.RegisterCandidate** (workflow-service điều phối **saga 3 bước**):
  1. **gRPC IAM.RegisterIdentity** → **DB iam** ✚ `identities` (status=`pending_profile`, accepted_terms, password_hash argon2).
  2. **gRPC Candidate.CreateCandidateProfile** → **DB candidate** ✚ `candidate_profiles` (full_name, phone).
  3. **gRPC IAM.ActivateIdentity** → **DB iam** ✎ `identities.status = active`.
- **Saga state**: workflow-service ghi `registration_sagas` + `registration_saga_steps` (status từng bước). Idempotency theo `requestId`.
- **Rollback (compensation)** nếu bước 2/3 fail (ngược thứ tự): gRPC Candidate.DeleteCandidateProfileCompensation (✗ profile) → gRPC IAM.CancelPendingIdentity (✗ identity). Xem chi tiết Saga ở [tài liệu cơ chế §8](./huong-dan-toan-bo-luong-microservice.md#8-saga--điều-phối-giao-dịch-phân-tán).
- **OUTBOX → MQ**: không (đăng ký chạy đồng bộ qua gRPC, không phát integration event).
- **Trả về**: `{ userId, email, role }`. Đăng ký employer (`/auth/employer/register`) tương tự nhưng bước 2 gọi Employer.CreateEmployerProfile (có thêm companyName, industry, address).

### 3.2 Đăng nhập — `POST /auth/login`
- **FE →** `{ email, password, rememberMe }`
- **gRPC** Gateway → **IAM.LoginIdentity**:
  - **Verify**: tìm identity theo email; phải tồn tại & `status=active`; verify password (argon2). Sai → `InvalidCredentialsError` (không lộ email tồn tại hay không).
  - **DB iam** ✚ `auth_sessions` (token_hash = hash(refresh token), remember_me, expires_at = now + TTL).
- **OUTBOX → MQ**: không.
- **Trả về**: `accessToken` (JWT, body), `refreshToken` set vào **HttpOnly cookie** ở Gateway; `user` info.

### 3.3 Refresh / Logout
- **`/auth/refresh`** → IAM.RefreshSession: tìm session theo token_hash, chưa revoke & chưa hết hạn, identity active → ✎ `auth_sessions` (rotate token_hash + expires_at mới). Cấp access token mới.
- **`/auth/logout`** → IAM.LogoutSession: ✎ `auth_sessions.revoked_at = now`. Gateway xoá cookie.

### 3.4 Quên & đặt lại mật khẩu (có Outbox + mail) — `POST /auth/forgot-password`
- **FE →** `{ email }`. **Verify** `@Public`.
- **gRPC** Gateway → **IAM.RequestPasswordReset**:
  - **Verify**: tìm identity theo email — **không tồn tại vẫn trả `accepted: true`** (chống dò email).
  - **DB iam (1 transaction)**: ✎ vô hiệu token cũ (`password_reset_tokens.used_at`) → ✚ `password_reset_tokens` (token_hash, expires_at) → ✚ **`outbox`** row event `iam.password-reset-requested.v1`.
- **OUTBOX → MQ**: worker IAM publish `iam.password-reset-requested.v1` (exchange `events`).
- **CONSUMER**: **mail consumer nội bộ trong iam-service** (queue `iam.password-reset-mail`) → derive token thật từ `resetTokenId+identityId+expiresAt+secret` → gửi mail. **Idempotency**: claim `mail_processing_at` chống gửi trùng. Lỗi → TTL retry queue (30s/2m/10m) → hết retry → DLQ.
- **`POST /auth/reset-password`** `{ token, newPassword }` → IAM.ResetPassword: verify token (chưa dùng, chưa hết hạn) → **DB iam (1 transaction)**: ✎ `identities.password_hash` (qua `Identity.changePassword`) + ✎ `password_reset_tokens.used_at` + ✎ revoke **toàn bộ** `auth_sessions` của identity (bảo mật).

### 3.5 `GET /auth/me`
- **Verify** token + role. **gRPC** IAM.GetCurrentIdentity → rồi tuỳ role gọi Candidate hoặc Employer GetProfile để gộp thông tin hồ sơ. Chỉ đọc, không ghi.

---

## 4. Nhóm CANDIDATE (hồ sơ, CV, saved jobs)

> candidate-service **không phát integration event** (không có outbox). Mọi thay đổi chỉ ghi DB; service khác đọc lại đồng bộ qua gRPC khi cần.

### 4.1 Hồ sơ ứng viên
- **GET `/candidate/profile`** → Candidate.GetCandidateProfileByIdentityId (đọc `candidate_profiles`).
- **PATCH `/candidate/profile`** → Candidate.UpdateCandidateProfile: ✎ `candidate_profiles` (các field gửi lên; nếu đổi `resume_id` thì đồng bộ trong transaction).

### 4.2 Resume (CV builder)
- **GET `/candidate/resumes/templates`** → liệt kê `resume_templates` (isActive).
- **POST `/candidate/resumes/templates/:templateId/draft`** → CreateOrGetTemplateDraft: nếu đã có draft theo `(identityId, templateId)` thì trả lại; chưa có → ✚ `resumes` (content rỗng dựng từ profile, title auto từ template).
- **POST `/candidate/resumes`** → CreateResume: validate `templateId` tồn tại & active → ✚ `resumes` (content JSON, title).
- **PATCH `/candidate/resumes/:id`** → UpdateResume: kiểm `resume.identityId === caller` → ✎ `resumes` (content + title).
- **DELETE `/candidate/resumes/:id`** → DeleteResume (transaction): nếu CV đang được profile dùng thì gỡ `candidate_profiles.resume_id`; clear `isUsing`; ✗ `resumes`.
- **POST `/candidate/resumes/:id/export-pdf`** & **GET `/candidate/resumes/export-payload/:token`** (public, dùng token in ấn) → trả payload resume + template để render PDF.
- **OUTBOX → MQ**: không (toàn bộ resume flow chỉ ghi DB candidate).

### 4.3 Saved jobs (lưu việc)
- **POST `/candidate/saved-jobs`** `{ jobId }` → Gateway gọi **Job.JobExists** (verify job tồn tại) → **Candidate.SaveJob**: ✚ `saved_jobs` (unique `(identityId, jobId)`; đã lưu thì trả bản cũ).
- **GET `/candidate/saved-jobs`** → Candidate.ListSavedJobs (lấy danh sách jobId) → Gateway gọi **Job.ListJobsByIds** để enrich thông tin job. (Composition cross-service).
- **DELETE `/candidate/saved-jobs/:jobId`** → Candidate.RemoveSavedJob: ✗ `saved_jobs`.

---

## 5. Nhóm EMPLOYER (công ty, phòng ban)

> employer-service cũng **không phát event** (trừ method compensation cho saga).

- **GET/PATCH `/employer/company-profile`** → Employer.Get/UpdateEmployerProfile: đọc / ✎ `employer_profiles` (company_name, logo, website, industry, size, description, address, tax_code, contact...).
- **Departments**: 
  - POST `/employer/departments` → CreateDepartment: verify tên không trùng trong công ty (`DepartmentNameConflictError`) → ✚ `departments`.
  - PATCH `/employer/departments/:id` → ✎ `departments` (name, description).
  - DELETE `/employer/departments/:id` → ✗ `departments`.
  - GET `/employer/departments` → list theo `companyId`.
- **Compensation (saga)**: Employer.DeleteEmployerProfileCompensation → ✗ `employer_profiles` theo identityId (chỉ workflow-service gọi khi rollback đăng ký).

---

## 6. Nhóm JOB (đăng tin & tìm kiếm)

> job-service **có outbox** → phát `job.*` events; có **Redis cache** (search + slug) và **Meilisearch** (full-text search).

### 6.1 Vòng đời tin tuyển dụng (employer)
Tất cả dùng **optimistic concurrency** (UPDATE … WHERE status = old_status) qua aggregate `Job` (state machine).

| Endpoint | Handler verify | DB jobs | OUTBOX → MQ |
|---|---|---|---|
| POST `/employer/jobs` | title/companyId/companyName bắt buộc; sinh **slug unique** (retry nếu trùng) | ✚ `jobs` status=`draft` | — (draft chưa publish) |
| PATCH `/employer/jobs/:id` | own job; nếu đổi title → refresh slug | ✎ `jobs` | `job.updated.v1` |
| POST `…/publish` | từ `draft|closed` | ✎ status=`published` | `job.published.v1` |
| POST `…/close` | từ `published` | ✎ status=`closed` | `job.closed.v1` |
| POST `…/archive` | từ `closed` | ✎ status=`archived` | `job.archived.v1` |
| POST `…/reopen` | từ `closed` | ✎ status=`published` | `job.reopened.v1` |
| DELETE `/employer/jobs/:id` | chỉ `draft` mới xoá được | ✗ `jobs` | `job.deleted.v1` |

- Payload mọi `job.*` event: `{ jobId, employerIdentityId, slug }`.
- **CONSUMER**: các event này phục vụ **invalidate Redis slug cache** và đồng bộ **Meilisearch index** (job-service tự nghe `job.slug-cache-invalidation` để `slugCache.del(slug)`).

### 6.2 Tìm kiếm công khai (candidate / khách)
- **GET `/jobs`** (filter: keyword, category, location, industry, employmentType, salaryMin/Max, remoteOnly, sort, page) → Job.ListPublicJobs:
  1. **Redis search cache**: key `job:search:{SHA256(filter)}`, TTL **30s**. Hit → trả ngay.
  2. Miss → **Meilisearch** index `jobs` (nếu có); nếu Meili trả 0 → fallback **query DB**.
  3. Ghi lại cache (async).
- **GET `/jobs/:slug`** → Job.GetPublicJobBySlug:
  1. **Redis slug cache**: key `job:slug:{slug}`, TTL **300s**. Hit → trả.
  2. Miss → Meili/DB → cache lại. Không thấy → `JobNotFoundError`.
- **GET `/employer/jobs`** → list job của employer (không cache) + Gateway gọi **App.GetApplicationCounts** để hiện số ứng viên mỗi tin.

---

## 7. Nhóm APPLICATION (ứng tuyển & ATS)

> application-service **có outbox** → phát `notifications.*`, `mail.*`, `application.*`. Dùng **optimistic CAS** cho mọi chuyển trạng thái.

### 7.1 Ứng viên nộp đơn — `POST /candidate/jobs/:jobId/applications`
- **FE →** `{ resumeId, coverLetter? }`. **Verify** token + role `candidate`.
- **gRPC composition tại Gateway** (3 lần): 
  1. **Job.GetJobForApplication** → verify job `published` & chưa hết hạn.
  2. **Candidate.GetResumeById** → verify resume thuộc ứng viên.
  3. **App.ApplyToJob**.
- **App xử lý (1 transaction)**: verify không trùng đơn (`findByJobAndCandidate` → `DuplicateApplicationError`) →
  - **DB application**: ✚ `applications` (status=`applied`) + ✚ `application_histories` (status_change → applied) + ✚ **`outbox` ×2**.
- **OUTBOX → MQ**: 
  - `notifications.application-received.v1` (recipient = **employer**).
  - `application.created.v1` (integration event).
- **CONSUMER**: communication-service nghe `notifications.#` → ✚ `notifications` (idempotent theo `sourceEventId`). Chi tiết cơ chế: [§9.2 tài liệu cơ chế](./huong-dan-toan-bo-luong-microservice.md#92-luồng-b--ứng-tuyển-việc-làm-grpc-composition--outbox--rabbitmq--notification).

### 7.2 Rút đơn — `POST /candidate/applications/:id/withdraw`
- App.WithdrawApplication: verify ownership + `canWithdraw()` → **CAS** ✎ `applications.status=withdrawn` + ✚ `application_histories`. **OUTBOX**: không (không notify employer).

### 7.3 Employer đổi trạng thái — `PATCH /employer/applications/:id/status`
- **FE →** `{ status: reviewed|shortlisted|interview|offer|rejected, note? }`.
- App.UpdateApplicationStatus: validate enum + ownership + `canEmployerTransitionTo()` → **CAS** ✎ `applications.status` + ✚ `application_histories` + ✚ **`outbox` ×2**.
- **OUTBOX → MQ**: `notifications.application-status-changed.v1` (recipient = **candidate**, title/message động theo status mới) + `application.status-updated.v1`.
- **GET `/employer/ats/:jobId`** / `/employer/jobs/:jobId/applications` → đọc danh sách ứng viên theo job (bảng kanban ATS).

---

## 8. Nhóm INTERVIEW (phỏng vấn)

| Endpoint (role) | Verify | DB | OUTBOX → MQ |
|---|---|---|---|
| POST `/employer/applications/:id/interviews` (employer) | app own + chưa terminal; chuẩn hoá lịch (date/time/duration), round bắt buộc | nếu app≠interview: ✎ `applications.status=interview` + ✚ history; ✚ `interviews` (status=`scheduled`) + ✚ history(interview_scheduled) | `notifications.interview-scheduled.v1` + **`mail.interview-created.v1`** + `application.interview-changed.v1` |
| PATCH `/employer/interviews/:id` (employer) | interview own + mutable; phát hiện đổi slot | ✎ `interviews` (nếu đổi slot → status=`rescheduled`, clear candidate_proposed_*) + ✚ history | `notifications.interview-status-changed.v1`(updated) + `mail.interview-updated.v1` *(chỉ khi đổi slot)* + `application.interview-changed.v1` |
| POST `/employer/interviews/:id/cancel` (employer) | mutable | ✎ status=`cancelled` + ✚ history | `notifications…`(cancelled) + **`mail.interview-cancelled.v1`** + `application.interview-changed.v1` |
| POST `/candidate/interviews/:id/confirm` (candidate) | own + status=`rescheduled` | ✎ status=`confirmed`, clear proposed fields + ✚ history | `notifications…`(confirmed) + `application.interview-changed.v1` |
| POST `/candidate/interviews/:id/decline` (candidate) | own + declinable | ✎ `interviews.status=declined` + ✎ `applications.status=rejected` + ✚ history×2 | `notifications…`(declined) + `application.interview-changed.v1` |
| POST `/candidate/interviews/:id/request-reschedule` (candidate) | own | ✎ `interviews` (ghi candidate_proposed_*) | `notifications…` + `application.interview-changed.v1` |

- **CONSUMER notification**: communication-service ✚ `notifications`.
- **CONSUMER mail** (`mail.*`): communication-service → **claim delivery** (`recruitment_mail_deliveries`, chống gửi trùng) → **gRPC IAM** lấy email theo identityId → gửi mail phỏng vấn → ✎ `markSent`. Lỗi → TTL retry → DLQ.

---

## 9. Nhóm OFFER (đề nghị tuyển dụng)

| Endpoint (role) | Verify | DB | OUTBOX → MQ |
|---|---|---|---|
| POST `/employer/applications/:id/offers` (employer) | app own + chưa terminal; chưa có offer (`OfferAlreadyExistsError`); validate benefit codes theo catalog | ✚ `job_offers` (status=`draft`, unique application_id) + ✚ `offer_benefits` + ✚ history(offer_created) | — (draft nội bộ) |
| POST `/employer/offers/:id/send` (employer) | offer own + status=`draft` + **bắt buộc có expiresAt** | **CAS** ✎ status=`sent`, sent_at; nếu app≠offer: ✎ `applications.status=offer`+history; ✚ history(offer_sent) | `notifications.offer-sent.v1` + **`mail.offer-sent.v1`** + `application.offer-status-changed.v1`(sent) |
| PATCH `/employer/offers/:id` (employer) | mutable (expire nếu tới hạn) | ✎ `job_offers` (field gửi lên); nếu đổi benefits: ✗+✚ `offer_benefits`; ✚ history | `notifications.offer-updated.v1` |
| DELETE `/employer/offers/:id` (employer) | mutable | ✎ `job_offers.deleted_at` (soft delete) + ✚ history | `notifications.offer-withdrawn.v1` + `application.offer-status-changed.v1` |
| POST `/candidate/offers/:id/accept` (candidate) | own + respondable | ✎ `job_offers.status=accepted`, responded_at + ✎ `applications.status=hired` + ✚ history×2 | `notifications.offer-accepted.v1`(recipient=employer) + `application.offer-status-changed.v1`(accepted) |
| POST `/candidate/offers/:id/decline` (candidate) | own + respondable | ✎ `job_offers.status=rejected` + ✎ `applications.status=rejected` + ✚ history×2 | `notifications.offer-declined.v1` + `application.offer-status-changed.v1`(rejected) |

- **Benefits catalog**: `GET /employer/offers/benefits/catalog` → App.ListBenefitCatalog (danh mục phúc lợi để chọn khi tạo offer).
- **CONSUMER**: như interview — notification → ✚ `notifications`; `mail.offer-sent.v1` → communication gửi mail offer (claim chống trùng + gRPC IAM lấy email).

---

## 10. Recruiter notes & Notifications & Dashboard

### 10.1 Recruiter notes (ghi chú nội bộ employer)
- POST `/employer/applications/:id/notes` → verify employer own app + body không rỗng/không quá dài → ✚ `recruiter_notes`. **OUTBOX**: không.
- PATCH `/employer/notes/:id` → ✎ `recruiter_notes.body`. DELETE → ✗.
- GET list → App.ListRecruiterNotes + Gateway gọi **IAM** để resolve tên tác giả.

### 10.2 Notifications (đọc)
- GET `/notifications` → Communication.ListNotifications (đọc `notifications`, kèm `unread_count`).
- PATCH `/notifications/:id/read` → ✎ `notifications.read_at` (idempotent). `/read-all` → ✎ tất cả chưa đọc.
- Notification được **tạo bởi consumer** (mục 7-9), không tạo trực tiếp qua API.

### 10.3 Dashboard (đọc, aggregate nhiều nguồn)
- **Candidate** `GET /candidate/dashboard`: App.GetCandidateDashboardData (đếm theo status, đơn gần đây, interview sắp tới, offer đang mở) + Candidate.ListSavedJobs + Communication.List + Job.ListJobsByIds (enrich). Không cache.
- **Employer** `GET /employer/dashboard`: Job.GetEmployerDashboardJobsSummary + App.GetEmployerDashboardData (tổng ứng viên, offer mở, phỏng vấn hôm nay, pipeline, hoạt động gần đây) + Communication.List. **Có Redis cache** key `dashboard:{employerIdentityId}:{localDate}`.

---

## 11. Bảng tổng hợp Event (producer/consumer)

| Event (routing key) | Producer | Khi nào | Consumer & hành động |
|---|---|---|---|
| `iam.password-reset-requested.v1` | iam-service | request reset password | iam mail consumer → gửi mail reset (claim chống trùng) |
| `notifications.application-received.v1` | application-service | candidate apply | communication → ✚ notification cho employer |
| `notifications.application-status-changed.v1` | application-service | employer đổi status | communication → ✚ notification cho candidate |
| `notifications.interview-scheduled/-status-changed.v1` | application-service | tạo/sửa/huỷ/confirm/decline interview | communication → ✚ notification |
| `notifications.offer-sent/-updated/-withdrawn/-accepted/-declined.v1` | application-service | vòng đời offer | communication → ✚ notification |
| `mail.interview-created/-updated/-cancelled.v1` | application-service | interview (slot) | communication → gửi mail (gRPC IAM lấy email) |
| `mail.offer-sent.v1` | application-service | send offer | communication → gửi mail offer |
| `application.created.v1` | application-service | apply | (đếm/đồng bộ; audit) |
| `application.status-updated.v1` | application-service | đổi status | (cross-module) |
| `application.interview-changed.v1` | application-service | mọi thay đổi interview | (cross-module) |
| `application.offer-status-changed.v1` | application-service | mọi thay đổi offer | (cross-module) |
| `job.published/.updated/.closed/.archived/.reopened/.deleted.v1` | job-service | vòng đời job | invalidate Redis slug cache + đồng bộ Meilisearch index |

> **Nguyên tắc bất biến**: producer **luôn ghi outbox cùng transaction** với business write → publish bởi worker. Consumer **luôn idempotent** (notification theo `sourceEventId`; mail theo claim `recruitment_mail_deliveries`). Lỗi consumer → retry → **DLQ** (`dlq.*`), replay bằng `pnpm ops:communication-dlq` / `ops:iam-email-dlq`.

---

## 12. Bảng tổng hợp DB writes & Cache

**Service nào ghi bảng nào & có outbox không**
| Service | Bảng ghi (write) | Outbox/Event? | Cache |
|---|---|---|---|
| iam-service | `identities`, `auth_sessions`, `password_reset_tokens`, `outbox` | ✅ `iam.password-reset-requested.v1` | — |
| candidate-service | `candidate_profiles`, `resumes`, `saved_jobs` | ❌ không phát event | — |
| employer-service | `employer_profiles`, `departments` | ❌ | — |
| job-service | `jobs`, `outbox` | ✅ `job.*` | Redis search (30s) + slug (300s); Meilisearch index `jobs` |
| application-service | `applications`, `application_histories`, `interviews`, `job_offers`, `offer_benefits`, `recruiter_notes`, `outbox` | ✅ `notifications.*`, `mail.*`, `application.*` | Redis dashboard (employer) |
| communication-service | `notifications`, `recruitment_mail_deliveries` | ❌ (chỉ consume) | — |
| workflow-service | `registration_sagas`, `registration_saga_steps` | ❌ (điều phối qua gRPC) | — |

**Quy ước concurrency (chống race)**
- application-service & job-service: **optimistic CAS** — `UPDATE … WHERE id=? AND status=expectedStatus`; nếu 0 dòng đổi → ném domain error (ai đó đã đổi trước). Không có history/outbox row khi CAS fail.
- iam-service: transaction bao trọn (identity là aggregate đơn lẻ, ít deadlock).
- outbox worker & saga recovery: `FOR UPDATE SKIP LOCKED` / optimistic claim để nhiều instance chạy song song an toàn.

---

## Tóm tắt 8 ý cốt lõi nghiệp vụ

1. **Gateway là cổng vào duy nhất**: mọi request qua Throttle → JWT (gọi IAM gRPC) → Roles, rồi composition nhiều gRPC.
2. **Đăng ký = Saga** ở workflow-service (3 bước gRPC + rollback); mọi thứ khác chủ yếu là CQRS command/query qua gRPC.
3. **Đọc cross-service → gRPC** (vd saved jobs/dashboard gọi nhiều service để enrich). **Báo "đã có chuyện" → event qua RabbitMQ**.
4. **Chỉ application-service, job-service, iam-service phát event** (có outbox). candidate/employer/communication/workflow **không phát**.
5. **Notification & mail là side-effect bất đồng bộ**: application-service ghi outbox → RabbitMQ → communication-service tạo notification / gửi mail. Client không phải chờ.
6. **Mọi chuyển trạng thái (application/interview/offer/job) dùng optimistic CAS** + ghi `application_histories` để audit.
7. **job-service tối ưu đọc** bằng Redis (search 30s, slug 300s) + Meilisearch; cache invalidate qua `job.*` event.
8. **Idempotency + DLQ** ở khắp consumer: notification theo `sourceEventId`, mail theo claim record; lỗi cuối cùng vào DLQ để replay thủ công.

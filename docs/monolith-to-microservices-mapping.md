# Monolith To Microservices Mapping

Tài liệu này dùng để đối chiếu dữ liệu từ database monolith `neondb` sang các database của hệ microservices.

Mục tiêu:

- xác định bảng nào map sang service nào
- xác định field nào map thẳng
- xác định field nào phải transform
- xác định field nào hiện chưa map đủ hoặc không thể map 1-1

## Quy ước

- `Exact`: map gần như 1-1
- `Transform`: cần đổi tên field, đổi kiểu, gộp/tách dữ liệu
- `Gap`: hiện chưa map đầy đủ hoặc source không có dữ liệu tương ứng

## 1. IAM Service

Source monolith:

- `users`
- `auth_sessions`
- `password_resets`

Target microservice database: `iam_service`

### `users` -> `identities`

| Monolith | Microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| `id bigint` | `id string` | Transform | Chuyển `bigint` sang `string` |
| `email` | `email` | Exact | |
| `password_hash` | `password_hash` | Exact | |
| `role` | `role` | Exact | `candidate` / `employer` |
| `is_active` | `status` | Transform | `true` không đủ để map trực tiếp, hiện dùng rule: có profile thì `active`, chưa có profile thì `pending_profile`, `false` thì `disabled` |
| không có | `accepted_terms` | Gap | Hiện đang set mặc định `true` trong script |
| `created_at` | `created_at` | Exact | |
| `updated_at` | `updated_at` | Exact | |

### `auth_sessions` -> `auth_sessions`

| Monolith | Microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| `id bigint` | `id string` | Transform | |
| `user_id` | `identity_id` | Transform | đổi tên và đổi kiểu |
| `token_hash` | `token_hash` | Exact | chỉ migrate nếu source có cột này |
| `remember_me` | `remember_me` | Exact | |
| `expires_at` | `expires_at` | Exact | |
| `revoked_at` | `revoked_at` | Exact | |
| `created_at` | `created_at` | Exact | |
| `updated_at` | `updated_at` | Exact | |

### `password_resets` -> `password_reset_tokens`

| Monolith | Microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| `id bigint` | `id string` | Transform | |
| `user_id` | `identity_id` | Transform | |
| `token` | `token_hash` | Gap | monolith đang có token raw, microservice cần `token_hash` |
| `expires_at` | `expires_at` | Exact | |
| `used_at` | `used_at` | Exact | |
| `created_at` | `created_at` | Exact | |
| không có rõ | `mail_processing_at` | Gap | |
| không có rõ | `mail_sent_at` | Gap | |

Kết luận:

- Không nên sửa microservice chỉ để nhận token raw.
- Nên giữ microservice như hiện tại.
- Nếu cần migrate password reset, nên migrate hạn chế hoặc bỏ qua hoàn toàn như hiện tại.

## 2. Candidate Service

Source monolith:

- `profiles`
- `resumes`
- `resume_skills`
- `resume_educations`
- `resume_experiences`
- `resume_projects`
- `resume_certifications`
- `resume_awards`
- `saved_jobs`

Target microservice database: `candidate_service`

### `profiles` -> `candidate_profiles`

| Monolith | Microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| `id bigint` | `id string` | Transform | |
| `user_id` | `identity_id` | Transform | |
| `full_name` | `full_name` | Exact | |
| `avatar_url` | `avatar_url` | Exact | |
| `phone` | `phone` | Exact | |
| `headline` | `headline` | Exact | |
| `bio` | `bio` | Exact | |
| `city`, `country` | `address` | Transform | hiện đang gộp thành một chuỗi |
| `github_url` | `github_url` | Exact | |
| `linkedin_url` | `linkedin_url` | Exact | |
| `portfolio_url` | `portfolio_url` | Exact | |
| `years_experience` | `years_experience` | Exact | |
| `resume_id bigint` | `resume_id string` | Transform | |
| `created_at` | `created_at` | Exact | |
| `updated_at` | `updated_at` | Exact | |

### `resumes` + bảng con -> `resumes`

| Monolith | Microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| `id bigint` | `id string` | Transform | |
| `user_id` | `identity_id` | Transform | |
| `title` | `title` | Exact | |
| `is_default` | `is_using` | Transform | khác tên, cùng ý nghĩa gần đúng |
| `summary` | `content.summary` | Transform | |
| `resume_skills.*` | `content.skills[]` | Transform | |
| `resume_educations.*` | `content.educations[]` | Transform | |
| `resume_experiences.*` | `content.experiences[]` | Transform | |
| `resume_projects.*` | `content.projects[]` | Transform | |
| `resume_certifications.*` | `content.certifications[]` | Transform | |
| `resume_awards.*` | `content.awards[]` | Transform | |
| không có | `template_id` | Gap | hiện để `null` |

### `saved_jobs` -> `saved_jobs`

| Monolith | Microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| `id bigint` | `id string` | Transform | |
| `user_id` | `identity_id` | Transform | |
| `job_id bigint` | `job_id string` | Transform | |
| `created_at` | `created_at` | Exact | |

### `resume_templates`

| Source monolith | Target microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| không có bảng tương đương | `resume_templates` | Gap | chưa migrate |

Kết luận:

- Phần candidate chủ yếu là sửa mapping và transform, không cần sửa schema microservice lúc này.
- Nếu muốn giữ `city` và `country` tách riêng, lúc đó mới cân nhắc chỉnh microservice.

## 3. Employer Service

Source monolith:

- `company_profiles`

Target microservice database: `employer_service`

### `company_profiles` -> `employer_profiles`

| Monolith | Microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| `id bigint` | `id string` | Transform | |
| `user_id` | `identity_id` | Transform | |
| `company_name` | `company_name` | Exact | |
| `logo_url` | `logo_url` | Exact | |
| `website` | `website` | Exact | |
| `industry` | `industry` | Exact | |
| `company_size` | `company_size` | Exact | |
| `founded_year` | `founded_year` | Exact | |
| `description` | `description` | Exact | |
| `city`, `country` | `address` | Transform | hiện đang gộp lại |
| `tax_code` | `tax_code` | Exact | |
| không có | `contact_name` | Gap | hiện để `null` |
| không có | `contact_phone` | Gap | hiện để `null` |
| `created_at` | `created_at` | Exact | |
| `updated_at` | `updated_at` | Exact | |

Kết luận:

- Không cần sửa microservice ngay.
- `contact_name` và `contact_phone` là field mới, source monolith chưa có tương ứng rõ.

## 4. Job Service

Source monolith:

- `jobs`
- `company_profiles`

Target microservice database: `job_service`

### `jobs` -> `jobs`

| Monolith | Microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| `id bigint` | `id string` | Transform | |
| `company_id` | `company_id string` | Transform | |
| `company_profiles.user_id` | `employer_identity_id` | Transform | phải join qua `company_profiles` |
| `company_profiles.company_name` | `company_name` | Transform | lấy từ bảng công ty |
| `company_profiles.logo_url` | `company_logo_url` | Transform | |
| `company_profiles.industry` | `company_industry` | Transform | |
| `company_profiles.website` | `company_website` | Transform | |
| `title` | `title` | Exact | |
| `slug` | `slug` | Exact | |
| `description` | `description` | Exact | |
| `responsibilities` | `responsibilities_json` | Transform | hiện giữ nguyên text |
| `requirements` | `requirements_json` | Transform | hiện giữ nguyên text |
| `benefits` | `benefits_json` | Transform | hiện giữ nguyên text |
| `employment_type` | `employment_type` | Exact | |
| `level` | `level` | Exact | |
| `category` | `category` | Exact | |
| `city` | `city` | Exact | |
| `country` | `country` | Exact | |
| `is_remote` | `is_remote` | Exact | |
| `salary_min` | `salary_min` | Exact | |
| `salary_max` | `salary_max` | Exact | |
| `currency` | `currency` | Exact | |
| `status` | `status` | Exact | |
| `expires_at` | `expires_at` | Exact | |
| `created_at` | `created_at` | Exact | |
| `updated_at` | `updated_at` | Exact | |

Kết luận:

- Không cần sửa schema microservice.
- Chỉ cần xác nhận downstream search / Meilisearch vẫn đọc được các field text đã đưa sang.

## 5. Application Service

Source monolith:

- `applications`
- `application_histories`
- `interviews`
- `job_offers`
- `recruiter_notes`

Target microservice database: `application_service`

### `applications` -> `applications`

| Monolith | Microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| `id bigint` | `id string` | Transform | |
| `job_id bigint` | `job_id string` | Transform | |
| `candidate_user_id` | `candidate_identity_id` | Transform | |
| `company_profiles.user_id` qua `jobs.company_id` | `employer_identity_id` | Transform | cần join qua `jobs` + `company_profiles` |
| `resume_id bigint` | `resume_id string` | Transform | |
| `cover_letter` | `cover_letter` | Exact | |
| `status` | `status` | Exact | |
| `applied_at` | `created_at` | Transform | |
| `updated_at` | `updated_at` | Exact | |

### `application_histories` -> `application_histories`

| Monolith | Microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| `id bigint` | `id string` | Transform | |
| `application_id` | `application_id` | Transform | |
| `event_type` | `event_type` | Exact | |
| `old_status` | `from_status` | Transform | |
| `new_status` | `to_status` | Transform | |
| `changed_by_user_id` | `actor_identity_id` | Transform | |
| `changed_by_user_id` | `actor_type` | Transform | script suy luận candidate/employer/system |
| `note` | `note` | Exact | |
| `created_at` | `created_at` | Exact | |

### `interviews` -> `interviews`

| Monolith | Microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| `id bigint` | `id string` | Transform | |
| `application_id` | `application_id` | Transform | |
| `job_id` | `job_id` | Transform | |
| `candidate_user_id` | `candidate_identity_id` | Transform | |
| `company_profiles.user_id` qua `company_id` | `employer_identity_id` | Transform | |
| `scheduled_by_user_id` | `scheduled_by_identity_id` | Transform | |
| `type` | `type` | Exact | |
| `round` | `round` | Exact | |
| `status` | `status` | Exact | |
| `date date` | `date varchar(32)` | Transform | format lại `YYYY-MM-DD` |
| `start_time time` | `start_time varchar(32)` | Transform | format `HH:mm:ss` |
| `end_time time` | `end_time varchar(32)` | Transform | format `HH:mm:ss` |
| không có trực tiếp | `duration_minutes` | Transform | tính từ start/end |
| `timezone` | `timezone` | Exact | |
| `interviewer_name` | `interviewer_name` | Exact | |
| `interviewer_role` | `interviewer_role` | Exact | |
| không có rõ | `interviewers` | Gap | hiện để `null` |
| `notes_to_candidate` | `notes_to_candidate` | Exact | |
| `reception_note`, `arrival_instructions`, `parking_info` | `logistics_note` | Transform | gộp text |
| `platform` | `platform` | Exact | |
| `meeting_link` | `meeting_link` | Exact | |
| `meeting_id` | `meeting_id` | Exact | |
| `passcode` | `passcode` | Exact | |
| `office_name` | `office_name` | Exact | |
| `full_address` | `full_address` | Exact | |
| `floor_room` | `location_detail` | Transform | |
| không có | `location_lat`, `location_lng` | Gap | |
| `map_link` | `map_link` | Exact | |
| `caller_info` | `caller_info` | Exact | |
| `contact_info` hoặc `contact_person` | `contact_info` | Transform | |
| `phone_number` | `phone_number` | Exact | |
| `candidate_response_note` | `candidate_response_note` | Exact | |
| không có | `candidate_proposed_*` | Gap | |

### `job_offers` -> `job_offers`

| Monolith | Microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| `id bigint` | `id string` | Transform | |
| `application_id` | `application_id` | Transform | |
| `job_id` | `job_id` | Transform | |
| `candidate_user_id` | `candidate_identity_id` | Transform | |
| `company_profiles.user_id` qua `company_id` | `employer_identity_id` | Transform | |
| `title` | `title` | Exact | |
| `seniority_label` | `seniority_label` | Exact | |
| không có | `department_team` | Gap | |
| không có | `reporting_to` | Gap | |
| `message` | `message` | Exact | |
| `bonus_details` | `bonus_details` | Exact | |
| `contract_document_url` | `contract_document_url` | Exact | |
| `salary decimal` | `salary string` | Transform | đổi sang text |
| không có rõ | `salary_period` | Gap | |
| `currency` | `currency` | Exact | |
| `employment_type` | `employment_type` | Exact | |
| `work_model` | `work_model` | Exact | |
| `start_date date` | `start_date varchar(32)` | Transform | format ngày |
| `location` | `location` | Exact | |
| không có | `probation_type`, `probation_custom` | Gap | |
| `status` | `status` | Exact | |
| `expires_at` | `expires_at` | Exact | |
| `sent_at` | `sent_at` | Exact | |
| `viewed_at` | `viewed_at` | Exact | |
| `responded_at` | `responded_at` | Exact | |
| `created_by_user_id` | `created_by_identity_id` | Transform | |
| `created_at` | `created_at` | Exact | |
| `updated_at` | `updated_at` | Exact | |
| không có | `deleted_at` | Gap | hiện để `null` |

### `job_offers.benefits` -> `offer_benefits`

| Monolith | Microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| `benefits text` | `offer_benefits[]` | Transform | hiện tạo 1 dòng `legacy_text` cho mỗi offer có benefits |

### `recruiter_notes` -> `recruiter_notes`

| Monolith | Microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| `id bigint` | `id string` | Transform | |
| `application_id` | `application_id` | Transform | |
| `author_user_id` | `author_identity_id` | Transform | |
| `body` | `body` | Exact | |
| `created_at` | `created_at` | Exact | |
| không có `updated_at` | `updated_at` | Transform | hiện dùng luôn `created_at` |

Kết luận:

- Phần application là nơi có nhiều transform nhất.
- Hiện chưa thấy lý do phải sửa schema microservice.
- Việc cần làm là verify field mẫu ở `interviews`, `job_offers`, `offer_benefits`.

## 6. Communication Service

Source monolith:

- `notifications`
- `mock_emails` chỉ là test data, không xem là nguồn production thật

Target microservice database: `communication_service`

### `notifications` -> `notifications`

| Monolith | Microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| `id bigint` | `id string` | Transform | |
| `user_id bigint` | `identity_id string` | Transform | hiện đang dùng chính numeric user id dưới dạng string |
| `type` | `type` | Exact | |
| `title` | `title` | Exact | |
| `message` | `message` | Exact | |
| `metadata json` | `metadata_json text` | Transform | serialize JSON thành string |
| không có | `source_event_id` | Gap | |
| không có | `read_at` | Gap | hiện để `null` |
| `created_at` | `created_at` | Exact | |

### `recruitment_mail_deliveries`

| Source monolith | Target microservice | Status | Ghi chú |
| --- | --- | --- | --- |
| không có bảng durable tương đương | `recruitment_mail_deliveries` | Gap | chưa migrate |

Kết luận:

- Nếu hệ mới thực sự cần correlate notification với event source, có thể phải bổ sung nguồn dữ liệu hoặc chấp nhận `source_event_id = null`.

## 7. Khuyến nghị hành động

### Chỉ cần sửa script migrate

- `password_resets` nếu bạn muốn migrate thêm và chấp nhận hash/token conversion riêng
- `city + country` -> `address`
- `job_offers.benefits` -> `offer_benefits`
- `interviews` date/time formatting
- `notifications.metadata` -> `metadata_json`

### Chưa nên sửa microservice ngay

- `candidate_profiles.address`
- `employer_profiles.address`
- `job.responsibilities_json`
- `job.requirements_json`
- `job.benefits_json`
- `notifications.identity_id`

### Chỉ sửa microservice nếu business xác nhận thật sự cần

- tách `address` thành `city`, `country`
- thêm support chính thức cho dữ liệu resume legacy chi tiết hơn nếu UI mới cần
- thêm field mapping rõ cho `source_event_id`
- thêm các field `contact_name`, `contact_phone` nếu muốn bắt buộc giữ đủ từ domain cũ

## 8. Kết luận ngắn

Hiện tại:

- phần lớn business data chính đã map sang đúng database và đúng bảng domain
- nhiều field đã map đúng hoặc transform hợp lý
- vẫn còn một số `Gap` mà source monolith không có dữ liệu tương đương 1-1

Thứ tự đúng tiếp theo:

1. verify record mẫu từng bảng
2. test flow thật trên app microservices
3. chỉ khi flow sai hoặc dữ liệu hiển thị sai mới quyết định sửa script hay sửa microservice

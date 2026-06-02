# CareerHub Database Schema

## Project

| Property      | Value                             |
| ------------- | --------------------------------- |
| Name          | `CareerHub`                       |
| Database Type | `PostgreSQL`                      |
| Note          | CareerHub Job Portal + CV Builder |

## Tables

### `users`

| Column          | Type        | Constraints / Notes                 |
| --------------- | ----------- | ----------------------------------- |
| `id`            | `bigint`    | Primary key, auto increment         |
| `email`         | `varchar`   | Not null, unique                    |
| `password_hash` | `varchar`   | Not null                            |
| `role`          | `varchar`   | Not null, `candidate` or `employer` |
| `is_active`     | `boolean`   | Not null, default `true`            |
| `created_at`    | `timestamp` |                                     |
| `updated_at`    | `timestamp` |                                     |

### `profiles`

| Column             | Type        | Constraints / Notes         |
| ------------------ | ----------- | --------------------------- |
| `id`               | `bigint`    | Primary key, auto increment |
| `user_id`          | `bigint`    | Not null, unique            |
| `full_name`        | `varchar`   | Not null                    |
| `avatar_url`       | `varchar`   |                             |
| `phone`            | `varchar`   |                             |
| `headline`         | `varchar`   |                             |
| `bio`              | `text`      |                             |
| `city`             | `varchar`   |                             |
| `country`          | `varchar`   |                             |
| `github_url`       | `varchar`   |                             |
| `linkedin_url`     | `varchar`   |                             |
| `portfolio_url`    | `varchar`   |                             |
| `years_experience` | `int`       |                             |
| `resume_id`        | `bigint`    |                             |
| `created_at`       | `timestamp` |                             |
| `updated_at`       | `timestamp` |                             |

### `company_profiles`

| Column         | Type        | Constraints / Notes         |
| -------------- | ----------- | --------------------------- |
| `id`           | `bigint`    | Primary key, auto increment |
| `user_id`      | `bigint`    | Not null                    |
| `company_name` | `varchar`   | Not null                    |
| `logo_url`     | `varchar`   |                             |
| `website`      | `varchar`   |                             |
| `industry`     | `varchar`   |                             |
| `company_size` | `varchar`   |                             |
| `founded_year` | `int`       |                             |
| `description`  | `text`      |                             |
| `city`         | `varchar`   |                             |
| `country`      | `varchar`   |                             |
| `tax_code`     | `varchar`   |                             |
| `created_at`   | `timestamp` |                             |
| `updated_at`   | `timestamp` |                             |

### `jobs`

| Column             | Type        | Constraints / Notes                                                                                            |
| ------------------ | ----------- | -------------------------------------------------------------------------------------------------------------- |
| `id`               | `bigint`    | Primary key, auto increment                                                                                    |
| `company_id`       | `bigint`    | Not null                                                                                                       |
| `title`            | `varchar`   | Not null                                                                                                       |
| `slug`             | `varchar`   | Not null, unique                                                                                               |
| `description`      | `text`      |                                                                                                                |
| `requirements`     | `text`      |                                                                                                                |
| `responsibilities` | `text`      | Optional; used for the job detail “Responsibilities” section (rich text or bullet list serialized as text)     |
| `benefits`         | `text`      |                                                                                                                |
| `employment_type`  | `varchar`   | `fulltime`, `parttime`, `intern`, or `contract`                                                                |
| `level`            | `varchar`   | `intern`, `fresher`, `junior`, `mid`, `senior`, or `lead` (aligns with employer job create form and job cards) |
| `category`         | `varchar`   |                                                                                                                |
| `city`             | `varchar`   |                                                                                                                |
| `country`          | `varchar`   |                                                                                                                |
| `is_remote`        | `boolean`   | Default `false`                                                                                                |
| `salary_min`       | `decimal`   |                                                                                                                |
| `salary_max`       | `decimal`   |                                                                                                                |
| `currency`         | `varchar`   |                                                                                                                |
| `status`           | `varchar`   | `draft`, `published`, `closed`, or `archived` (see `docs/state-machine.md`)                                    |
| `expires_at`       | `timestamp` |                                                                                                                |
| `created_at`       | `timestamp` |                                                                                                                |
| `updated_at`       | `timestamp` |                                                                                                                |

### `applications`

| Column              | Type        | Constraints / Notes                                                                          |
| ------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `id`                | `bigint`    | Primary key, auto increment                                                                  |
| `job_id`            | `bigint`    | Not null                                                                                     |
| `candidate_user_id` | `bigint`    | Not null                                                                                     |
| `resume_id`         | `bigint`    |                                                                                              |
| `cover_letter`      | `text`      |                                                                                              |
| `status`            | `varchar`   | Not null, `applied`, `reviewed`, `shortlisted`, `interview`, `offer`, `hired`, or `rejected` |
| `applied_at`        | `timestamp` |                                                                                              |
| `updated_at`        | `timestamp` |                                                                                              |

Indexes:

| Index                           | Type   |
| ------------------------------- | ------ |
| (`job_id`, `candidate_user_id`) | Unique |

### `application_histories`

| Column               | Type        | Constraints / Notes                                                                                                                                                                                  |
| -------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | `bigint`    | Primary key, auto increment                                                                                                                                                                          |
| `application_id`     | `bigint`    | Not null                                                                                                                                                                                             |
| `old_status`         | `varchar`   |                                                                                                                                                                                                      |
| `new_status`         | `varchar`   |                                                                                                                                                                                                      |
| `changed_by_user_id` | `bigint`    | Not null                                                                                                                                                                                             |
| `event_type`         | `varchar`   | `status_change`, `interview_scheduled`, `interview_status_changed`, `offer_created`, `offer_sent`, `offer_viewed`, `offer_accepted`, `offer_rejected`, `offer_discussion_requested`, or `note_added` |
| `note`               | `text`      |                                                                                                                                                                                                      |
| `created_at`         | `timestamp` |                                                                                                                                                                                                      |

### `interviews`

| Column                    | Type        | Constraints / Notes                                                                       |
| ------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| `id`                      | `bigint`    | Primary key, auto increment                                                               |
| `application_id`          | `bigint`    | Not null, related to `applications.id`                                                    |
| `job_id`                  | `bigint`    | Not null, related to `jobs.id`                                                            |
| `candidate_user_id`       | `bigint`    | Not null, related to `users.id`                                                           |
| `company_id`              | `bigint`    | Not null, related to `company_profiles.id`                                                |
| `scheduled_by_user_id`    | `bigint`    | Not null, related to `users.id`                                                           |
| `type`                    | `varchar`   | Not null, `online`, `onsite`, or `phone`                                                  |
| `round`                   | `varchar`   | Not null, `hr_screen`, `technical`, or `final`                                            |
| `status`                  | `varchar`   | Not null, `scheduled`, `confirmed`, `completed`, `cancelled`, `rescheduled`, or `no_show` |
| `date`                    | `date`      |                                                                                           |
| `start_time`              | `time`      |                                                                                           |
| `end_time`                | `time`      |                                                                                           |
| `timezone`                | `varchar`   |                                                                                           |
| `interviewer_name`        | `varchar`   |                                                                                           |
| `interviewer_role`        | `varchar`   |                                                                                           |
| `notes_to_candidate`      | `text`      |                                                                                           |
| `platform`                | `varchar`   | Online-only meeting platform                                                              |
| `meeting_link`            | `varchar`   | Online-only meeting link                                                                  |
| `meeting_id`              | `varchar`   | Optional online meeting ID                                                                |
| `passcode`                | `varchar`   | Optional online passcode                                                                  |
| `office_name`             | `varchar`   | Onsite-only office name                                                                   |
| `full_address`            | `text`      | Onsite-only full address                                                                  |
| `floor_room`              | `varchar`   | Onsite-only floor or room                                                                 |
| `reception_note`          | `text`      | Onsite-only reception note                                                                |
| `map_link`                | `varchar`   | Onsite-only map URL                                                                       |
| `contact_person`          | `varchar`   | Onsite-only contact person                                                                |
| `phone_number`            | `varchar`   | Onsite-only arrival phone number                                                          |
| `arrival_instructions`    | `text`      | Onsite-only arrival guidance                                                              |
| `parking_info`            | `text`      | Optional onsite parking guidance                                                          |
| `bring_laptop`            | `boolean`   | Optional onsite bring-laptop flag                                                         |
| `bring_documents`         | `boolean`   | Optional onsite bring-documents flag                                                      |
| `contact_info`            | `varchar`   | Flexible contact info for onsite or phone coordination, such as a phone number or email   |
| `caller_info`             | `varchar`   | Phone-only caller information                                                             |
| `candidate_response_note` | `text`      | Candidate confirmation, decline, or reschedule note                                       |
| `created_at`              | `timestamp` |                                                                                           |
| `updated_at`              | `timestamp` |                                                                                           |

### `job_offers`

| Column                  | Type        | Constraints / Notes                                                                                                                     |
| ----------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                    | `bigint`    | Primary key, auto increment                                                                                                             |
| `application_id`        | `bigint`    | Not null, unique, related to `applications.id`                                                                                          |
| `job_id`                | `bigint`    | Not null, related to `jobs.id`                                                                                                          |
| `candidate_user_id`     | `bigint`    | Not null, related to `users.id`                                                                                                         |
| `company_id`            | `bigint`    | Not null, related to `company_profiles.id`                                                                                              |
| `title`                 | `varchar`   | Not null                                                                                                                                |
| `seniority_label`       | `varchar`   | Optional; seniority or internal band label from the offer UI (e.g. L4 / L5 naming), distinct from `employment_type` when both are shown |
| `message`               | `text`      |                                                                                                                                         |
| `bonus_details`         | `text`      | Optional; bonus or commission narrative from the offer UI                                                                               |
| `contract_document_url` | `varchar`   | Optional; URL to an uploaded formal offer or contract PDF                                                                               |
| `salary`                | `decimal`   |                                                                                                                                         |
| `currency`              | `varchar`   |                                                                                                                                         |
| `employment_type`       | `varchar`   |                                                                                                                                         |
| `work_model`            | `varchar`   | `remote`, `onsite`, or `hybrid`                                                                                                         |
| `start_date`            | `date`      |                                                                                                                                         |
| `location`              | `varchar`   |                                                                                                                                         |
| `benefits`              | `text`      |                                                                                                                                         |
| `status`                | `varchar`   | Not null, `draft`, `sent`, `viewed`, `accepted`, `rejected`, or `expired`                                                               |
| `expires_at`            | `timestamp` |                                                                                                                                         |
| `sent_at`               | `timestamp` |                                                                                                                                         |
| `viewed_at`             | `timestamp` |                                                                                                                                         |
| `responded_at`          | `timestamp` |                                                                                                                                         |
| `created_by_user_id`    | `bigint`    | Not null, related to `users.id`                                                                                                         |
| `created_at`            | `timestamp` |                                                                                                                                         |
| `updated_at`            | `timestamp` |                                                                                                                                         |

### `recruiter_notes`

| Column           | Type        | Constraints / Notes         |
| ---------------- | ----------- | --------------------------- |
| `id`             | `bigint`    | Primary key, auto increment |
| `application_id` | `bigint`    | Not null                    |
| `author_user_id` | `bigint`    | Not null                    |
| `body`           | `text`      | Not null                    |
| `created_at`     | `timestamp` |                             |

### `offer_discussions`

| Column           | Type        | Constraints / Notes                 |
| ---------------- | ----------- | ----------------------------------- |
| `id`             | `bigint`    | Primary key, auto increment         |
| `offer_id`       | `bigint`    | Not null                            |
| `author_role`    | `varchar`   | Not null, `candidate` or `employer` |
| `author_user_id` | `bigint`    | Not null                            |
| `message`        | `text`      | Not null                            |
| `created_at`     | `timestamp` |                                     |

### `mock_emails`

| Column                 | Type        | Constraints / Notes         |
| ---------------------- | ----------- | --------------------------- |
| `id`                   | `bigint`    | Primary key, auto increment |
| `user_id`              | `bigint`    | Not null                    |
| `related_interview_id` | `bigint`    |                             |
| `related_offer_id`     | `bigint`    |                             |
| `subject`              | `varchar`   | Not null                    |
| `preview`              | `text`      |                             |
| `sent_at`              | `timestamp` |                             |

### `saved_jobs`

| Column       | Type        | Constraints / Notes         |
| ------------ | ----------- | --------------------------- |
| `id`         | `bigint`    | Primary key, auto increment |
| `user_id`    | `bigint`    | Not null                    |
| `job_id`     | `bigint`    | Not null                    |
| `created_at` | `timestamp` |                             |

Indexes:

| Index                 | Type   |
| --------------------- | ------ |
| (`user_id`, `job_id`) | Unique |

### `notifications`

| Column       | Type        | Constraints / Notes         |
| ------------ | ----------- | --------------------------- |
| `id`         | `bigint`    | Primary key, auto increment |
| `user_id`    | `bigint`    | Not null                    |
| `type`       | `varchar`   |                             |
| `title`      | `varchar`   |                             |
| `message`    | `text`      |                             |
| `metadata`   | `json`      |                             |
| `created_at` | `timestamp` |                             |

### `password_resets`

| Column       | Type        | Constraints / Notes         |
| ------------ | ----------- | --------------------------- |
| `id`         | `bigint`    | Primary key, auto increment |
| `user_id`    | `bigint`    | Not null                    |
| `token`      | `varchar`   | Not null                    |
| `expires_at` | `timestamp` |                             |
| `used_at`    | `timestamp` |                             |
| `created_at` | `timestamp` |                             |

### `resumes`

| Column       | Type        | Constraints / Notes         |
| ------------ | ----------- | --------------------------- |
| `id`         | `bigint`    | Primary key, auto increment |
| `user_id`    | `bigint`    | Not null                    |
| `title`      | `varchar`   | Not null                    |
| `summary`    | `text`      |                             |
| `is_default` | `boolean`   | Default `false`             |
| `created_at` | `timestamp` |                             |
| `updated_at` | `timestamp` |                             |

### `resume_skills`

| Column       | Type      | Constraints / Notes                |
| ------------ | --------- | ---------------------------------- |
| `id`         | `bigint`  | Primary key, auto increment        |
| `resume_id`  | `bigint`  | Not null                           |
| `name`       | `varchar` | Not null                           |
| `category`   | `varchar` | `technical`, `soft`, or `language` |
| `level`      | `varchar` |                                    |
| `sort_order` | `int`     |                                    |

### `resume_educations`

| Column        | Type      | Constraints / Notes         |
| ------------- | --------- | --------------------------- |
| `id`          | `bigint`  | Primary key, auto increment |
| `resume_id`   | `bigint`  | Not null                    |
| `school_name` | `varchar` | Not null                    |
| `degree`      | `varchar` |                             |
| `major`       | `varchar` |                             |
| `start_date`  | `date`    |                             |
| `end_date`    | `date`    |                             |
| `gpa`         | `varchar` |                             |
| `description` | `text`    |                             |
| `sort_order`  | `int`     |                             |

### `resume_experiences`

| Column            | Type      | Constraints / Notes         |
| ----------------- | --------- | --------------------------- |
| `id`              | `bigint`  | Primary key, auto increment |
| `resume_id`       | `bigint`  | Not null                    |
| `company_name`    | `varchar` | Not null                    |
| `position`        | `varchar` | Not null                    |
| `employment_type` | `varchar` |                             |
| `start_date`      | `date`    |                             |
| `end_date`        | `date`    |                             |
| `is_current`      | `boolean` | Default `false`             |
| `location`        | `varchar` |                             |
| `description`     | `text`    |                             |
| `achievements`    | `text`    |                             |
| `tech_stack`      | `text`    |                             |
| `sort_order`      | `int`     |                             |

### `resume_projects`

| Column             | Type      | Constraints / Notes         |
| ------------------ | --------- | --------------------------- |
| `id`               | `bigint`  | Primary key, auto increment |
| `resume_id`        | `bigint`  | Not null                    |
| `project_name`     | `varchar` | Not null                    |
| `role`             | `varchar` |                             |
| `start_date`       | `date`    |                             |
| `end_date`         | `date`    |                             |
| `description`      | `text`    |                             |
| `responsibilities` | `text`    |                             |
| `tech_stack`       | `text`    |                             |
| `github_url`       | `varchar` |                             |
| `demo_url`         | `varchar` |                             |
| `sort_order`       | `int`     |                             |

### `resume_certifications`

| Column           | Type      | Constraints / Notes         |
| ---------------- | --------- | --------------------------- |
| `id`             | `bigint`  | Primary key, auto increment |
| `resume_id`      | `bigint`  | Not null                    |
| `name`           | `varchar` | Not null                    |
| `issuer`         | `varchar` |                             |
| `issue_date`     | `date`    |                             |
| `expire_date`    | `date`    |                             |
| `credential_url` | `varchar` |                             |

### `resume_awards`

| Column         | Type      | Constraints / Notes         |
| -------------- | --------- | --------------------------- |
| `id`           | `bigint`  | Primary key, auto increment |
| `resume_id`    | `bigint`  | Not null                    |
| `title`        | `varchar` | Not null                    |
| `organization` | `varchar` |                             |
| `award_date`   | `date`    |                             |
| `description`  | `text`    |                             |

## Relationships

| From                                       | To                    |
| ------------------------------------------ | --------------------- |
| `profiles.user_id`                         | `users.id`            |
| `profiles.resume_id`                       | `resumes.id`          |
| `company_profiles.user_id`                 | `users.id`            |
| `jobs.company_id`                          | `company_profiles.id` |
| `applications.job_id`                      | `jobs.id`             |
| `applications.candidate_user_id`           | `users.id`            |
| `applications.resume_id`                   | `resumes.id`          |
| `application_histories.application_id`     | `applications.id`     |
| `application_histories.changed_by_user_id` | `users.id`            |
| `interviews.application_id`                | `applications.id`     |
| `interviews.job_id`                        | `jobs.id`             |
| `interviews.candidate_user_id`             | `users.id`            |
| `interviews.company_id`                    | `company_profiles.id` |
| `interviews.scheduled_by_user_id`          | `users.id`            |
| `job_offers.application_id`                | `applications.id`     |
| `job_offers.job_id`                        | `jobs.id`             |
| `job_offers.candidate_user_id`             | `users.id`            |
| `job_offers.company_id`                    | `company_profiles.id` |
| `job_offers.created_by_user_id`            | `users.id`            |
| `recruiter_notes.application_id`           | `applications.id`     |
| `recruiter_notes.author_user_id`           | `users.id`            |
| `offer_discussions.offer_id`               | `job_offers.id`       |
| `offer_discussions.author_user_id`         | `users.id`            |
| `mock_emails.user_id`                      | `users.id`            |
| `mock_emails.related_interview_id`         | `interviews.id`       |
| `mock_emails.related_offer_id`             | `job_offers.id`       |
| `saved_jobs.user_id`                       | `users.id`            |
| `saved_jobs.job_id`                        | `jobs.id`             |
| `notifications.user_id`                    | `users.id`            |
| `password_resets.user_id`                  | `users.id`            |
| `resumes.user_id`                          | `users.id`            |
| `resume_skills.resume_id`                  | `resumes.id`          |
| `resume_educations.resume_id`              | `resumes.id`          |
| `resume_experiences.resume_id`             | `resumes.id`          |
| `resume_projects.resume_id`                | `resumes.id`          |
| `resume_certifications.resume_id`          | `resumes.id`          |
| `resume_awards.resume_id`                  | `resumes.id`          |

Cardinality notes:

- `applications -> interviews`: `1-n`
- `applications -> job_offers`: `1-1`

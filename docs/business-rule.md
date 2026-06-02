# Business Rules

## Scope

Rules below describe **intended product behavior** and ownership boundaries. The **current Next.js UI** follows the same flows where screens exist; some system behaviors (notifications, email, saved-job persistence) may use **mock or local data** until the backend matches the schema. When in doubt, align new docs and code with the **shipping UX** first, then tighten automation.

## Candidate Rules

- A candidate can apply only if the job is in `Published` status.
- A candidate cannot apply to the same job more than once.
- A candidate can edit only their own profile.
- A candidate can view only their own applications.
- A candidate can view only offers that belong to their own applications.
- A candidate can accept, reject, or request discussion only while an offer is still active.
- A candidate can view only interviews that belong to their own applications.
- A candidate can confirm attendance, request reschedule, or decline only while an interview is still awaiting response.

## Employer Rules

- An employer can edit only their own company profile.
- An employer can edit only jobs that belong to their company.
- An employer can update applicant status only for jobs owned by their company.
- An employer can create offer drafts and send offers only for applicants on jobs owned by their company.
- An employer can schedule or reschedule interviews only for applicants on jobs owned by their company.
- Internal recruiter notes belong to the employer workflow and must stay scoped to the application.
- Recruiters move candidates through the hiring pipeline. **Employer ATS UI** shows columns `Applied` -> `Review` -> `Interview` -> `Offer` -> `Hired`; persisted statuses may still include `shortlisted`, which the board **groups under `Review`** together with `reviewed`. Unless the candidate is rejected earlier, the logical progression remains `Applied` -> `Reviewed` -> `Shortlisted` -> `Interview` -> `Offer` -> `Hired` in data where those steps are used.

## System Rules

### Target behavior (full product)

- When a candidate applies for a job, the system creates a notification.
- When an application status changes, the system notifies the candidate.
- Moving a candidate to `Reviewed` should notify the candidate that the profile is under review.
- Moving a candidate to `Shortlisted` should notify the candidate that they advanced to the next stage.
- When an offer is sent, the system creates a candidate notification and a mock email item (or real email when mail is integrated).
- When an offer is viewed, accepted, rejected, or receives a discussion request, the recruiter receives a notification.
- Requesting discussion keeps the offer open; it does not automatically reject or hire the candidate.
- Scheduling an interview creates an interview record, workflow events as needed, a candidate notification, and a mock email item (or real email when integrated).
- Candidate interview confirmation, reschedule requests, and declines notify the recruiter.
- When a job is expired, candidates can no longer apply.

### Current UI prototype

- Notification **bells and popovers** demonstrate the experience; entries may be **static or mock** until wired to `notifications` and real events.
- **Bookmark / save job** controls reflect intended UX; persistence follows `saved_jobs` once the API exists.
- Recruiter **notes on ATS cards** illustrate the workflow; durable storage follows `recruiter_notes` / `application_histories` when implemented.

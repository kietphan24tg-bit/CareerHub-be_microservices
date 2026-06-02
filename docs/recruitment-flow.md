# Recruitment Flow

## Purpose

This document describes the recruitment flow for `CareerHub` from the employer and candidate point of view.

**Primary reference:** the current web UI (employer ATS, job posting, interview scheduling, offer creation, candidate job search and applications). Domain text here follows that experience; the database may store extra statuses (for example `shortlisted`) even when the board does not show a separate column.

It remains useful for business discussion and future backend hardening.

## Main Flow

The recruiter opens a `Published` job and reviews its applicants.

### Employer ATS (current UI)

The kanban-style board uses **five columns**:

`Applied` -> `Review` -> `Interview` -> `Offer` -> `Hired`

- **`Review`** is the single column for post–initial-review work. In persisted data, rows may still be `reviewed` or `shortlisted`; both are **displayed in this column** to keep the layout simple.
- **`Rejected`** is not a column; rejected candidates disappear from the board (see application status in schema / state machine).

### Full status sequence (data and candidate-facing copy)

When the product uses every application status value, the logical sequence remains:

`Applied` -> `Reviewed` -> `Shortlisted` -> `Interview` -> `Offer` -> `Hired`

The candidate may also become `Rejected` at any stage based on recruiter decision.

## Stage Definitions

### `Applied`

- The candidate has just submitted an application.
- The recruiter has not reviewed the profile yet.
- This is the default starting point for every application.

### `Reviewed`

- The recruiter has opened and reviewed the candidate CV or profile.
- This means the application has been checked, but the candidate has not yet passed the CV screening stage.
- Candidate-facing message:
  `Your profile is under review`

### `Shortlisted`

- The candidate passed CV screening and is allowed to continue to the next stage.
- This stage is important for UX because it gives the candidate a clear signal that they are still progressing.
- Equivalent business labels may include:
  - `Continue`
  - `Shortlisted`
  - `Passed Screening`
  - `Next Round`
- Candidate-facing message:
  `Your application has progressed to the next stage`

### `Interview`

- The recruiter decides to invite the candidate to interview.
- At this stage, the system should create an interview record with the necessary details.
- **Interview schedule UI (current):** format **Online** or **Offline** (maps to online vs onsite in data); **platform** (e.g. Meet / Zoom / Teams) and **meeting link or ID** for online; **full address**, **building/floor**, **room/area** for offline; **date**, **start time**, **duration** (30–120 minutes); **interviewers** as a team list on the form. Optional fields from the full schema (timezone, round, phone interview type, long-form notes to candidate, etc.) may be added later without changing this baseline UX.
- When notifications and email are implemented end-to-end, the candidate should receive both a notification and an email (see `business-rule.md` prototype note until then).
- Candidate-facing message:
  `Interview invitation received`

### `Offer`

- The candidate has passed the interview process and the employer sends an offer.
- At this stage, the system should create an offer record.
- **Create-offer UI (current):** job **title**, **seniority / level** selector (display label), **start date**, **offer expiration**, **base salary** and **currency**, **bonus / commission** narrative, **welcome message**, **benefits** checklist (plus add benefit), optional **contract PDF** upload area, and summary panel. These map to `job_offers` and related fields in `docs/schema.md`.
- Candidate-facing message:
  `Offer received`

### `Hired`

- The candidate accepted the offer.
- This is the successful end state of the application flow.

### `Rejected`

- The recruiter closes the candidate application without moving forward.
- This can happen after `Applied`, `Reviewed`, `Shortlisted`, `Interview`, or `Offer` depending on business policy.
- Candidate-facing message:
  `Application closed`

## Why `Shortlisted` Still Exists in Data

The schema keeps `shortlisted` so APIs and candidate timelines can distinguish “CV passed screening” from “only opened for review.” The **employer board** intentionally merges that signal into the **Review** column for a shorter, clearer kanban. Product copy on the candidate side can still use distinct messages when those statuses are set in the backend.

## Recommended Prototype Flow

**Aligned with current employer UI:**

`Applied` -> `Review` -> `Interview` -> `Offer` -> `Hired` (with `Rejected` as an exit)

For a finer-grained internal representation (reports, audit):

`Applied` -> `Reviewed` -> `Shortlisted` -> `Interview Scheduled` -> `Interview Completed` -> `Offer Sent` -> `Hired` -> `Rejected`

## Recruiter UI Guidance

On the job applicants page, each candidate row should support stage-based actions.

Recommended actions:

- `View CV`
- `Mark Reviewed`
- `Continue`
- `Interview`
- `Reject`

The available actions should depend on the current application stage.

## Candidate Notifications

Recommended notification messages:

| Stage         | Candidate Message               |
| ------------- | ------------------------------- |
| `Reviewed`    | `Your profile is under review`  |
| `Shortlisted` | `You advanced to next stage`    |
| `Interview`   | `Interview invitation received` |
| `Offer`       | `Offer received`                |
| `Rejected`    | `Application closed`            |

## Alignment With Schema and State Machine

- Application **status values** (including `shortlisted`): see [schema.md](./schema.md) and [state-machine.md](./state-machine.md).
- **Employer kanban columns** are a **view** over those statuses: `shortlisted` appears together with `reviewed` under **Review**.
- Interview lifecycle detail lives in the `interviews` table and the interview state machine; offer lifecycle in `job_offers` and the offer state machine.
- **Saved jobs** (bookmark on job cards): intended UX; persistence uses `saved_jobs` when the API is connected (bookmark may be visual-only in early prototypes).

When changing the board layout or status set, update this file together with [business-rule.md](./business-rule.md), [state-machine.md](./state-machine.md), and [schema.md](./schema.md) / [schema.dbml](./schema.dbml).

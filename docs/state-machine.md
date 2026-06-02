# State Machines

Application and job rules in prose (including employer board layout) are summarized in [recruitment-flow.md](./recruitment-flow.md) and [business-rule.md](./business-rule.md).

## Application State Machine

### States

- `Applied`
- `Reviewed`
- `Shortlisted`
- `Interview`
- `Offer`
- `Hired`
- `Rejected`

### Typical Flow

`Applied` -> `Reviewed` -> `Shortlisted` -> `Interview` -> `Offer` -> `Hired`

**Employer kanban (current UI):** columns are `Applied`, `Review`, `Interview`, `Offer`, `Hired`. Statuses `reviewed` and `shortlisted` both map to the **`Review`** column for display only; transitions in the table below are the source of truth for persisted state.

### Transition Rules

| From          | To            | Allowed | Notes                              |
| ------------- | ------------- | ------- | ---------------------------------- |
| `Applied`     | `Reviewed`    | Yes     | Standard review progression        |
| `Reviewed`    | `Shortlisted` | Yes     | Candidate passed CV screening      |
| `Shortlisted` | `Interview`   | Yes     | Candidate moves to interview stage |
| `Interview`   | `Offer`       | Yes     | Candidate passed interview process |
| `Offer`       | `Hired`       | Yes     | Candidate accepted and was hired   |
| `Rejected`    | `Interview`   | No      | May be allowed depending on policy |

## Job Posting State Machine

### States

- `Draft`
- `Published`
- `Closed`
- `Archived`

### Typical Flow

`Draft` -> `Published` -> `Closed` -> `Archived`

### Transition Rules

| From        | To          | Allowed  | Notes                                                                                               |
| ----------- | ----------- | -------- | --------------------------------------------------------------------------------------------------- |
| `Draft`     | `Published` | Yes      | Job is ready to be listed                                                                           |
| `Published` | `Closed`    | Yes      | Job posting is no longer accepting applications                                                     |
| `Closed`    | `Published` | Optional | Reopen only if the business policy allows it                                                        |
| `Closed`    | `Archived`  | Yes      | Terminal documentation state when the listing should remain for records but not accept applications |

## Offer State Machine

### States

- `Draft`
- `Sent`
- `Viewed`
- `Accepted`
- `Rejected`
- `Expired`
- `Withdrawn` (optional)

### Typical Flow

`Draft` -> `Sent` -> `Viewed` -> `Accepted`

### Alternative Outcomes

- `Viewed` -> `Rejected`
- `Sent` or `Viewed` -> discussion requested while the offer stays open
- `Sent` -> `Expired`

### Transition Rules

| From               | To                 | Allowed | Notes                                                      |
| ------------------ | ------------------ | ------- | ---------------------------------------------------------- |
| `Draft`            | `Sent`             | Yes     | Offer is finalized and sent to the candidate               |
| `Sent`             | `Viewed`           | Yes     | Candidate opened or acknowledged the offer                 |
| `Viewed`           | `Accepted`         | Yes     | Candidate accepted the offer                               |
| `Viewed`           | `Rejected`         | Yes     | Candidate declined the offer                               |
| `Sent` or `Viewed` | `Sent` or `Viewed` | Yes     | Candidate may request discussion without closing the offer |
| `Sent`             | `Expired`          | Yes     | Offer expired before candidate action                      |

## Interview State Machine

### States

- `Scheduled`
- `Confirmed`
- `Completed`
- `Cancelled`
- `Rescheduled`
- `No Show`

### Typical Flow

`Scheduled` -> `Confirmed` -> `Completed`

### Alternative Outcomes

- `Scheduled` -> `Rescheduled`
- `Rescheduled` -> `Confirmed`
- `Scheduled` or `Rescheduled` -> `Cancelled`
- `Confirmed` -> `No Show`

### Transition Rules

| From                         | To            | Allowed | Notes                                                             |
| ---------------------------- | ------------- | ------- | ----------------------------------------------------------------- |
| `Scheduled`                  | `Confirmed`   | Yes     | Candidate confirms attendance                                     |
| `Scheduled`                  | `Rescheduled` | Yes     | Candidate requests a new slot or recruiter issues an updated slot |
| `Rescheduled`                | `Confirmed`   | Yes     | Candidate confirms the updated plan                               |
| `Scheduled` or `Rescheduled` | `Cancelled`   | Yes     | Candidate declines or recruiter cancels                           |
| `Confirmed`                  | `Completed`   | Yes     | Interview was completed successfully                              |
| `Confirmed`                  | `No Show`     | Yes     | Candidate did not attend                                          |

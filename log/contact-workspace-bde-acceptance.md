# BDE acceptance — contact workspace

Status: deferred by project owner on 2026-11-24; not a prerequisite for opening the upstream PR. Automated regression evidence does not substitute for actual BDE acceptance. Retain this checklist for later user feedback.

Use a staging account with representative synthetic contact data. Do not use live customer records or send real outreach. Use the actual employee role and repeat permission-sensitive scenarios with an administrator and a restricted account.

| Scenario | Expected result | Result / evidence |
|---|---|---|
| Open a contact and identify next action | Upcoming/overdue work is clear without expanding history | Pending |
| Log a call and create a follow-up | Both save together; correct outcome, owner and deadline | Pending |
| Record DNC with explicit preference change | Persistent contact warning; no silent preference changes | Pending |
| Create, correct and delete a note | Timeline updates after confirmation; audit retained | Pending |
| Reschedule a self-created open task | Allowed; manager-assigned deadlines remain protected | Pending |
| Create and update a linked opportunity | Correct stage, value, currency and next step in both workspaces | Pending |
| Switch workspace and navigate contacts | Filters and context retained as designed; draft loss guarded | Pending |
| Search and filter activity | Find relevant notes and due work without confusion | Pending |
| Recover from a failed save | Clear error, draft retained, no duplicate records | Pending |
| Use keyboard and mobile/tablet | Controls accessible and no clipped content | Pending |

Record participant role, date, task completion, errors, unnecessary clicks and actionable feedback. Do not claim acceptance until a real BDE has completed the scenarios and the responsible reviewer has signed off.

Release gates: strict contact lint, production build, browser suite, disposable MySQL baseline + migrations, backend integration, existing-database staging migration plan and upstream review. BDE acceptance is deferred for now. Repository-wide lint debt remains separately documented.

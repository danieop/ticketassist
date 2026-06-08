# TicketAssist User Testing Guide

This guide covers the current browser-testable workflow:

Developer creates a ticket workflow -> six agents run -> developer sends mentor draft -> mentor reviews -> workflow becomes reviewed.

## Prerequisites

- PostgreSQL is reachable through `DATABASE_URL`.
- `backend/.env` is configured with the OpenAI provider and embedding model.
- The backend has access to the default CardSeller repository files.
- Ports:
  - Backend: `http://localhost:4000`
  - Frontend: `http://localhost:3000`

Important env values:

```env
EMBEDDING_MODEL=text-embedding-3-small
```

The current workflow also uses the configured OpenAI chat model settings for the LLM-backed agents.

## Start The App

From `D:\ticketassist`:

```powershell
npm run typecheck
npm run build -w frontend
npm run start -w backend
npm run start -w frontend
```

If `npm run dev -w frontend` hangs locally, use the production build/start path above. That path was used for the browser test.

Health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:4000/health
Invoke-WebRequest -UseBasicParsing http://localhost:3000
```

## Test Accounts

Use these local test accounts if they exist in your database:

```text
Developer
Email: browser-dev@ticketassist.local
Password: BrowserPass123

Mentor
Email: browser-mentor@ticketassist.local
Password: BrowserPass123
```

If they do not exist, create them through the backend service or register and approve users through the app/admin flow.

## Developer Workflow Test

1. Open `http://localhost:3000/login`.
2. Login as the developer account.
3. Confirm you land on `http://localhost:3000/developer`.
4. In `Run agent pipeline`, enter:

```text
Title: Checkout hangs after coupon is applied
Description: Checkout shows an infinite spinner after a coupon is applied. No order is created in production for multiple users. Removing the coupon lets checkout complete.
Reporter: Manual Browser Tester
Source: MANUAL
```

5. Click `Run workflow`.
6. Wait for `6/6 steps complete`.
7. Expected final agent status before handoff:

```text
Ticket Analyzer: Success
Priority Classifier: Success
Repo Search: Success
Code Context: Success
Fix Proposal: Success
Mentor Draft: Success
Workflow status: Mentor draft ready
```

8. Confirm the page displays:
   - Analysis
   - Priority
   - Repository context with snippets and file paths
   - Fix proposal
   - Mentor draft
9. Click `Send to mentor`.
10. Expected status changes to `Waiting for review`.

## Mentor Review Test

1. Click `Switch account`.
2. Login as the mentor account.
3. Confirm you land on `http://localhost:3000/mentor`.
4. Confirm the submitted workflow appears in the review queue.
5. Select the workflow.
6. Review:
   - Draft
   - Fix proposal
   - Code context
   - Priority
   - Analysis
7. Choose a decision:

```text
Approve
Reject
Need more info
```

8. Enter a comment.
9. Click `Submit decision`.
10. Expected result:

```text
Review submitted: APPROVED
The reviewed workflow disappears from the pending queue.
Workflow status becomes reviewed.
```

## Expected Backend Evidence

For a successful workflow:

- `WorkflowRun.status` reaches `REVIEWED` after mentor review.
- Six `AgentRun` records are successful.
- Trace logs exist for all six agent nodes.
- `RepoSearchResult` contains top-k snippets, not whole files.
- `WorkflowState` contains:
  - `ticketAnalysis`
  - `priorityClassification`
  - `repoSearchResults`
  - `codeContext`
  - `fixProposal`
  - `mentorDraft`
  - `reviewDecision`
- `MentorReview.mentor.email` should match the logged-in mentor.

## Troubleshooting

- If the workflow stops before `6/6`, check backend logs and OpenAI/env configuration.
- Repo search now uses structure-aware, versioned chunking; if repository context looks stale after a search change, rerun with reindex/force rebuild.
- If embedding config is unavailable, repo search should still fall back to keyword search and store warnings instead of failing.
- If the mentor queue is empty, confirm the developer clicked `Send to mentor` and the workflow status is `waiting_for_review`.
- If login redirects to the wrong dashboard, click `Switch account` to clear browser session storage and cookies.
- If port `3000` is already in use, stop the existing frontend process or start on another port.

## Browser Test Result From This Session

Verified in browser:

- Developer login works.
- Protected `/developer` route redirects unauthenticated users to login.
- Developer UI launched a real six-agent workflow.
- Workflow reached `Mentor draft ready`.
- Developer handoff changed status to `Waiting for review`.
- Mentor login works.
- Mentor queue loaded the submitted workflow.
- Mentor approval changed workflow status to `REVIEWED`.
- The saved mentor reviewer was `browser-mentor@ticketassist.local`.

Screenshot artifact:

```text
D:\ticketassist\docs\browser-mentor-reviewed.png
```

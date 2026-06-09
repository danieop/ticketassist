# TicketAssist

Prototype he thong ho tro developer xu ly bug ticket bang sequential multi-agent workflow.

Product hien tai gom:

- `frontend/`: Next.js UI cho Developer, Mentor, Admin, Tickets va Codebase.
- `backend/`: Express + TypeScript API.
- `backend/prisma/`: Prisma schema, migrations va seed.
- `docs/`: tai lieu kien truc, workflow, API va huong dan testing.
- `backend/codebasetest/`: codebase Java/JSP mau de demo repo search.

## Core Workflow

Luot xu ly chinh:

```text
Ticket
  -> TicketAnalyzerAgent
  -> PriorityClassifierAgent
  -> RepoSearchAgent
  -> CodeContextAgent
  -> FixProposalAgent
  -> MentorDraftAgent
  -> Developer submit
  -> Mentor review
```

He thong tao phan tich, code context, fix proposal va mentor draft. He thong khong tu dong sua source code va khong tu dong gui phan hoi cho khach hang.

## Stack

- Frontend: Next.js, React, TypeScript.
- Backend: Express, TypeScript.
- Database: PostgreSQL + Prisma.
- Vector search: PostgreSQL pgvector.
- Orchestration: LangGraph JS.
- AI: OpenAI-compatible chat/completions va embeddings.
- Storage: local filesystem hoac SFTP cho repository upload.

## Environment

Copy file cau hinh mau:

```bash
copy .env.example .env
```

Bien quan trong:

```env
DATABASE_URL=
JWT_SECRET=
NETWORK_FILE_STORAGE=
OPENAI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
EMBEDDING_MODEL=text-embedding-3-small
REPO_INDEX_NAME=default-repo-index
```

Neu khong co `OPENAI_API_KEY`, mot so agent/search path co fallback deterministic de demo local, nhung ket qua khong dai dien cho chat luong AI that.

## Setup

```bash
npm install
npm run prisma:generate -w backend
npm run prisma:migrate -w backend
npm run db:seed -w backend
npm run dev
```

Mac dinh:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Health check: `http://localhost:4000/health`

## Main Pages

- `/login`, `/register`: dang nhap/dang ky.
- `/developer`: tao workflow, accept/rerun/edit agent output, submit cho mentor.
- `/mentor`: review queue, approve/reject/request changes.
- `/admin`: quan ly user va registration requests.
- `/tickets`: CRUD ticket.
- `/codebase`: upload va browse repository.

Trang `/` la gateway live. Neu da dang nhap, middleware se redirect theo role.

## API Security

API noi bo yeu cau bearer token:

```http
Authorization: Bearer <accessToken>
```

Role guard hien tai:

- Developer/Admin: create ticket, upload codebase, run workflow, accept/rerun/edit outputs, submit review.
- Mentor/Admin: submit mentor review.
- Admin: user management va registration approval.
- Authenticated users: list/read workflows, tickets, agents va repositories theo endpoint cho phep.

## Useful Scripts

```bash
npm run dev
npm run typecheck
npm run build
npm run demo:workflow -w backend
npm run prisma:studio -w backend
```

## Current Limitations

- Chua co automated test suite day du; hien moi typecheck la baseline.
- Queue workflow dang la in-memory, chua ben vung khi server restart.
- Repo chunking/search con heuristic, chua AST/call graph that.
- Quality cua AI output chua co benchmark/evaluation dashboard.
- Product van dung mentor/developer human-in-the-loop, chua tao PR hay chay test runner tu dong.

## Recommended Next Work

1. Them integration tests cho auth/role, workflow transitions, repo upload va mentor review.
2. Chuyen job queue sang DB-backed hoac Redis-backed queue.
3. Nang repo intelligence bang AST parser/tree-sitter va reranking.
4. Them evaluation dataset cho retrieval va fix proposal quality.

# TicketAssist Starter

Starter repo cho bài Internship: **Sequential Multi-Agent System xử lý Ticket báo lỗi**.

Repo này cố ý chỉ có:

- `frontend/`: Next.js Hello World template.
- `backend/`: minimal Node.js server với `GET /health`.
- `docs/`: mô tả yêu cầu, kiến trúc gợi ý, state schema gợi ý, API gợi ý.
- `.env.example`: placeholder cấu hình OpenAI-compatible provider để intern dùng khi tự làm backend.

Repo **không có agent code**, **không có orchestrator code**, và **không có database code**. Backend hiện chỉ là health-check skeleton để intern tự phát triển tiếp.

## Cấu Trúc

```text
ticketassist/
  backend/         Minimal /health API only
  frontend/        Next.js Hello World template
  docs/            Project requirements and implementation guide
  .env.example     OpenAI key/model config template
```

## Chạy Frontend

```bash
npm install
npm run dev
```

Mở:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:4000/health`

## OpenAI Config

Copy `.env.example` khi bạn bắt đầu tự xây backend:

```bash
copy .env.example .env.local
```

Các biến có sẵn:

```env
OPENAI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_EXTRA_HEADERS={}
AI_MODEL_ANALYZER=gpt-4.1-mini
AI_MODEL_PRIORITY=gpt-4.1-mini
AI_MODEL_CODE_CONTEXT=gpt-4.1-mini
AI_MODEL_FIX_PROPOSAL=gpt-4.1-mini
AI_MODEL_MENTOR_DRAFT=gpt-4.1-mini
```

Không đưa `OPENAI_API_KEY` vào frontend client-side code. Key phải nằm ở backend/server-side.

## Intern Cần Tự Làm

- Backend API.
- Workflow State.
- Orchestrator.
- Agent interface.
- Ticket Analyzer Agent.
- Priority Classifier Agent.
- Repo Search Agent.
- Code Context Agent.
- Fix Proposal Agent.
- Mentor Draft Agent.
- Human-in-the-loop Mentor review.
- Persistence nếu chọn dùng PostgreSQL.

Đọc docs theo thứ tự:

1. [Project Brief](./docs/PROJECT_BRIEF.md)
2. [Architecture Guide](./docs/ARCHITECTURE_GUIDE.md)
3. [Workflow State Guide](./docs/WORKFLOW_STATE_GUIDE.md)
4. [Agent Guide](./docs/AGENT_GUIDE.md)
5. [API Guide](./docs/API_GUIDE.md)
6. [Delivery Checklist](./docs/DELIVERY_CHECKLIST.md)

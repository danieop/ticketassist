# Product Limitations And Next Steps

## Current Product State

TicketAssist hien da co luong live cho Developer, Mentor va Admin:

- Developer tao workflow, review tung agent handoff, edit output, rerun agent va submit mentor draft.
- Mentor xem queue va approve, reject hoac request more information.
- Admin xem user va registration request live tu backend.
- Codebase browser ho tro upload repository, xem file va dung repository do cho workflow search.

Backend da bao ve cac API noi bo bang bearer token va role guard. Frontend gui `Authorization: Bearer <accessToken>` cho cac request live.

## Known Limitations

- Chua co automated test suite day du; `npm run typecheck` moi la baseline verification.
- Workflow queue dang in-memory, nen pending/running jobs co the mat khi backend restart.
- Repo chunking/search con dua tren heuristic va regex, chua co AST/call graph chinh xac.
- Dependency graph hien la suy luan tu layer/path/symbol, khong phai static analysis graph that.
- AI output chua co evaluation dataset de do retrieval precision, hallucination rate, mentor approval rate.
- Product chua tao PR, chua apply patch va chua chay test runner tu dong; human-in-the-loop van la diem dung bat buoc.

## Recommended Next Steps

1. Them tests cho auth/role matrix, workflow transitions, repo upload safety va mentor review.
2. Doi workflow queue sang DB-backed queue hoac Redis/BullMQ de co retry, resume va observability.
3. Nang repo intelligence bang AST parser/tree-sitter cho Java/JS/TS/Python va xay symbol/reference graph.
4. Tao benchmark ticket mau voi expected relevant files de do search quality va agent output quality.
5. Them export report hoac Jira/GitHub integration sau khi mentor approve, van giu human approval truoc khi gui/sua code.

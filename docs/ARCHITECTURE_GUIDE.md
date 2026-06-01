# Architecture Guide

Đây là hướng dẫn thiết kế, không phải implementation có sẵn.

## Thành Phần Tối Thiểu

```text
Frontend UI hoặc API client
  -> Backend API
  -> Orchestrator
  -> Workflow State
  -> Sequential Agents
  -> Persistence
  -> Mentor Review
```

## Orchestrator

Orchestrator chỉ nên điều phối workflow:

- Khởi tạo workflow state.
- Gọi từng agent theo đúng thứ tự.
- Truyền state từ agent trước sang agent sau.
- Dừng workflow nếu agent lỗi nghiêm trọng.
- Ghi trạng thái xử lý và trace.
- Trả final state cho UI/API.

Orchestrator không nên trực tiếp phân tích ticket, phân loại priority, search repo hoặc viết draft.

## Agent Interface Gợi Ý

```ts
interface Agent {
  name: string;
  requiredStatus: WorkflowStatus[];
  run(state: WorkflowState): Promise<WorkflowState>;
}
```

Mỗi agent cần:

- Validate dữ liệu đầu vào.
- Chỉ cập nhật phần state thuộc trách nhiệm của mình.
- Báo lỗi rõ ràng khi thiếu dữ liệu.
- Không ghi đè dữ liệu của agent khác.

## Gợi Ý Stack

- Backend: Node.js + TypeScript + Express hoặc Fastify.
- Frontend: Next.js hoặc React.
- Database: PostgreSQL.
- AI: OpenAI SDK hoặc provider OpenAI-compatible.
- Repo search: keyword search trước, nâng cấp semantic search sau.

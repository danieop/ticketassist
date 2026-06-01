# API Guide

Intern có thể làm UI hoặc API. Nếu làm API, nên có tối thiểu các endpoint sau.

Starter repo hiện chỉ cài sẵn:

```http
GET /health
```

Response:

```json
{
  "ok": true,
  "service": "ticketassist-backend"
}
```

Các endpoint dưới đây là phần intern cần tự triển khai.

## Run Workflow

```http
POST /api/workflows
Content-Type: application/json

{
  "ticket": {
    "title": "Checkout fails",
    "description": "Customer cannot pay with saved card",
    "environment": "production"
  }
}
```

Response nên là `WorkflowState`.

## Get Workflow State

```http
GET /api/workflows/:id
```

Trả về state hiện tại, bao gồm agent status, trace và error nếu có.

## Mentor Review

```http
POST /api/workflows/:id/review
Content-Type: application/json

{
  "decision": "need_more_information",
  "note": "Please confirm affected release version."
}
```

Decision gợi ý:

- `approved`
- `rejected`
- `need_more_information`

## Error Handling

Nếu agent thiếu dữ liệu hoặc AI trả JSON sai format:

- Ghi error vào state.
- Chuyển status sang `failed`.
- Không chạy các agent tiếp theo.

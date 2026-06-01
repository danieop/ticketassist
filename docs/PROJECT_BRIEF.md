# Project Brief

Xây dựng prototype hỗ trợ developer xử lý ticket báo lỗi theo kiến trúc **Sequential Multi-Agent Workflow**.

Luồng bắt buộc:

```text
Input Ticket
  -> Workflow State
  -> Agent 1
  -> Updated State
  -> Agent 2
  -> Updated State
  -> ...
  -> Final State
  -> Human Review
```

Hệ thống không được:

- Xử lý toàn bộ bằng một prompt lớn duy nhất.
- Gửi toàn bộ repository vào AI model.
- Tự động sửa code.
- Tự động gửi phản hồi cho khách hàng.
- Kết luận rằng lỗi đã được xử lý xong.

Kết quả cuối cùng chỉ là bản phân tích và bản nháp để Mentor review.

## Deliverables

Intern cần bàn giao:

- Source code.
- README hướng dẫn chạy.
- Mô tả kiến trúc multi-agent.
- Mô tả Workflow State.
- Mô tả từng Agent.
- Mô tả cách Orchestrator gọi Agent tuần tự.
- Mô tả cách search code trong repo.
- Mô tả cách xử lý lỗi.
- Demo bằng screenshot, video hoặc tài liệu ngắn.
- Danh sách hạn chế hiện tại.
- Đề xuất hướng phát triển tiếp theo.

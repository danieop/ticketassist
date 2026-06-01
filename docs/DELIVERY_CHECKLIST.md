# Delivery Checklist

Trước khi nộp bài, kiểm tra các mục sau.

## Architecture

- Có Orchestrator riêng.
- Có Workflow State trung tâm.
- Có Agent interface thống nhất.
- Agent chạy tuần tự, không gom vào một prompt lớn.
- Có state transition rõ ràng.
- Có trace/log từng agent.

## Agents

- Ticket Analyzer Agent.
- Priority Classifier Agent.
- Repo Search Agent.
- Code Context Agent.
- Fix Proposal Agent.
- Mentor Draft Agent.

## Safety

- Không gửi toàn bộ repo vào AI model.
- Không tự động sửa code.
- Không tự động gửi phản hồi cho khách hàng.
- Final state chờ Mentor review.

## UI hoặc API

- Nhập được ticket.
- Chạy được workflow.
- Hiển thị trạng thái từng agent.
- Hiển thị final result.
- Hiển thị lỗi nếu fail.
- Có Mentor review: approve, reject, need more information.

## Documentation

- README hướng dẫn chạy.
- Mô tả kiến trúc.
- Mô tả state.
- Mô tả từng agent.
- Mô tả repo search.
- Mô tả xử lý lỗi.
- Nêu hạn chế hiện tại.
- Nêu hướng phát triển tiếp theo.

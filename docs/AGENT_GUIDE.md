# Agent Guide

Intern cần tự triển khai ít nhất 6 agent sau.

## 1. Ticket Analyzer Agent

Input:

- Ticket title.
- Ticket description.
- Reporter/environment nếu có.

Output:

- Summary.
- Affected feature.
- Impacted flow.
- Extracted entities.
- Keywords cho repo search.
- Missing information.

## 2. Priority Classifier Agent

Input:

- Ticket.
- Ticket analysis.

Output:

- Priority level: `P0`, `P1`, `P2`, `P3`, `P4`.
- Severity.
- Confidence score.
- Rationale.

Nên phân biệt severity với priority.

## 3. Repo Search Agent

Input:

- Ticket.
- Ticket analysis.
- Keywords.

Output:

- Danh sách file hoặc code chunk liên quan.
- Score.
- Matched terms.
- Excerpt ngắn.

Không gửi toàn bộ repository vào model. Cần giới hạn số file và số ký tự mỗi chunk.

## 4. Code Context Agent

Input:

- Repo search results.
- Ticket analysis.

Output:

- File/chunk có khả năng liên quan nhất.
- Lý do liên quan.
- Risk notes.

## 5. Fix Proposal Agent

Input:

- Ticket analysis.
- Priority.
- Code context.

Output:

- Hypotheses.
- Recommended approach.
- Risks.
- Verification steps.

Agent này chỉ đề xuất, không sửa code.

## 6. Mentor Draft Agent

Input:

- Toàn bộ kết quả workflow.

Output:

- Draft gửi Mentor review.
- Nội dung rõ ràng, có cấu trúc.
- Không gửi tự động cho khách hàng.

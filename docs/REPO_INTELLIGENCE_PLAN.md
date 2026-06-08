# Kế Hoạch Nâng Cấp Repo Intelligence Và Repair Workflow

## Mục Tiêu
Nâng hệ thống từ search/chunk heuristic sang repo intelligence đa ngôn ngữ: hiểu cấu trúc code tốt hơn, tìm workflow/fix tương tự từ memory cũ, sinh patch/test, chạy verification, và tăng độ an toàn khi xử lý snippet/prompt.

## 1. Nâng Cấp Indexing
- Giữ chunking cấu trúc hiện tại như nền tảng.
- Nâng lên parser/symbol-based chunking cho các ngôn ngữ chính.
- Tách adapter theo ngôn ngữ thay vì khóa vào Java.
- Lưu symbol path, chunk kind, parser source, confidence, version mới.
- Giữ fallback heuristic cho file/language chưa có parser.

## 2. Parser Và Symbol Extractor
- Thêm parser thật cho TypeScript.
- Thêm parser thật cho JavaScript.
- Thêm parser thật cho Java.
- Thêm extractor cho JSP, gồm scriptlet, include, taglib, form/action mapping.
- Chuẩn hóa symbol output để dùng chung cho search, graph, và trace.

## 3. Dependency / Call Graph
- Xây graph giữa controller, service, DAO, model khi suy ra được.
- Bổ sung edge types: imports, calls, extends, implements, includes, routes_to, reads_from, writes_to, tests.
- Không hard-code repo Java; layer tagging phải suy ra từ symbol/path/pattern.
- Dùng graph để tăng độ chính xác search và code context selection.

## 4. Hybrid Search
- Giữ keyword + vector search.
- Thêm trọng số cho symbol match và graph proximity.
- Cân nhắc reranker cho top-N kết quả.
- Chuẩn hóa score để ổn định giữa repo khác nhau và ngôn ngữ khác nhau.
- Giảm bias vào filename/path thuần.

## 5. Memory Từ Ticket Cũ
- Lưu ticket, workflow, fix proposal, verification outcome, và mentor decision.
- Tạo cơ chế truy hồi các ticket/fix tương tự.
- Dùng memory để gợi ý workflow, root cause, patch pattern, và test pattern.
- Ưu tiên memory theo feature, symptom, symbol, và graph context.

## 6. Patch Proposal Agent
- Thay cơ chế fix proposal hiện tại bằng patch proposal có cấu trúc.
- Sinh diff/patch intent machine-readable, không auto apply.
- Gắn với code context, graph, và memory tương tự.
- Giữ trạng thái để mentor review trước khi sửa thật.

## 7. Test Generation Agent
- Sinh test case theo ngôn ngữ và framework của repo.
- Bao gồm regression test cho path lỗi và path liên quan.
- Ưu tiên test nhỏ, sát root cause, dễ chạy lại.
- Lưu test plan và generated test artifacts.

## 8. Verification Agent
- Chạy lint/test/build theo repo capability.
- Lưu log, exit code, artifact summary, và thời gian chạy.
- Đánh dấu rõ pass/fail/partial.
- Dùng kết quả verification làm đầu vào cho mentor review.

## 9. Redaction Và Safety
- Redact secret trong repo snippet.
- Redact secret trong prompt preview.
- Redact secret trong handoff payload và trace/log.
- Chỉ giữ path/symbol/structure cần thiết cho debug.
- Áp dụng trước khi persist, render UI, hoặc gửi sang agent khác.

## 10. Test Và Validation
- Test parser/symbol extraction cho TS, JS, Java, JSP.
- Test fallback cho repo/language chưa hỗ trợ đầy đủ.
- Test hybrid ranking với query thực tế.
- Test memory recall trên ticket cũ.
- Test redaction không làm rò secret.
- Test verification output trên repo có và không có test script.

## 11. Lộ Trình Gợi Ý
- Phase 1: parser/symbol chunking + index schema.
- Phase 2: graph + hybrid ranking.
- Phase 3: memory + patch/test/verification agents.
- Phase 4: redaction hardening và ổn định hóa workflow.

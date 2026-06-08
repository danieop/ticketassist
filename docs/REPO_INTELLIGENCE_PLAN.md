# Kế Hoạch Nâng Cấp Repo Intelligence Và Repair Workflow

## Mục Tiêu
Nâng hệ thống từ structure-aware chunking hiện tại lên repo intelligence đa ngôn ngữ: hiểu symbol/code flow tốt hơn, tìm workflow/fix tương tự từ memory cũ, sinh patch/test, chạy verification, và tăng độ an toàn khi xử lý snippet/prompt.

## 1. Nâng Cấp Indexing
- Giữ chunking theo cấu trúc hiện tại như nền tảng, không làm lại từ line-based thuần.
- Nâng dần lên symbol-based chunking bằng một lớp parse/extract dùng chung cho nhiều ngôn ngữ.
- Mỗi chunk nên gắn thêm symbol path, chunk kind, language, parser source, confidence, content hash, và index version mới.
- Giữ fallback heuristic hiện tại cho file/language chưa parse được để mọi repo vẫn có thể index.
- Reindex theo version để tránh dùng lẫn dữ liệu cũ `structure-v2` với dữ liệu symbol-aware mới.

## 2. Universal Parser / Symbol Layer
- Không xây parser riêng biệt nặng cho từng ngôn ngữ nếu có thể tránh; ưu tiên một nền chung như Tree-sitter hoặc Universal Ctags.
- Dùng adapter mỏng theo ngôn ngữ để chuẩn hóa output về cùng schema: symbols, ranges, imports/includes, calls, routes, metadata.
- TypeScript, JavaScript, Java, JSP là nhóm adapter đầu tiên vì repo hiện có và use case gần nhất cần các ngôn ngữ này.
- Với ngôn ngữ thông dụng khác, thêm grammar/ctags mapping theo cùng interface thay vì sửa pipeline search/agent.
- Khi parser lỗi, thiếu grammar, hoặc repo có syntax không đầy đủ, tự động rơi về heuristic extractor hiện tại.

## 3. Dependency / Call Graph
- Xây graph chung từ symbol output, không khóa vào Java.
- Bổ sung edge types: imports, calls, extends, implements, includes, routes_to, reads_from, writes_to, tests.
- Controller, service, DAO, model chỉ là layer tags suy ra từ path, naming, annotation/decorator, framework convention, hoặc symbol metadata.
- Với repo không theo mô hình controller/service/DAO/model, graph vẫn hoạt động theo symbol và dependency edge chung.
- Dùng graph để mở rộng code context quanh symbol liên quan, không chỉ quanh file/path match.

## 4. Hybrid Search
- Giữ keyword + vector search hiện tại.
- Thêm điểm cho symbol match, layer match, và graph proximity.
- Chuẩn hóa score để ổn định giữa repo khác nhau và ngôn ngữ khác nhau.
- Cân nhắc reranker cho top-N kết quả sau khi đã merge keyword/vector/symbol/graph.
- Giảm bias vào filename/path thuần bằng cách ưu tiên symbol, call path, và chunk context khi có tín hiệu đủ mạnh.

## 5. Memory Từ Ticket Cũ
- Lưu ticket, workflow output, code context, patch proposal, verification outcome, và mentor decision.
- Tạo cơ chế truy hồi các ticket/fix tương tự theo symptom, feature, symbol, graph context, và kết quả xử lý.
- Dùng memory để gợi ý root cause, workflow, patch pattern, và test pattern.
- Không dùng memory như bằng chứng tuyệt đối; agent phải nêu rõ đây là case tương tự và cần xác minh trên repo hiện tại.

## 6. Patch Proposal Agent
- Thay cơ chế fix proposal hiện tại bằng patch proposal có cấu trúc hơn.
- Sinh diff/patch intent machine-readable, không auto apply.
- Gắn patch proposal với code context, graph path, ticket memory, risks, và verification plan.
- Giữ trạng thái để mentor review trước khi sửa thật.
- Nếu context chưa đủ mạnh, agent phải đề xuất điều tra thêm thay vì tạo patch giả chắc chắn.

## 7. Test Generation Agent
- Sinh test case theo ngôn ngữ và framework phát hiện được từ repo.
- Bao gồm regression test cho path lỗi và path liên quan.
- Ưu tiên test nhỏ, sát root cause, dễ chạy lại.
- Lưu test plan và generated test artifacts.
- Nếu repo không có test framework rõ ràng, sinh manual verification checklist hoặc skeleton test có cảnh báo.

## 8. Verification Agent
- Phát hiện command phù hợp từ repo metadata, package/build files, và convention.
- Chạy lint/test/build theo repo capability.
- Lưu log, exit code, artifact summary, duration, và pass/fail/partial status.
- Dùng kết quả verification làm đầu vào cho mentor review.
- Không coi verification pass là đảm bảo fix đúng; vẫn cần mentor review và risk notes.

## 9. Redaction Và Safety
- Redact secret trong repo snippet.
- Redact secret trong prompt preview.
- Redact secret trong handoff payload và trace/log.
- Chỉ giữ path/symbol/structure cần thiết cho debug.
- Áp dụng redaction trước khi persist, render UI, hoặc gửi sang agent khác.

## 10. Test Và Validation
- Test universal parser/symbol layer cho TS, JS, Java, JSP.
- Test fallback cho repo/language chưa hỗ trợ đầy đủ.
- Test graph extraction trên repo có controller/service/DAO/model và repo không theo pattern đó.
- Test hybrid ranking với query thực tế để đo tác động của symbol/graph score.
- Test memory recall trên ticket cũ.
- Test redaction không làm rò secret.
- Test verification output trên repo có và không có test script.

## 11. Lộ Trình Gợi Ý
- Phase 1: universal parser/symbol layer + index schema mới.
- Phase 2: dependency/call graph + hybrid ranking có symbol/graph score.
- Phase 3: memory + patch/test/verification agents.
- Phase 4: redaction hardening và ổn định hóa workflow.

<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<!DOCTYPE html>
<html>
<head>
    <title>Lịch Sử Mua Hàng</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    <style>
        .container {
            text-align: center;
        }
        h1 {
            margin-bottom: 30px;
        }
        .back-button {
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <a href="home" class="btn btn-secondary back-button">
        <i class="fas fa-arrow-left"></i> Trang chủ
    </a>
    <div class="container">
        <h1>Lịch Sử Mua Hàng</h1>
        <table class="table table-striped">
            <thead class="thead-dark">
                <tr>
                    <th>Ngày Mua Hàng</th>
                    <th>Sản Phẩm</th>
                    <th>Feedback</th>
                </tr>
            </thead>
            <tbody>
                <c:forEach items="${lists}" var="item">
                    <tr>
                        <td>${item.buyDate}</td>
                        <td>
                            <c:forEach items="${item.listPurchaseByOrder}" var="prod">
                                <small>${prod.providerName} ${prod.price} VND (Số lượng: ${prod.quantity})</small><br>
                            </c:forEach>
                        </td>
                        <td>
                            <button type="button" class="btn btn-primary feedback-button" data-toggle="modal" data-target="#feedbackModal"
                                data-userid="${item.listPurchaseByOrder.get(0).userId}" data-orderid="${item.listPurchaseByOrder.get(0).orderId}">
                                Gửi Feedback
                            </button>
                        </td>
                    </tr>
                </c:forEach>
            </tbody>
        </table>
    </div>
    <div class="container mt-3">
        <ul class="pagination justify-content-center">
            <c:forEach begin="1" end="${endP}" var="i">
                <li class="page-item <c:if test="${i == idx}">active</c:if>">
                    <a href="purchasehistory?idx=${i}" class="page-link">${i}</a>
                </li>
            </c:forEach>
        </ul>
    </div>

    <!-- Feedback Modal -->
    <div class="modal fade" id="feedbackModal" tabindex="-1" role="dialog" aria-labelledby="feedbackModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="feedbackModalLabel">Gửi Feedback</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="feedbackForm">
                        <div class="form-group">
                            <label for="feedback">Feedback</label>
                            <textarea class="form-control" id="feedback" name="feedback" rows="3" required></textarea>
                        </div>
                        <input type="hidden" id="userid" name="userid">
                        <input type="hidden" id="orderid" name="orderid">
                        <button type="button" class="btn btn-primary" id="submitFeedback">Gửi</button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <script>
        $(document).ready(function () {
            $('#feedbackModal').on('show.bs.modal', function (event) {
                var button = $(event.relatedTarget);
                var userId = button.data('userid');
                var orderId = button.data('orderid');
                var modal = $(this);
                modal.find('#userid').val(userId);
                modal.find('#orderid').val(orderId);
                // Store the button that opened the modal
                $('#submitFeedback').data('button', button);
            });

            $('#submitFeedback').click(function() {
                var formData = {
                    userid: $('#userid').val(),
                    orderid: $('#orderid').val(),
                    feedback: $('#feedback').val()
                };

                $.ajax({
                    type: 'POST',
                    url: 'feedback',
                    data: formData,
                    success: function(response) {
                        alert('Cảm ơn bạn đã gửi phản hồi!');
                        $('#feedback').val('');
                        $('#feedbackModal').modal('hide');
                    },
                    error: function() {
                        alert('Có lỗi xảy ra khi gửi phản hồi. Vui lòng thử lại.');
                    }
                });
            });
        });
    </script>
</body>
</html>

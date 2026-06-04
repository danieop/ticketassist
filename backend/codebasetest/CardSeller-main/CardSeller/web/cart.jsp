<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<jsp:include page="header.jsp"/>
<div class="cart-content">
    <div class="breadcrumb-option">
        <div class="container">
            <div class="row">
                <div class="col-lg-12">
                    <div class="breadcrumb__links">
                        <a href="home"><i class="fa fa-home"></i> Trang chủ</a>
                        <span>Giỏ hàng của bạn</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <c:choose>
        <c:when test="${CARTS.size() == 0}">
            <div style="background-image: url('/img/empty_cart.svg'); background-size: contain; width: 800px; height: 80vh; background-repeat: no-repeat; background-position:center; margin: 0 auto;">
                <div class="pt-5">
                    <h6 class="mb-0">
                        <a href="home" class="text-body">
                            <i class="fas fa-long-arrow-alt-left me-2"></i>Nhấn vào đây để trở lại mua hàng
                        </a>
                    </h6>
                </div>
            </div>
        </c:when>
        <c:otherwise>
            <section class="shop-cart spad">
                <div class="container">
                    <div class="row">
                        <div class="col-lg-12">
                            <div class="shop__cart__table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Tên sản phẩm</th>
                                            <th>Mệnh giá</th>
                                            <th>Discount</th>
                                            <th>Số lượng</th>
                                            <th>Giá tiền</th>
                                            <th></th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <c:forEach items="${CARTS}" var="c">
                                            <tr>
                                                <td class="cart__product__item">
                                                    <div class="cart__product__item__title">
                                                        <h6>${c.providerName}</h6>
                                                    </div>
                                                </td>                          
                                                <td class="cart__price"><fmt:formatNumber maxFractionDigits = "3" value="${c.price}"/> VNĐ</td>
                                                <td class="cart__price">${c.percent}%</td>
                                                <td class="cart__quantity">
                                                    <div class="pro-qty">
                                                        <a class="dec qtybtn" href="#" data-id="${c.id}" data-action="dec">-</a>
                                                        <input type="text" value="${c.quantity}" data-id="${c.id}"/>
                                                        <a class="inc qtybtn" href="#" data-id="${c.id}" data-action="inc">+</a>
                                                    </div>
                                                </td>
                                                <td class="cart__total" data-id="${c.id}"><fmt:formatNumber maxFractionDigits = "3" value="${c.totalPrice}"/> VNĐ</td>
                                                <td >
                                                    <a href="cart?action=remove&cartItemId=${c.id}">
                                                        <span>X</span>
                                                    </a>
                                                </td>
                                            </tr>
                                        </c:forEach>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-lg-6 col-md-6 col-sm-6">
                            <div class="cart__btn">
                                <a href="home">Tiếp tục mua sắm</a>
                            </div>
                        </div>
                        <div class="col-lg-6 col-md-6 col-sm-6">
                            <div class="cart__btn update__btn">
                                <a href="#"><span class="icon_loading"></span> cập nhật giỏ hàng</a>
                            </div>
                        </div>
                    </div>
                    <div class="row">

                        <div class="col-lg-4 ml-auto pr-3">
                            <div class="cart__total__procced">
                                <h6>Chi tiết thanh toán</h6>
                                <ul>
                                    <li>Tổng giỏ hàng <span id="totalCartValue"><fmt:formatNumber maxFractionDigits = "3" value="${TOTAL_PRICE}"/> VNĐ</span></li>
                                </ul>
                                <a href="CheckOutController" class="primary-btn">Tiến hành đặt hàng</a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </c:otherwise>
    </c:choose>

    <jsp:include page="footer.jsp"/>

</div>

<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>

<script>
    $(document).ready(function () {
        $('.qtybtn').on('click', function (e) {
            e.preventDefault();
            var $this = $(this);
            var cartItemId = $this.data('id');
            var newQuantity = parseInt($this.siblings('input[type="text"]').val());
            var actionType = $this.hasClass('inc') ? 1 : -1;
            newQuantity += actionType;

            if (newQuantity < 1)
                newQuantity = 1; // Ensure quantity never goes below 1

                
            $.ajax({
                type: 'GET',
                url: 'cart?action=update',
                data: {
                    cartItemId: cartItemId,
                    cardquantity: newQuantity
                },
                success: function (response) {
                    console.log(response);
                    console.log("totalPrice Card" + response.totalPriceCard);
                    if (response.status === 'success') {
                        $('td.cart__total[data-id="' + cartItemId + '"]').text(response.totalPriceCard + ' VNĐ');
                        $this.siblings('input[type="text"]').val(newQuantity);
                        $('#totalCartValue').text(response.totalPrice + ' VNĐ');
                    } else {
                        $this.siblings('input[type="text"]').val(newQuantity - 1);
                        alert(response.message);
                    }
                },
                error: function (xhr) {
                    alert('Error: ' + xhr.responseText);
                }
            });
        });
    });
</script>




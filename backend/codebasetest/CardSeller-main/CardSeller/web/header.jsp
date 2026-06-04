<%@ page import="java.net.URLEncoder" %>
<%@ page pageEncoding="UTF-8" contentType="text/html; charset = UTF-8" %>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="description" content="Ashion Template">
        <meta name="keywords" content="Ashion, unica, creative, html">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Card seller</title>
        <link rel="icon" type="image/x-icon" href="${pageContext.request.contextPath}/img/logo.jpg">
        <link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
        <link href="https://fonts.googleapis.com/css2?family=Cookie&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="${pageContext.request.contextPath}/css/bootstrap.min.css" type="text/css">
        <link rel="stylesheet" href="${pageContext.request.contextPath}/css/fontawesome.min.css" type="text/css">
        <link rel="stylesheet" href="${pageContext.request.contextPath}/css/font-awesome.min.css" type="text/css">
        <link rel="stylesheet" href="${pageContext.request.contextPath}/css/elegant-icons.css" type="text/css">
        <link rel="stylesheet" href="${pageContext.request.contextPath}/css/jquery-ui.min.css" type="text/css">
        <link rel="stylesheet" href="${pageContext.request.contextPath}/css/magnific-popup.css" type="text/css">
        <link rel="stylesheet" href="${pageContext.request.contextPath}/css/owl.carousel.min.css" type="text/css">
        <link rel="stylesheet" href="${pageContext.request.contextPath}/css/slicknav.min.css" type="text/css">
        <link rel="stylesheet" href="${pageContext.request.contextPath}/css/style.css" type="text/css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
        <style>
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 20px;
                background-color: #fff;
            }
            .header__logo img {
                height: 60px;
            }
            .header__menu ul {
                display: flex;
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .header__menu li {
                margin-right: 20px;
            }
            .header__menu a {
                text-decoration: none;
                color: #000;
                font-weight: 600;
            }
            .header__right {
                display: flex;
                align-items: center;
            }
            .header__right a {
                margin-left: 20px;
                text-decoration: none;
                color: #000;
                font-weight: 600;
            }
            @media (max-width: 768px) {
                .header__menu, .header__right {
                    display: none;
                }
                .canvas__open {
                    display: block;
                }
            }
            body, html {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                overflow-x: hidden;
            }
            .w3-content {
                position: relative;
                width: 100%;
                max-width: 100%;
            }
            .mySlides {
                display: none;
                width: 100%;
            }
        </style>
    </head>
    <body>
        <div id="preloder">
            <div class="loader"></div>
        </div>
        <div class="offcanvas-menu-overlay"></div>
        <div class="offcanvas-menu-wrapper">
            <div class="offcanvas__close">+</div>
            <ul class="offcanvas__widget">
                <li><span class="icon_search search-switch"></span></li>
                <li><span class="icon_heart_alt"></span><div class="tip">2</div></li>
                <li><a href="#"><span class="icon_bag_alt"></span><div class="tip">2</div></a></li>
            </ul>
            <div class="offcanvas__logo"><a href="./index.html"><img src="${pageContext.request.contextPath}/img/logo-card.jpg" alt=""></a></div>
            <div id="mobile-menu-wrap"></div>
            <div class="offcanvas__auth">
                <c:if test="${acc == null}">
                    <a href="login.jsp">Đăng nhập</a>
                    <a href="signup.jsp">Đăng ký</a>
                </c:if>
                <c:if test="${acc != null}">
                    <a href="vnpay_pay.jsp">Nạp tiền</a>
                    <a href="manageamount">Số dư:<fmt:formatNumber  maxFractionDigits = "3" value="${uwallet.amount}"/>đ</a>
                    <a href="profile.jsp">${acc.username}/</a>
                    <a href="logout">Đăng xuất</a>
                </c:if>
                <a href="cart?action=view">Cart</a>
            </div>
        </div>
        <header class="header">
            <div class="header__logo">
                <a href="home"><img src="${pageContext.request.contextPath}/img/logo-card.jpg" alt=""></a>
            </div>
            <nav class="header__menu">
                <ul>
                    <li><a href="home">Trang chủ</a></li>
                    <li><a href="purchasehistory">Lịch sử mua hàng</a></li>
                    <li><a href="topCards">Sản phẩm được mua nhiều nhất</a></li>
                        <c:if test="${acc.role == 'admin'}">
                        <li><a href="manageproduct">Trang Điều Hành</a></li>
                        </c:if>
                </ul>
            </nav>
            <div class="header__right">
                <c:if test="${acc == null}">
                    <a href="login.jsp">Đăng nhập</a>
                    <a href="signup.jsp">Đăng ký</a>
                </c:if>
                <c:if test="${acc != null}">
                    <a href="vnpay_pay.jsp">Nạp tiền</a>
                    <a href="manageamount">Số dư:<fmt:formatNumber  maxFractionDigits = "3" value="${uwallet.amount}"/>đ</a>
                    <a href="profile.jsp">${acc.username}</a>
                    <a href="logout">Đăng xuất</a>
                </c:if>
                <a href="cart?action=view">Giỏ hàng</a>
            </div>
            <div class="canvas__open">
                <i class="fa fa-bars"></i>
            </div>
        </header>
        <div class="w3-content w3-section">
            <a href="https://vivnpay.vn/"> 
                <img class="mySlides" src="https://static.vivnpay.vn/202407100843/Qu%C3%BD%203%20CTKM.jpg" alt="Promotion Image">
            </a>
            <a href="https://vivnpay.vn/khuyen-mai/cuong-nhiet-cung-euro-2024-rinh-ngay-thuong-lon-voi-vi-vnpay">
                <img class="mySlides" src="https://static.vivnpay.vn/202406121551/cuong-nhiet-cung-euro-2024-rinh-ngay-thuong-lon-voi-vi-vnpay.jpg" alt="vnpayy">
            </a>
            <a href="https://vivnpay.vn/">
                <img class="mySlides" src="https://static.vivnpay.vn/202404220921/mo-vietcombank-tren-vi-vnpay.jpg" alt="vnpay">
            </a>
        </div>
        <script>
            var myIndex = 0;
            carousel();

            function carousel() {
                var i;
                var x = document.getElementsByClassName("mySlides");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                myIndex++;
                if (myIndex > x.length) {
                    myIndex = 1;
                }
                x[myIndex - 1].style.display = "block";
                setTimeout(carousel, 2000); // Change image every 2 seconds
            }
        </script>
    </body>
</html>
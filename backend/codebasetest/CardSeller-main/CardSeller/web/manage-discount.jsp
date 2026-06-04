<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@ page import="model.User" %>
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Quản lý giảm giá</title>
        <link href="css/manage.css" rel="stylesheet" type="text/css"/>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
    </head>
    <%
           User acc = (User) request.getSession().getAttribute("acc");
              try{
              if(!acc.role.equals("admin")){
              response.sendRedirect("login.jsp");
              }
          }catch(Exception e){
              response.sendRedirect("login.jsp");
          }
    %>

    <header>
        <nav class="navbar navbar-expand-lg bg-body-tertiary">
            <div class="container-fluid">
                <a class="navbar-brand">Trang Điều Hành</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarSupportedContent">
                    <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                        <li class="nav-item">
                            <a class="nav-link active" aria-current="page" href="home">Trang Chủ</a>
                        </li>

                        <li class="nav-item">
                            <a class="nav-link" aria-current="page" href="manageproduct">Quản Lý Sản Phẩm</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" aria-current="page" href="manageaccount">Quản lý Tài khoản</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" aria-current="page" href="manageDiscount">Quản lý Giảm Giá</a>
                        </li>

                    </ul>
                    <ul class="navbar-nav me-20 mb-2 mb-lg-0">
                        <c:if test="${sessionScope.acc!=null}">
                            <li class="nav-item">
                                <a class="nav-link" href="profile.jsp">${sessionScope.acc.username}</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="logout">Đăng xuất</a>
                            </li>
                        </c:if>
                    </ul>
                </div>
            </div>
        </nav>
    </header>
    <section style="background-color: #ffffff; margin-bottom: 100px">
        <div class="container py-5">
            <div class="d-flex flex-column mt-4 col-md-6 col-lg-3 col-xl-3 border-sm-start-none border-start" style="margin-bottom: 10px">                
                <a class="btn btn-outline-primary btn-sm mt-2" href="addDiscount">Thêm chương trình giảm giá mới</a>             
            </div>
            <div class="row justify-content-center mb-3">
                <div class="col-md-12 col-xl-10">
                    <c:forEach var="cardDis" items="${list}">
                        <div class="card shadow-0 border rounded-3">
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-12 col-lg-3 col-xl-3 mb-4 mb-lg-0">
                                        <div class="bg-image hover-zoom ripple rounded ripple-surface">
                                            <img src="${cardDis.getImage()}"
                                                 class="w-100" />
                                            <a href="#!">
                                                <div class="hover-overlay">
                                                    <div class="mask" style="background-color: rgba(253, 253, 253, 0.15);"></div>
                                                </div>
                                            </a>
                                        </div>
                                    </div>
                                    <div class="col-md-6 col-lg-6 col-xl-6">
                                        <h5>${cardDis.getProviderName()}</h5>
                                        <div class="d-flex flex-row">
                                            <h6>Thẻ điện thoại</h6>
                                        </div>
                                        <h6>Giá gốc <fmt:formatNumber maxFractionDigits = "3" value="${cardDis.getPrice()}"/></h6>
                                        <h6>Khuyến mãi: ${cardDis.getPercent()}%</h6>
                                        <div class="mt-1 mb-0 text-muted small">
                                        </div>
                                        <h6>Giá giảm <fmt:formatNumber maxFractionDigits = "3" value="${cardDis.getPrice() - (cardDis.getPrice() * cardDis.getPercent() * 0.01)}"/></h6>
                                    </div>
                                    <div class="col-md-6 col-lg-3 col-xl-3 border-sm-start-none border-start">
                                        <div class="d-flex flex-column mt-4">
                                            <a class="btn btn-primary btn-sm" href="manageDiscount?service=editDiscount&did=${cardDis.getProId()}"> Chỉnh sửa thông tin</a>
                                            <a class="btn btn-outline-primary btn-sm mt-2" 
                                               href="manageDiscount?service=deleteDiscount&did=${cardDis.getProId()}">Xóa</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </c:forEach>

                    <ul style="display: flex; margin: 0 auto; width: 20%; margin-top: 15px;">
                        <c:forEach var="i" begin="1" end="${totalPage}"> 
                            <li style="list-style: none; background-color: ${i == currPage ? '#ff0000' : '#333'}; padding: 5px 12px; border-radius: 50%; margin: 0 2px;">
                                <a href="manageDiscount?page=${i}" style="
                                   color: #fff; text-decoration: none;">${i}</a>
                            </li>
                        </c:forEach>
                    </ul>
                    <h3>${mess}</h3>

                </div>
                <div>
                    <div class="col-12 col-md-6 col-lg-4" style="margin-left: 50%">
                        <a href="manageproduct?idx={i}&category={category}"class="link-dark"></a>
                    </div>
                </div>
            </div>
    </section>

</body>
</html>

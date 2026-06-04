
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@ page import="model.User" %>
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Quản lý sản phẩm</title>
        <link href="css/manage.css" rel="stylesheet" type="text/css"/>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
        <script src="https://code.jquery.com/jquery-latest.js"></script>
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
                            <a class="nav-link" aria-current="page" href="manageproduct">Nhà Cung Cấp</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" aria-current="page" href="manageproduct?category=phonecard">Thẻ Điện Thoại</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" aria-current="page" href="manageproduct?category=gamecard">Thẻ Game</a>
                        </li>

                    </ul>
                    <form action="searchmanageproduct" class="d-flex" role="search" style="margin-left: ">
                        <input name="search" class="form-control me-2" type="search" placeholder="Search" aria-label="Tìm kiếm" value="${search}">
                        <button class="btn btn-outline-success" type="submit">Tìm kiếm</button>
                    </form>
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
                <button type="button" class="btn btn-outline-primary btn-sm mt-2" data-bs-toggle="modal" data-bs-target="#addprice">
                    Tạo giá mới
                </button>
            </div>
            <div class="row justify-content-center mb-3">
                <div class="col-md-12 col-xl-10">
                    <div class="card shadow-0 border rounded-3">
                        <c:forEach items = "${lists}" var = "card" varStatus="loop">
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-12 col-lg-3 col-xl-3 mb-4 mb-lg-0">
                                        <div class="bg-image hover-zoom ripple rounded ripple-surface">
                                            <img src="${provider.image}"
                                                 class="w-100" />
                                            <a href="#!">
                                                <div class="hover-overlay">
                                                    <div class="mask" style="background-color: rgba(253, 253, 253, 0.15);"></div>
                                                </div>
                                            </a>
                                        </div>
                                    </div>
                                    <div class="col-md-6 col-lg-6 col-xl-6">
                                        <h5>${provider.providerName} - <fmt:formatNumber maxFractionDigits = "3" value="${card.price}"/>VND</h5>
                                        <div class="d-flex flex-row">
                                            <c:if test="${provider.category=='gamecard'}">
                                                <h6>Thẻ Game</h6>
                                            </c:if>
                                            <c:if test="${provider.category!='gamecard'}">
                                                <h6>Thẻ Điện Thoại</h6>
                                            </c:if>
                                        </div>
                                        <div class="mt-1 mb-0 text-muted small">
                                            Số lượng: ${card.quantity}
                                        </div>
                                    </div>
                                    <div class="col-md-6 col-lg-3 col-xl-3 border-sm-start-none border-start">
                                        <div class="d-flex flex-column ">
                                            <a class="btn btn-outline-primary btn-sm mt-2" href="addcard?providerid=${provider.id}&priceid=${card.id}"> Thêm thẻ</a>
                                            <a class="btn btn-danger btn-sm mt-2" onclick="checkDelete('${card.id}', '${provider.id}')"> Xóa</a>
                                        </div>
                                    </div>
                                </div>

                            </div>
                            <!-- Modal -->
                            <div class="modal fade" id="addprice" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                                <div class="modal-dialog">
                                    <div class="modal-content">
                                        <div class="modal-header">
                                            <h1 class="modal-title fs-5" id="staticBackdropLabel">Tạo giá mới</h1>
                                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                        </div>
                                        <div class="modal-body">
                                            <form id="addPriceForm" action="addprice" method="post">

                                                <input type="hidden" id="email_address" class="form-control" name="providerid" value="${provider.id}" readonly/>
                                                <input type="hidden" name="index" value="" />

                                                <div class="form-group row">
                                                    <label for="providername" class="col-md-4 col-form-label text-md-right">Tên nhà cung cấp</label>
                                                    <div class="col-md-6">                          
                                                        <input type="text" id="providername" class="form-control" name="providername" value="${provider.providerName}" readonly/>

                                                    </div>

                                                </div>
                                                <div class="form-group row">
                                                    <label for="price" class="col-md-4 col-form-label text-md-right mt-4">Giá</label>
                                                    <div class="col-md-6 ">              
                                                        <input type="text" id="price" class="form-control" name="price" value="${price}" />
                                                    </div>

                                                </div>

                                            </form>
                                        </div>
                                        <div class="form-group row">
                                            <div class="col-md-6 offset-md-4">
                                                <div class="checkbox">
                                                    <div class ="text-warning" id="error-message">${mess}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="modal-footer">
                                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                                            <button type="submit" form="addPriceForm" class="btn btn-primary">Thêm</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </c:forEach>
                    </div>
                </div>
                <div>
                    <div class="col-12 col-md-6 col-lg-4" style="margin-left: 50%">
                        <c:forEach begin="1" end="${endP}" var="i">
                            <a href="managecardprice?idx=${i}&providerid=${provider.id}" class="link-dark">${i}</a>
                        </c:forEach>
                    </div>
                </div>
            </div>
    </section>
</html>
<script>
    $(document).ready(function () {
        $("#addprice").on('hidden.bs.modal', function () {
            $(this).find('form')[0].reset(); // Reset form khi modal bị ẩn
            $(this).find("#error-message").text(""); // Xóa thông báo lỗi (nếu có)
        });
        $("#addprice").on('shown.bs.modal', function () {
            $(this).find("#error-message").text(""); // Xóa thông báo lỗi khi modal được hiển thị
        });
        $("#addPriceForm").submit(function (event) {
            event.preventDefault();
            var formId = $(this).attr('id'); // Lấy id của form
            var formIndex = formId.replace('addPriceForm', ''); // Lấy index từ id
            $.ajax({
                type: "POST",
                url: "addprice", // Đường dẫn đến servlet xử lý việc thêm giá
                data: $(this).serialize(),
                success: function (response) {
                    if (response.trim() === "success") {
                        // Nếu thành công, đóng modal và tải lại trang
                        $("#addprice").modal("hide");
                        location.reload();
                    } else {
                        // Nếu có lỗi, hiển thị thông báo lỗi trong modal
                        $("#error-message").text(response);// Hiển thị thông báo lỗi
                    }
                },
                error: function () {
                    alert("Error!");
                }
            });
        });
    });
</script>
<script type="text/javascript">
    function checkDelete(id, providerid) {
        if (confirm('Are you sure about deleting this card?')) {
            window.location = 'deletecard?id=' + id + '&providerid=' + providerid;
        }
    }
</script>
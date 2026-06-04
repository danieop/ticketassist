<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html>
    <head>
        <title>Quản Lý Feedback</title>
        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
        <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>
        <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
        <link href="css/manage.css" rel="stylesheet" type="text/css"/>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
        <script src="https://code.jquery.com/jquery-latest.js"></script>
        <style>
            .container {
                margin-top: 20px;
            }
            .table th, .table td {
                text-align: center;
            }
        </style>
    </head>
    <style>
        .container {
            margin-top: 20px;
        }
        .table {
            table-layout: fixed; /* Đảm bảo các cột có chiều rộng cố định */
        }
        .table th, .table td {
            text-align: center; /* Căn giữa các ô trong bảng */
            vertical-align: middle; /* Căn giữa theo chiều dọc */
        }
        .table th {
            width: 15%; /* Chiều rộng của các cột, có thể điều chỉnh theo nhu cầu */
        }
        .table td {
            word-wrap: break-word; /* Cho phép nội dung dài xuống dòng trong ô */
        }
        .action-btn {
            display: flex; /* Để các nút hành động xếp hàng ngang */
            justify-content: center; /* Căn giữa các nút */
        }
        .action-btn a {
            margin: 0 5px; /* Khoảng cách giữa các nút */
        }
    </style>
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
                        <li class="nav-item">
                            <a class="nav-link" aria-current="page" href="manageaccount">Quản lý Tài khoản</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" aria-current="page" href="manageDiscount">Quản lý Giảm Giá</a>
                        </li>

                    </ul>
                    <form action="searchmanageproduct" class="d-flex" role="search" style="margin-left: ">
                        <input name="search" class="form-control me-2" type="search" placeholder="Search" aria-label="Search" value="${search}">
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
    <body>
        <div class="container" style="margin-top: 30px">
            <table class="table table-striped">
                <thead class="thead-dark">
                    <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Order ID</th>
                        <th>Ngày Thanh Toán</th>
                        <th>Feedback</th>
                        <th>Trạng Thái</th>
                        <th>Action</th> 
                    </tr>
                </thead>
                <tbody>
                    <c:forEach items="${list}" var="list">
                        <tr>
                            <td>${list.username}</td>
                            <td>${list.email}</td>
                            <td>${list.orderid}</td>
                            <td>${list.purchasedate}</td>
                            <td>${list.feedback}</td>
                            <td>${list.status}</td>
                            <td>
                                <a href="changestatusfeedback?id=${list.id}&status=${list.status}" class="btn btn-outline-primary btn-sm">Chuyển Trạng Thái</a>
                                <a href="deletefeedback?id=${list.id}" class="btn btn-danger btn-sm mt-2" onclick="return confirm('Bạn có chắc chắn muốn xóa?');">Xóa</a>
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
                        <a href="managefeedback?idx=${i}" class="page-link">${i}</a>
                    </li>
                </c:forEach>
            </ul>
        </div>
    </body>
</html>

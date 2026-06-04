<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Items</title>
    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <!-- Custom CSS -->
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 20px;
            background-color: #f8f9fa;
        }
        .breadcrumb__links a {
            text-decoration: none;
            color: #007BFF;
        }
        .breadcrumb__links a:hover {
            text-decoration: underline;
        }
        .breadcrumb__links i {
            margin-right: 5px;
        }
        .cart-content {
            margin-top: 20px;
        }
        h1 {
            text-align: center;
            font-size: 2.5em;
            margin-bottom: 30px;
            color: #343a40;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 15px;
            text-align: left;
        }
        th {
            background-color: #007BFF;
            color: white;
        }
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        img {
            width: 100px;
            height: auto;
            border-radius: 8px;
        }
        .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px 0;
            list-style: none;
        }

        .pagination li {
            margin: 0 5px;
        }

        .pagination a, .pagination span {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            color: white;
            text-decoration: none;
            background-color: #343a40; /* Default background color */
            transition: background-color 0.3s;
        }

        .pagination a:hover {
            background-color: #007bff; /* Hover background color */
        }

        .pagination .active span {
            background-color: red; /* Active background color */
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="cart-content">
            <div class="breadcrumb-option">
                <div class="row">
                    <div class="col-lg-12">
                        <div class="breadcrumb__links">
                            <a href="home"><i class="fas fa-home"></i> Trang chủ</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <h1>Lịch sử mua hàng</h1>
        
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nhà cung cấp</th>
                        <th>Logo</th>
                        <th>Mức giá</th>
                        <th>Ngày mua</th>
                        <th>Số lượng</th>
                        <th>Tổng tiền</th>
                    </tr>
                </thead>
                <tbody>
                    <c:forEach var="od" items="${orderItems}">
                        <tr>
                            <td>${od.getId()}</td>
                            <td>${od.getProviderName()}</td>
                            <td>
                                <img src="${od.getImage()}" alt="Provider Logo"/>
                            </td>
                            <td>${od.getPrice()}</td>
                            <td>${od.getBuyDate()}</td>
                            <td>${od.getQuantity()}</td>
                            <td>${od.getQuantity() * od.getPrice()}</td>
                        </tr>
                    </c:forEach>
                </tbody>
            </table>
        </div>
        
        <!-- Pagination -->
        <nav aria-label="Page navigation example">
            <ul class="pagination">
                <c:if test="${currentPage > 1}">
                    <li class="page-item">
                        <a class="page-link" href="?page=${currentPage - 1}" aria-label="Previous">
                            <span aria-hidden="true">&laquo;</span>
                        </a>
                    </li>
                </c:if>
                <c:forEach var="i" begin="1" end="${totalPages}">
                    <li class="page-item ${currentPage == i ? 'active' : ''}">
                        <a class="page-link" href="?page=${i}">${i}</a>
                    </li>
                </c:forEach>
                <c:if test="${currentPage < totalPages}">
                    <li class="page-item">
                        <a class="page-link" href="?page=${currentPage + 1}" aria-label="Next">
                            <span aria-hidden="true">&raquo;</span>
                        </a>
                    </li>
                </c:if>
            </ul>
        </nav>
    </div>
</body>
</html>

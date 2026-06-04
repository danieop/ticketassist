<%-- 
    Document   : manage-account
    Created on : Jun 17, 2024, 10:45:00 PM
    Author     : badao
--%>

<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ page import="model.User" %>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Quản lý tài khoản</title>
        <link href="css/manage.css" rel="stylesheet" type="text/css"/>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
        <script src="https://code.jquery.com/jquery-latest.js"></script>
        <style>
            * {
                margin:0;
                padding:0;
                box-sizing: border-box;
                font-family: sans-serif;

            }

            .table_flex {
                background-color:#DEDEE8;
                background-size: 100%;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 62.5%;
            }

            main.res_table {
                width: 82vw;
                height: 95vh;
                background-color: #fff5;
                backdrop-filter: blur(7px);
                box-shadow: 0.4rem .8rem #0005;
                border-radius: 10px;
                border-color: #0005;
            }

            table {
                width: 100%;
            }

            .t_header {
                width: 100%;
                height: 10%;
                background-color: #fff4;
                padding: .8rem 1rem;
                display: flex;
                justify-content: space-between;
                align-items: center;

            }
            .t_header .search-group{
                width:35%;
                height:100%;
                background-color:#fff5;
                padding:0.8rem;
                border-radius: 2rem;
                display: flex;
                justify-content: center;
                align-items: center;

            }
            .t_header .search-group input{
                width:95%;
                max-height:calc(89%-.1.6rem);
                background-color:transparent;
                border: none;
                outline:none;
            }
            .t_header .search-group img{
                width:1.2rem;
                height:1.2rem;
            }
            .t_header .search-group:hover{
                width:45%;
                height:100%;
                background-color:#fff8;
                box-shadow: 0.1rem .4rem #0005;
            }
            .t_body {
                width: 95%;
                height: 74vh;
                background-color: #fffb;
                margin: .8rem auto;
                border-radius: .4rem;
                overflow: auto;
            }

            .t_body ::-webkit-scrollbar {
                width: 0.5rem;
                height: 0.5rem;
            }

            .t_body ::-webkit-scrollbar-thumb {
                border-radius: .5rem;
                background-color: #0004;
                visibility: hidden;
            }

            .t_body :hover::-webkit-scrollbar-thumb {
                visibility: visible;
            }

            table, th, td {
                border-collapse: collapse;
                padding: 1rem;
                text-align:left;
            }

            thead th {
                position: sticky;
                top: 0;
                left: 0;
                background-color: #d5d1defe;
            }
            tbody tr:nth-child(even){
                background-color: #0000000b;
            }
            tbody tr{
                --delay:.1s;
                transition: .5s ease-in-out var( --delay),background-color 0s;
            }
            tbody tr.hide{
                opacity: 0;
                transform: translateX(100%);
            }
            tbody tr:hover{
                background-color:#fff6;
            }
            tbody tr td,
            tbody tr td p{
                transition:.2s ease-in-out;
            }
            tbody tr.hide td,
            tbody tr.hide td p{
                padding:0;
                font:0/0 sans-serif;
                transition:.2s ease-in-out;
            }
            @media(max-width:1000px){
                td:not(:first-of-type){
                    min-width: 12.1rem;
                }
            }
            .pagination{
                justify-content: center;
                align-items: center;
                text-align: center;
            }
            .pagination a{
                list-style: none;
                background-color:#333;
                padding: 5px 10px;
                border-radius: 50%;
                margin: 0 2px;
                color: #fff;
                text-decoration: none;
            }
            .pagination a.active{
                list-style: none;
                padding: 5px 10px;
                border-radius: 50%;
                margin: 0 2px;
                color: #fff;
                text-decoration: none;
                background-color: #ff0000;
                font-weight: bold;
            }
            .pagination a:hover:not(.active){
                list-style: none;
                padding: 5px 10px;
                border-radius: 50%;
                margin: 0 2px;
                color: #fff;
                text-decoration: none;
                background-color: #ff0000;
                font-weight: bold;
            }
        </style>

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
    <section class="table_flex">
        <main class="res_table">              
            <section class="t_header">
                <h1>Danh sách tài khoản</h1>
                <form action="manageaccount" class="search-group" role="search" style="margin-left: ">
                    <input name="search" type="search" placeholder="Tìm kiếm..." value="${search}">
                    <button class="btn btn-outline-success btn-sm" type="submit"><img src="image/search.png" alt=""/></button>                   
                </form>
            </section>
            <section class="t_body">
                <table>
                    <thead>
                        <tr>
                            <th>Mã số</th>
                            <th>Tên người dùng</th>
                            <th>Email</th>
                            <th>Số điện thoại</th>
                            <th>Ngày tạo</th>
                            <th>Ngày cập nhật</th>
                            <th>Trạng thái</th>
                            <th>Vai trò</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        <c:forEach items="${requestScope.list1}" var="c">
                            <c:set var="id" value="${c.ID}"/>
                            <c:if test="${c.role!='admin'}">
                                <tr>
                                    <td>${id}</td>
                                    <td>${c.username}</td>
                                    <td>${c.email}</td>
                                    <td>${c.phoneNumber}</td>
                                    <td>${c.createdAt}</td>
                                    <td>${c.updatedAt}</td>
                                    <td>
                                        <c:if test="${c.isDeleted==true}">Ngưng kích hoạt<br>vào ${c.deletedAt}</c:if>
                                        <c:if test="${c.isDeleted==false}">Đang kích hoạt</c:if>                                              
                                        </td>
                                        <td>${c.role}</td>
                                    <td><a href="manageaccount?aid=${id}&st=${c.isDeleted}" class="btn btn-outline-danger btn-sm ">Đổi trạng thái</a>
                                    </td>
                                </tr>
                            </c:if>
                        </c:forEach>
                    </tbody>
                </table>
            </section>
            <div class="pagination">
                <c:forEach begin="1" end="${endP}" var="i">
                    <a href="manageaccount?idx=${i}&search=${search}" class="page-item">${i}</a>
                </c:forEach>
            </div>
        </main>
    </section>
</html>

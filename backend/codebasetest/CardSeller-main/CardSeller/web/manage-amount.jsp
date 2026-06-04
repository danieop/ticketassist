<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ page import="model.User" %>
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <!-- The above 3 meta tags *must* come first in the head; any other head content must come *after* these tags -->
        <meta name="description" content="">
        <meta name="author" content="">
        <title>Lịch sử giao dịch</title>
        <!-- Bootstrap core CSS -->
        <link href="assets/css/bootstrap.min.css" rel="stylesheet"/>
        <!-- Custom styles for this template -->
        <script src="assets/js/jquery-1.11.3.min.js"></script>
        <link href="https://pay.vnpay.vn/lib/vnpay/vnpay.css" rel="stylesheet" />
        <script src="https://pay.vnpay.vn/lib/vnpay/vnpay.min.js"></script>
        <script defer src="assets/js/bootstrap.bundle.js"></script>
        <style>
            body {
                background: #f5f5f5;
                margin-top: 20px;
            }

            .ui-w-80 {
                width : 80px !important;
                height: auto;
            }

            .btn-default {
                border-color: rgba(24, 28, 33, 0.1);
                background  : rgba(0, 0, 0, 0);
                color       : #4E5155;
            }

            label.btn {
                margin-bottom: 0;
            }

            .btn-outline-primary {
                border-color: #26B4FF;
                background  : transparent;
                color       : #26B4FF;
            }

            .btn {
                cursor: pointer;
            }

            .text-light {
                color: #babbbc !important;
            }

            .btn-facebook {
                border-color: rgba(0, 0, 0, 0);
                background  : #3B5998;
                color       : #fff;
            }

            .btn-instagram {
                border-color: rgba(0, 0, 0, 0);
                background  : #000;
                color       : #fff;
            }

            .card {
                background-clip: padding-box;
                box-shadow     : 0 1px 4px rgba(24, 28, 33, 0.012);
            }

            .row-bordered {
                overflow: hidden;
            }

            .account-settings-fileinput {
                position  : absolute;
                visibility: hidden;
                width     : 1px;
                height    : 1px;
                opacity   : 0;
            }

            .account-settings-links .list-group-item.active {
                font-weight: bold !important;
            }

            html:not(.dark-style) .account-settings-links .list-group-item.active {
                background: transparent !important;
            }

            .account-settings-multiselect~.select2-container {
                width: 100% !important;
            }

            .light-style .account-settings-links .list-group-item {
                padding     : 0.85rem 1.5rem;
                border-color: rgba(24, 28, 33, 0.03) !important;
            }

            .light-style .account-settings-links .list-group-item.active {
                color: #4e5155 !important;
            }

            .material-style .account-settings-links .list-group-item {
                padding     : 0.85rem 1.5rem;
                border-color: rgba(24, 28, 33, 0.03) !important;
            }

            .material-style .account-settings-links .list-group-item.active {
                color: #4e5155 !important;
            }

            .dark-style .account-settings-links .list-group-item {
                padding     : 0.85rem 1.5rem;
                border-color: rgba(255, 255, 255, 0.03) !important;
            }

            .dark-style .account-settings-links .list-group-item.active {
                color: #fff !important;
            }

            .light-style .account-settings-links .list-group-item.active {
                color: #4E5155 !important;
            }

            .light-style .account-settings-links .list-group-item {
                padding     : 0.85rem 1.5rem;
                border-color: rgba(24, 28, 33, 0.03) !important;
            }
            .warning{
                outline:none;
                border: none;
                font-family: "Inter";
                font-weight: 500;
                font-size: 14px;
                line-height: 1.3;
                width: 100%;
                height: 100%;
                border-radius: 6px;
                text-align: justify;
            }
            .pagination{
                justify-content: center;
                align-items: center;
                text-align: center;
            }
            .pagination a{
                color: black;
                text-decoration: none;
                padding: 8px 15px;
                display: inline-block;
            }
            .pagination a.active{
                background-color: #007bff;
                font-weight: bold;
                border-radius: 5px;
            }
            .pagination a:hover:not(.active){
                background-color: hsl(0, 0%, 77%);
                border-radius: 5px;
            }
        </style>
    </head>
    <%
        User acc = (User) request.getSession().getAttribute("acc");
        try{
        if(acc==null){
        response.sendRedirect("login.jsp");
        }
    }catch(Exception e){
        response.sendRedirect("login.jsp");
    }
    %>
    <body>
        <div class="container light-style flex-grow-1 container-p-y">
            <h4 class="font-weight-bold py-3 mb-4">
                Lịch sử giao dịch
            </h4>
            <div class="card overflow-hidden">
                <div class="row no-gutters row-bordered row-border-light">
                    <div class="col-md-3 pt-0">
                        <div class="list-group list-group-flush account-settings-links">
                            <a class="list-group-item list-group-item-action " 
                               href="vnpay_pay.jsp">Nạp tiền</a>
                            <a class="list-group-item list-group-item-action active" data-toggle="list"
                               href="#transaction-his">Lịch sử giao dịch</a>
                        </div>
                    </div>
                    <div class="col-md-9">                       
                        <div class="tab-content">
                            <!-- General info tab -->
                            <div class="tab-pane active show" id="transaction-his">
                                <div class="table-responsive">
                                    <table class="table">

                                        <thead>
                                            <tr>
                                                <th>Mã giao dịch</th>
                                                <th>Số tiền</th>
                                                <th>Phương thức</th>
                                                <th>Xử lý</th>
                                                <th>Ngày tạo</th>
                                                <th>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <c:forEach items="${requestScope.list1}" var="w">
                                                <c:set var="id" value="${w.ID}"/>
                                                <tr>
                                                    <td>${id}</td>
                                                    <td><fmt:formatNumber maxFractionDigits = "3" value="${w.amount}"/></td>
                                                    <td>${w.method}</td>
                                                    <td>
                                                        <c:if test="${w.processStatus==true}">Đã xử lý</c:if>
                                                        <c:if test="${w.processStatus==false}">Chưa xử lý</c:if> </td>
                                                    <td>${w.createdAt}</td>
                                                    <!<!-- Button target to certain id modal -->
                                                    <td><button class="btn btn-info" data-toggle="modal" data-target="#Detail${id}">Chi tiết</button>
                                                        <!-- Detail Modal with the id have transaction id -->
                                                        <div class="modal fade" id="Detail${id}" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="Detail${id}Label" aria-hidden="true">
                                                            <div class="modal-dialog modal-dialog-centered">
                                                                <div class="modal-content">
                                                                    <div class="modal-header">
                                                                        <h5 class="modal-title" id="Detail${id}Label">Lịch sử giao dịch</h5>                                     
                                                                    </div>
                                                                    <div class="modal-body">
                                                                        Mã giao dịch <input type="text" class="form-control" name="ID" value="${id}" readonly>
                                                                        Số tiền<input type="text" class="form-control" name="amount" value="${w.amount}" readonly>
                                                                        Phương thức<input type="text" class="form-control" name="method" value="${w.method}" readonly>
                                                                        Xử lý 
                                                                        <c:if test="${w.processStatus==true}"><input type="text" class="form-control bg-info" name="pStatus" value="Đã xử lý" readonly></c:if>
                                                                        <c:if test="${w.processStatus==false}"><input type="text" class="form-control bg-warning" name="pStatus" value="Chưa xử lý" readonly></c:if>
                                                                            Trạng thái giao dịch
                                                                        <c:if test="${w.successStatus==true}"><input type="text" class="form-control bg-info" name="sStatus" value="Thành công" readonly></c:if>
                                                                        <c:if test="${w.successStatus==false}"><input type="text" class="form-control bg-warning" name="sStatus" value="Không thành công" readonly></c:if>
                                                                        Ngày tạo<input type="text" class="form-control" name="ID" value="${w.createdAt}" readonly>
                                                                    </div>
                                                                    <div class="modal-footer">
                                                                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Đóng</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </c:forEach>
                                        </tbody>
                                    </table>
                                </div>
                                <div class="pagination">
                                    <c:forEach begin="1" end="${endP}" var="i">
                                        <a href="manageamount?idx=${i}" class="page-item">${i}</a>
                                    </c:forEach>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div> 
            <div class="text-right mt-3">
                <a href="home" class="btn btn-primary" >Quay về trang chủ</a>
            </div>
        </div>         
    </body>
</html>
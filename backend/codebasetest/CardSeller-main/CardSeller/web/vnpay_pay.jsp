<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
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
        <title>Thanh toán VNPay</title>
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
                Nạp tiền
            </h4>
            <div class="card overflow-hidden">
                <div class="row no-gutters row-bordered row-border-light">
                    <div class="col-md-3 pt-0">
                        <div class="list-group list-group-flush account-settings-links">
                            <a class="list-group-item list-group-item-action active" data-toggle="list"
                               href="#deposit">Nạp tiền</a>
                            <a class="list-group-item list-group-item-action" 
                               href="manageamount">Lịch sử giao dịch</a>
                        </div>
                    </div>
                    <div class="col-md-9">                       
                        <div class="tab-content">
                            <!-- General info tab -->
                            <div class="tab-pane fade active show" id="deposit">
                                <form action="vnpay" id="frmCreateOrder" method="post">        
                                    <div class="form-group">
                                        <h4><label for="amount">Số tiền muốn nạp</label></h4>
                                        <input class="form-control" data-val="true" data-val-number="The field Amount must be a number." data-val-required="The Amount field is required." id="amount" max="100000000" min="1" name="amount" type="number" value="10000" />
                                    </div>
                                    <h4>Chọn phương thức thanh toán</h4>
                                    <div class="form-group">
                                        <h5>Cách 1: Chuyển hướng sang Cổng VNPAY chọn phương thức thanh toán</h5>
                                        <input type="radio" checked id="bankCode" name="bankCode" value="">
                                        <label for="bankCode">Cổng thanh toán VNPAYQR</label><br>                     
                                        <h5>Cách 2: Tách phương thức tại site của đơn vị kết nối</h5>
                                        <input type="radio" id="bankCode" name="bankCode" value="VNPAYQR">
                                        <label for="bankCode">Thanh toán bằng ứng dụng hỗ trợ VNPAYQR</label><br>
                                        <input type="radio" id="bankCode" name="bankCode" value="VNBANK">
                                        <label for="bankCode">Thanh toán qua thẻ ATM/Tài khoản nội địa</label><br>
                                        <input type="radio" id="bankCode" name="bankCode" value="INTCARD">
                                        <label for="bankCode">Thanh toán qua thẻ quốc tế</label><br>
                                    </div>
                                    <div class="form-group">
                                        <h5>Chọn ngôn ngữ giao diện thanh toán:</h5>
                                        <input type="radio" id="language" checked name="language" value="vn">
                                        <label for="language">Tiếng việt</label><br>
                                        <input type="radio" id="language" name="language" value="en">
                                        <label for="language">Tiếng anh</label><br>
                                    </div>
                                    <div class="form-group">
                                        <button type="submit" class="btn btn-info" >Thanh toán</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div> 
            <div class="text-right mt-3">
                <a href="home" class="btn btn-primary" >Quay về trang chủ</a>
            </div>
        </div>    
        <script type="text/javascript">
            $("#frmCreateOrder").submit(function () {
                var postData = $("#frmCreateOrder").serialize();
                var submitUrl = $("#frmCreateOrder").attr("action");
                $.ajax({
                    type: "POST",
                    url: submitUrl,
                    data: postData,
                    dataType: 'JSON',
                    success: function (x) {
                        if (x.code === '00') {
                            if (window.vnpay) {
                                vnpay.open({width: 768, height: 600, url: x.data});
                            } else {
                                location.href = x.data;
                            }
                            return false;
                        } else {
                            alert(x.Message);
                            console.log(x);
                        }
                    }
                });
                return false;
            });

        </script>       
    </body>
</html>
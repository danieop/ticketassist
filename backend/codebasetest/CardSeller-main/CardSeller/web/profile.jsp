<%-- 
    Document   : profile
    Created on : Jun 20, 2024, 9:15:14 AM
    Author     : badao
--%>

<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ page import="model.User" %>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Hồ sơ người dùng</title>
        <link rel="stylesheet" href="assets/css/bootstrap.min.css"/>
        <script src="https://cdn.jsdelivr.net/npm/jquery@3.5.1/dist/jquery.slim.min.js" integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj" crossorigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js" integrity="sha384-9/reFTGAW83EW2RDu2S0VKaIzap3H66lZH81PoYlFhbGU+6BZp6G7niu735Sk7lN" crossorigin="anonymous"></script>
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
        <c:set var="acc" value="${sessionScope.acc}"/>
        <div class="container light-style flex-grow-1 container-p-y">
            <h4 class="font-weight-bold py-3 mb-4">
                Thiết lập tài khoản
            </h4>
            <div class="card overflow-hidden">
                <div class="row no-gutters row-bordered row-border-light">
                    <div class="col-md-3 pt-0">
                        <div class="list-group list-group-flush account-settings-links">
                            <a class="list-group-item list-group-item-action active" data-toggle="list"
                               href="#account-general">Thông tin chung</a>
                            <a class="list-group-item list-group-item-action" data-toggle="list"
                               href="#account-notifications">Thông báo</a>
                        </div>
                    </div>
                    <div class="col-md-9">                       
                        <div class="tab-content">
                            <!-- General info tab -->
                            <div class="tab-pane fade active show" id="account-general">
                                <hr class="border-light m-0">
                                <div class="card-body">
                                     <div class="form-group">
                                        <label class="form-label">Mã số người dùng</label>
                                        <input type="text" class="form-control mb-1" value="${acc.ID}" readonly>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Tên</label>
                                        <input type="text" class="form-control mb-1" value="${acc.username}" readonly>
                                    </div>
                                    <a href="change-password.jsp" class="btn btn-facebook">Đổi mật khẩu</a>
                                </div>
                                <hr class="border-light m-0">
                                <div class="card-body pb-2">
                                    <h6 class="mb-4">Contacts</h6>
                                    <div class="form-group">
                                        <label class="form-label">Số điện thoại</label>
                                        <input type="text" class="form-control mb-1" readonly value="${acc.phoneNumber}">
                                        <!-- Button trigger modal -->
                                        <button class="btn btn-info" data-toggle="modal" data-target="#phoneChange">Chỉnh sửa</button>
                                    </div>
                                    <!-- Phone change Modal -->
                                    <div class="modal fade" id="phoneChange" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="phoneChangeLabel" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title" id="phoneChangeLabel">Thay đổi số điện thoại</h5>                                     
                                                </div>
                                                <div class="modal-body">
                                                    <input type="text" class="form-control" id="phonenum" name="phonenum"
                                                           placeholder="Phonenum" value="${acc.phoneNumber}" required>
                                                </div>
                                                <div class="modal-footer">
                                                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Hủy</button>
                                                    <button type="submit" id="btnChangePhoneNum" class="btn btn-primary" >Lưu</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">E-mail</label>
                                        <input type="text" class="form-control mb-1 " readonly value="${acc.email}">                                      
                                        <!-- Button trigger modal -->
                                        <button class="btn btn-default" data-toggle="modal" data-target="#emailChange">Đổi email</button>                                   
                                    </div>
                                    <!-- Email change Modal -->
                                    <div class="modal fade" id="emailChange" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="emailChangeLabel" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title" id="emailChangeLabel">Thay đổi tài khoản email</h5>
                                                </div>
                                                <div class="modal-body">
                                                    <input type="text" class="form-control" id="email" name="email"
                                                           placeholder="Email" value="${acc.email}" required>
                                                </div>
                                                <div class="modal-footer">
                                                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Hủy</button>
                                                    <button type="submit" id="btnChangeMail"  class="btn btn-primary"
                                                            data-toggle="modal" data-target="#emailChange2" data-dismiss="modal">Gửi mã OTP</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <!-- OTP input Modal -->
                                    <div class="modal fade" id="emailChange2" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="emailChangeLabel2" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title" id="emailChangeLabel2">Nhập mã OTP</h5>
                                                </div>
                                                <div class="modal-body">
                                                    <input name="otp" class="form-control" id="otp" type="number" required placeholder="Enter OTP"/>
                                                    <p class="warning" style="color: red" id="error" ></p>
                                                </div>
                                                <div class="modal-footer">
                                                    <button class="btn btn-default" data-toggle="modal" data-target="#emailChange" data-dismiss="modal">Back</button>
                                                    <button type="submit" id="btnChangeMail2"
                                                            class="btn btn-primary" >Xác nhận</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- notification tab -->
                            <div class="tab-pane fade" id="account-notifications">
                                <div class="card-body pb-2">
                                    <h6 class="mb-4">Hoạt động</h6>
                                    <div class="form-group">
                                        <label class="switcher">
                                            <input type="checkbox" class="switcher-input" checked>
                                            <span class="switcher-indicator">
                                                <span class="switcher-yes"></span>
                                                <span class="switcher-no"></span>
                                            </span>
                                            <span class="switcher-label">Email me when someone comments on my article</span>
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label class="switcher">
                                            <input type="checkbox" class="switcher-input" checked>
                                            <span class="switcher-indicator">
                                                <span class="switcher-yes"></span>
                                                <span class="switcher-no"></span>
                                            </span>
                                            <span class="switcher-label">Email me when someone answers on my forum
                                                thread</span>
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label class="switcher">
                                            <input type="checkbox" class="switcher-input">
                                            <span class="switcher-indicator">
                                                <span class="switcher-yes"></span>
                                                <span class="switcher-no"></span>
                                            </span>
                                            <span class="switcher-label">Email me when someone follows me</span>
                                        </label>
                                    </div>
                                </div>
                                <hr class="border-light m-0">
                                <div class="card-body pb-2">
                                    <h6 class="mb-4">Application</h6>
                                    <div class="form-group">
                                        <label class="switcher">
                                            <input type="checkbox" class="switcher-input" checked>
                                            <span class="switcher-indicator">
                                                <span class="switcher-yes"></span>
                                                <span class="switcher-no"></span>
                                            </span>
                                            <span class="switcher-label">News and announcements</span>
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label class="switcher">
                                            <input type="checkbox" class="switcher-input">
                                            <span class="switcher-indicator">
                                                <span class="switcher-yes"></span>
                                                <span class="switcher-no"></span>
                                            </span>
                                            <span class="switcher-label">Weekly product updates</span>
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label class="switcher">
                                            <input type="checkbox" class="switcher-input" checked>
                                            <span class="switcher-indicator">
                                                <span class="switcher-yes"></span>
                                                <span class="switcher-no"></span>
                                            </span>
                                            <span class="switcher-label">Weekly blog digest</span>
                                        </label>
                                    </div>
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
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
    <script>
        $('#btnChangePhoneNum').click(function () {
            var phoneNum = $('#phonenum').val();
            $.ajax({
                url: "/CardSeller/personalinfo",
                type: "get", //send it through get method
                data: {
                    info: 'phoneNum',
                    phoneNum: phoneNum
                },
                success: function (data) {
                    window.location.reload();
                },
                error: function (xhr) {
                    //Do Something to handle error
                }
            });
        });
        $('#btnChangeMail').click(function () {
            var email = $('#email').val();
            $.ajax({
                url: "/CardSeller/personalinfo",
                type: "get", //send it through get method
                data: {
                    info: 'email',
                    email: email
                },
                success: function (error) {
                    if (error) {
                        var p = document.getElementById("error");
                        p.innerHTML = error;
                        //error empty
                    } else {
                        //reload the profile
                        window.location.reload();
                    }
                },
                error: function (xhr) {
                    //Do Something to handle error
                }
            });
        });
        $('#btnChangeMail2').click(function () {
            var otp = $('#otp').val();
            $.ajax({
                url: "/CardSeller/personalinfo",
                type: "get", //send it through get method
                data: {
                    info: 'OTP',
                    otp: otp
                },
                success: function (error) {
                    //error was non-empty string
                    if (error) {
                        var p = document.getElementById("error");
                        p.innerHTML = error;
                        //error empty
                    } else {
                        //reload the profile
                        window.location.reload();
                    }
                },
                error: function (xhr) {

                    //Do Something to handle error
                }
            });
        });
    </script>
</html>
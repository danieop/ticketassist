<!------ Include the above in your HEAD tag ---------->
<link href="//maxcdn.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css" rel="stylesheet" id="bootstrap-css">
<script src="//maxcdn.bootstrapcdn.com/bootstrap/4.1.1/js/bootstrap.min.js"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!doctype html>
<html lang="en">
    <head>
        <!-- Required meta tags -->
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

        <!-- Fonts -->
        <link rel="dns-prefetch" href="https://fonts.gstatic.com">
        <link href="https://fonts.googleapis.com/css?family=Raleway:300,400,600" rel="stylesheet" type="text/css">
        <link href="css/addproduct.css" rel="stylesheet" type="text/css"/>

        <link rel="stylesheet" href="css/style.css">

        <link rel="icon" href="Favicon.png">

        <!-- Bootstrap CSS -->
        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css">

        <title>Account</title>
    </head>
    <body>
        <nav class="navbar navbar-expand-lg navbar-light navbar-laravel btn btn-light">
            <div class="container">
                <a class="navbar-brand" href="#">Thêm thẻ mới</a>
                <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse" id="navbarSupportedContent">
                    <ul class="navbar-nav ml-auto">
                        <li class="nav-item">
                            <a class="nav-link" href="managecardprice?providerid=${provider.id}">Quay lại</a>
                        </li>
                    </ul>

                </div>

            </div>
        </nav>

        <main class="login-form">
            <div class="cotainer">
                <div class="row justify-content-center">
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-body">
                                <form action="addcard" method="post">
                                    <input type="hidden" name ="providerid" value="${provider.id}">
                                    <div class="form-group row">
                                        <label for="email_address" class="col-md-4 col-form-label text-md-right">Bên cung cấp</label>
                                        <div class="col-md-6">
                                            <input type="text" id="email_address" class="form-control" name="provider" value="${provider.providerName}" readonly/>
                                        </div>

                                    </div>
                                    <div class="form-group row">
                                        <label for="email_address" class="col-md-4 col-form-label text-md-right">Loại thẻ</label>
                                        <div class="col-md-6">
                                            <input type="text" id="email_address" class="form-control" name="category" value="${provider.category}" readonly />
                                        </div>

                                    </div>
                                    <div class="form-group row">
                                        <label for="email_address" class="col-md-4 col-form-label text-md-right">Giá</label>
                                        <div class="col-md-6">
                                            <input type="hidden" name = "priceid" value ="${card.id}">
                                            <input type="text" id="email_address" class="form-control" name="price" value="${card.price}" readonly />
                                        </div>

                                    </div>
                                    <div class="form-group row">
                                        <label for="email_address" class="col-md-4 col-form-label text-md-right">Mã số Seri</label>
                                        <div class="col-md-6">
                                            <input type="text" id="email_address" class="form-control" name="seri" value="${seri}" required />
                                        </div>

                                    </div><div class="form-group row">
                                        <label for="email_address" class="col-md-4 col-form-label text-md-right">Pin</label>
                                        <div class="col-md-6">
                                            <input type="text" id="email_address" class="form-control" name="pin" value="${pin}" required />
                                        </div>

                                    </div>

                                    <div class="form-group row">
                                        <div class="col-md-6 offset-md-4">
                                            <div class="checkbox">
                                                <div class ="text-warning" >${mess}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="col-md-6 offset-md-4">
                                        <button type="submit" class="btn btn-primary">
                                            Thêm
                                        </button>

                                    </div>

                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </main>







    </body>
</html>



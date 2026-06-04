<%-- 
    Document   : verify-signup
    Created on : May 29, 2024, 7:59:04 PM
    Author     : badao
--%>

<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
    <%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>OTP Verification</title>
        <style>
            body {
                background-image: url(image/signup/cardTransfer.jpg);
                background-size: 100%;

            }
            .signup {
                margin:auto;
                margin-top:200px;
                width: 500px;
                height: 400px;
                display:flex;
                align-items: center;
                justify-content: center;
                border-width: 1px;
                border-style: solid;
                border-radius:10px;
                border-color: #7C4DFF;
                background: #FFFFFF;
                text-align: center;
            }
            h3{
                font-family: "Inter";
                font-weight: 700;
                font-size: 26px;
                line-height: 1;
                letter-spacing: -0.2px;
                margin-top: 40px;
                margin-bottom: 40px;
            }
            h6{
                font-family: "Inter";
                font-weight: 400;
                font-size: 14px;
                line-height: 1.3;
                margin-top: 15px;
                text-align: center;
            }
            .text-input {
                width: 300px;
                height: 48px;
                background: #FFFFFF;
                color: #444444;
                border-color: #EBEBEB;
                border-style: solid;
                border-radius: 6px;
                margin-bottom: 5px;
                margin-left: auto;
                margin-right: auto;

            }
            .text-input input{
                outline:none;
                border: none;
                font-family: "Inter";
                font-weight: 500;
                font-size: 14px;
                line-height: 1.3;
                width: 250px;
                height: 40px;
                border-radius: 6px;
                padding-left:15px;
            }
            h4{
                font-family: "Inter";
                font-weight: 400;
                width: 300px;
                font-size: 10px;
                line-height: 1.3;
                text-align: left;
                margin-left: auto;
                margin-right: auto;
            }
            .icon{
                width: 21px;
                height: 21px;
                object-fit: cover;
                vertical-align: middle;
            }
            button{
                width: 300px;
                height: 48px;
                background:#7C4DFF;
                border-color:#7C4DFF;
                border-width: 1px;
                border-style: solid;
                border-radius: 9px;
                font-family: "Inter";
                font-weight: 600;
                font-size: 16px;
                color: #FFFFFF;
                text-align: center;
            }
            .warning{
                outline:none;
                border: none;
                font-family: "Inter";
                font-weight: 500;
                font-size: 14px;
                line-height: 1.3;
                width: 300px;
                height: 20px;
                border-radius: 6px;
                text-align: center;
            }

        </style>
    </head>
    <body>
        <div class="signup">   
            <form action="signup" method="post"> 
                <input type="hidden" name="action" value="Check&CreateAccount"/>  
                <c:if test="${not empty error}">
                    <h2 style="color:red">${error}</h2>
                    <p >Please check your email ${email}!</p>
                </c:if>
                <c:if test="${empty error}">
                    <h2 >Verification code sent ${email}</h2>
                    <p >Please check your email !</p>
                    <p>OTP will expired after 10 minute!</P>
                </c:if>
                <c:if test="${ERROR != null}"> 
                    <p  style="color: red">${ERROR}</p>
                </c:if>
                <div class="text-input">
                    <img class="icon"  src="image/signup/check.png"/>
                    <input name="otp" type="number" required placeholder="Enter OTP"/>
                </div>
                <input class="warning" style="color: red"  type="text" readonly value="${requestScope.error}"/>
                <button type="submit" class="">CONFIRM</button>
                <br>
                <a  style="color:#7C4DFF; text-decoration: underline;" href="signup?action=sendMail">Resend OTP</a>
                <h6>Already have an account?
                    <a href="login.jsp" style="color:#7C4DFF; text-decoration: underline;">Login here</a></h6>
            </form>
        </div> 
    </body>

</html>
<script>
    $(document).ready(function () {
        var inputs = $('input[type="text"]');
        var submitButton = $('button[type="submit"]');

        // Bắt sự kiện nhập vào mỗi ô input
        inputs.on('input', function () {
            // Kiểm tra xem đã nhập đủ 6 ký tự hay chưa
            if (inputs.filter(function () {
                return $(this).val().length === 1;
            }).length === 6) {
                // Gửi request lên ConfirmCodeServlet
                submitButton.click();
            }
        });
    });

</script>

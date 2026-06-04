<%-- 
    Document   : message
    Created on : Mar 12, 2024, 6:53:18 PM
    Author     : nhatk
--%>

<%@ page import="java.net.URLEncoder" %>
<%@ page pageEncoding="UTF-8" contentType="text/html; charset = UTF-8" %>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Code Input</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center h-screen">
    <div class="bg-white p-8 rounded-lg shadow-lg w-96" style="width: 500px">
        <div class="flex justify-center mb-4">

            <span class="text-orange-500 font-bold text-2xl" style="color: green;">CardSeller</span>
        </div>
        <c:if test="${not empty error}">
            <h2 class="text-center text-lg font-bold mb-2" style="color:red">${error}</h2>
            <p class="text-center text-sm text-gray-600 mb-4">Please check your email ${email}!</p>
        </c:if>

        <c:if test="${empty error}">
            <h2 class="text-center text-lg font-bold mb-2">Verification code sent ${email}</h2>
            <p class="text-center text-sm text-gray-600 mb-4">Please check your email !</p>
        </c:if>

            <c:if test="${ERROR != null}"> 
                <p class="text-center text-sm text-gray-600 mb-4" style="color: red">${ERROR}</p>
            </c:if>

        <form action="forgot-password" method="post">
            <input type="hidden" name="action" value="check"/>
            <div class="flex justify-between gap-2 mb-4">

                <input name="otp" class="w-full py-2 text-center form-input border border-gray-300 rounded focus:outline-none focus:border-orange-500" type="number" required>
                <button type="submit" class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 w-full rounded focus:outline-none focus:shadow-outline" style="background-image: linear-gradient(to right top,#45af2a,#3ba023,#30901c,#268215,#1b730d,#1b730d,#1b730d,#1b730d,#268215,#30901c,#3ba023,#45af2a">
                    CONFIRM
                </button>
            </div>
            <div style=""class="text-center text-sm">
                  <a href="${pageContext.request.contextPath}/forgot-password?action=resend-OTP" class="text-green-500 hover:text-green-600 transition duration-300 ease-in-out">Resend OTP</a>
                <a  class="text-Black-500 hover:text-blue-600 transition duration-300 ease-in-out">Aready have account?</a>
                <a href="login.jsp" class="text-green-500 hover:text-green-600 transition duration-300 ease-in-out">Login now!</a>
            </div>
        </form>


    </div>
</body>
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
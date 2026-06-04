<%@ page import="java.net.URLEncoder" %>
<%@ page pageEncoding="UTF-8" contentType="text/html; charset = UTF-8" %>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="assets/css/tailwind-all.min.css"/>
<title>Password Change Form</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>
    body {
        font-family: 'Inter', sans-serif;
    }
    .form-container {
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        overflow: hidden;
    }
</style>
</head>
<body>
    <div class="max-w-lg mx-auto mt-10">
        <div class="form-container">
            <form action="forgot-password" method="post">
                <input type="hidden" name="action" value="sendOtpToMail"/>
                <div class="bg-green-600 text-white text-center py-4" style="background-image: linear-gradient(to right top,#45af2a,#3ba023,#30901c,#268215,#1b730d,#1b730d,#1b730d,#1b730d,#268215,#30901c,#3ba023,#45af2a);">
                    <h1 class="text-xl font-semibold" >FORGOT PASSWORD</h1>
                </div>
                <div class="p-6">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="email">
                        Email Address
                    </label>
                    <input type="email" name="email" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" id="email" placeholder="Email" required>
                </div>
                <div style="color: red">${ERROR}</div>
                <div class="px-6 py-4"  >
                    <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full" type="button" >
                        Send
                    </button>
                    <div class="text-center text-sm">
              
                <a href="login.jsp" class="text-green-500 hover:text-green-600 transition duration-300 ease-in-out ml-2">Login now!</a>
            </div>
                </div>
            </form>

        </div>
    </div>
</body>
</html>
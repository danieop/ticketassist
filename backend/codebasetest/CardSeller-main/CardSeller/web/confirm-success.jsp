<%@ page import="java.net.URLEncoder" %>
<%@ page pageEncoding="UTF-8" contentType="text/html; charset = UTF-8" %>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<meta charset="UTF-8">
  <link rel="stylesheet" href="assets/css/tailwind-all.min.css"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Password Confirmation Form</title>
<script>
    // Function to toggle password visibility
    function togglePassword() {
        var passwordInput = document.getElementById('password');
        var togglePasswordIcon = document.getElementById('togglePasswordIcon');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePasswordIcon.classList.remove('fa-eye-slash');
            togglePasswordIcon.classList.add('fa-eye');
        } else {
            passwordInput.type = 'password';
            togglePasswordIcon.classList.remove('fa-eye');
            togglePasswordIcon.classList.add('fa-eye-slash');
        }
    }
</script>
</head>
<body class="bg-gray-100 flex items-center justify-center h-screen">
    <form action="forgot-password" method="post">
        <input type="hidden" name="action" value="setNewPassword"/>
        <div class="bg-white p-6 rounded-lg shadow-md w-96" style="width: 500px">
            <div class="flex justify-center mb-4">
                <!-- Replace with your actual logo if available -->
                <span class="text-orange-500 font-bold text-2xl" style="color: green;">CardSeller</span>
            </div>
            <span style="color: red">${ERROR}</span>
            <h2 class="text-center text-lg font-bold text-gray-700 mb-2">Sucessfull</h2>
            <p class="text-center text-sm text-gray-600 mb-4">Enter your new password!</p>
            <div id="password-message" style="color:red;font-size:11px"></div>
            <input name="email" id="email" hidden value="${email}"> 
            <div class="mb-4 relative">
                <input name="newPassword" type="password" id="password" placeholder="Mật khẩu" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                <i class="fas fa-eye-slash absolute right-3 top-3 text-gray-400 cursor-pointer" onclick="togglePassword()" id="togglePasswordIcon"></i>
            </div>
            <div class="mb-4">
                <button disabled="true" type="submit" class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 w-full rounded focus:outline-none focus:shadow-outline" style="background-image: linear-gradient(to right top,#45af2a,#3ba023,#30901c,#268215,#1b730d,#1b730d,#1b730d,#1b730d,#268215,#30901c,#3ba023,#45af2a">
                    CONFIRM
                </button>
            </div>
            <div class="text-center text-sm">
                <a href="login.jsp" class="text-green-500 hover:text-green-600 transition duration-300 ease-in-out ml-2">Login now!</a>
            </div>
        </div>
    </form>

</body>
</html>

<script>
    const passwordInput = document.getElementById('password');
    const passwordMessage = document.getElementById('password-message');
    const submitButton = document.querySelector('form button');

    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!"#$%&'*+,-\./:;<=>?@\[\]^_`{|}~])[^\s]{8,}$/;

    passwordInput.addEventListener('keyup', (event) => {
        const password = event.target.value;
        let isValid = true;
        passwordMessage.textContent = '';

        if (!passwordRegex.test(password)) {
            isValid = false;
            passwordMessage.textContent = 'Mật khẩu phải chứa ít nhất 8 kí tự và ít nhất một kí tự hoa,1 kí tự thường, 1 số, và 1 kí tự đặc biệt.';
        }

        submitButton.disabled = !isValid;
    });
</script>
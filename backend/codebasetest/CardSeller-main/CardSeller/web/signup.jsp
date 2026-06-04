<%-- 
    Document   : signup
    Created on : May 22, 2024, 8:29:46 PM
    Author     : badao
--%>

<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Đăng ký</title>
        <link rel="stylesheet" href="assets/css/bootstrap.min.css"/>
        <style>
            body {
                background-image: url(image/signup/background.jpg);
                background-size:100%;
            }
            .container{
                display:flex;
                justify-content: center;
                align-items: center;
                height:100dvh;
            }
            .signup {
                width: 420px;
                height: 673px;
                border-width: 1px;
                border-style: solid;
                border-radius:10px;
                border-color: #F0E6EF;
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
                padding-left: 10px;
                width: 300px;
                height: 48px;
                background: #FFFFFF;
                color: #444444;
                border-color: #EBEBEB;
                border-style: solid;
                border-radius: 6px;
                margin-top:5px;
                margin-bottom: 5px;
                margin-left: auto;
                margin-right: auto;
                display: flex;
                flex-wrap: wrap;
            }
            .text-input input{
                   padding-left: 10px;
                outline:none;
                border:none;
                font-family: "Inter";
                font-weight: 500;
                font-size: 14px;
                line-height: 1.3;
                width:84%;
                height:100%;
                border-radius: 6px;

            }
           h4{ 
                color:#DE7475;
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
                width:21px;
                height:21px;
                object-fit: cover;
                align-self:center;
            }
            .eye{
                width: 21px;
                height: 21px;
                object-fit: cover;
                cursor: pointer;
                 align-self: center;
            }
            button{
                width: 300px;
                height: 48px;
                background:#B8BEDE;
                border-color:#B8BEDE;
                border-width: 1px;
                border-style: solid;
                border-radius: 6px;
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
            ::-ms-reveal{
                display:none;
            }
        </style>
    </head>
    <body>
        <div class="container" >          
            <div class="signup">
                <h3>Create Account</h3>
                <form action="signup" method="post">
                    <input type="hidden" name="action"  value="Input&sendMail"/>
                    <div class ="text-input">
                        <img class="icon" src="image/signup/user.png"/>
                        <input  type="text" name="user" placeholder="Username" value="${requestScope.user}" required/>
                    </div>
                    <h4>*Username should have at least 3 words length.</h4>
                    <div class ="text-input">
                        <img class="icon"  src="image/signup/lock.png"/>
                        <input  type="password" name="pass" placeholder="Password" id="password" value="${requestScope.pass}" required/>
                        <img class="eye" src="image/signup/eye-close.png" id="eye-icon"/>
                    </div>
                    <h4>*The password should have
                        1 digit,1 lowercase,1 uppercase letter,1 special character and 8 characters length.</h4>
                    <div class ="text-input">
                        <img class="icon" src="image/signup/lock.png"/>
                        <input  type="password" name="pass2" placeholder="Re-enter Password" required/>
                    </div>    
                    <div class ="text-input">
                        <img class="icon" src="image/signup/email.png"/>
                        <input  type="text" name="email" placeholder="Email" value="${requestScope.email}" required/>
                    </div>
                    <h4>*The email should already active.</h4>
                    <img src="/CardSeller/captcha" id="captcha"/>
                    <img src="image/reload.jpg" onclick="reloadCaptcha()" width="40" height="40"/>
                    <br>
                    <div class="text-input">
                        <img class="icon"  src="image/signup/check.png"/>
                        <input name="answer" required placeholder="Enter captcha"/>
                    </div>
                    <input class="warning" style="color: red"  type="text" readonly value="${requestScope.error}"/>
                    <button type="submit" class="">Create</button>
                    <h6>Already have an account?
                        <a href="login.jsp" style="color:#9C8BB4; text-decoration: underline;">Login here</a></h6>
                </form>
            </div> 
        </div>
    </body>
    <script type="text/javascript">
        let eyeicon = document.getElementById("eye-icon");
        let pass = document.getElementById("password");
        eyeicon.onclick = function () {
            if (password.type === "password") {
                password.type = "text";
                eyeicon.src = "image/signup/eye-open.png";
            } else {
                password.type = "password";
                eyeicon.src = "image/signup/eye-close.png";
            }
        };
        function reloadCaptcha() {
            document.getElementById('captcha').src = 'captcha?' + new Date().getTime();
        }

        window.onload = function () {
            // Reload the CAPTCHA image
            reloadCaptcha();
        };
    </script>
</html>

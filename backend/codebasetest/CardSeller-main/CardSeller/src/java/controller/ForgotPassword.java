/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/Servlet.java to edit this template
 */
package controller;

import dal.userDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import ultis.MailService;
import ultis.OtpService;

/**
 *
 * @author BINH
 */
public class ForgotPassword extends HttpServlet {

    private static int checkTime = 1;

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        // mooix chuc nang thi tao 1 servlet 
        String action = request.getParameter("action") == null ? "" : request.getParameter("action");
        try {
            switch (action) {
                case "": {
                    String url = "forgot-password.jsp";
                    request.getRequestDispatcher(url).forward(request, response);
                    break;
                }
                case "resend-OTP": {
                    resendEmail(request, response);
                    break;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String action = request.getParameter("action") == null ? "" : request.getParameter("action");
        switch (action) {
            case "check": {
                ValidateOtp(request, response);
                break;
            }
            case "sendOtpToMail": {
                sendMail(request, response);
                break;
            }
            case "setNewPassword": {
                setNewPassword(request, response);
                break;
            }

        }
    }

    private void ValidateOtp(HttpServletRequest request, HttpServletResponse response) {
        try {
            // Lấy OTP từ session
            HttpSession session = request.getSession();
            
            // lay otp tuwf sessin => OTP da luu tu truoc roi => Gui mail la da luu OTP len session 
            // OTP 123456  => 123456
            String otp = (String) session.getAttribute("otp");
            String url = "confirm-success.jsp";

            // Lấy OTP nhập từ người dùng
            String enteredOTP = request.getParameter("otp");
            if (checkTime == 3) {
                userDAO _userDAO = new userDAO();
                String email = (String) session.getAttribute("EMAIL");
                // tao 1 method de block accouint
                var result = _userDAO.BlockAccount(email);
                if (result) {
                    request.setAttribute("ERROR", "Your account is blocked");
                    url = "send-mail-noti.jsp";
                } else {
                    System.out.println("Failed");
                }
            } else {
                // Kiểm tra xem OTP nhập có đúng không
                if (otp != null && !otp.isEmpty() && otp.equals(enteredOTP)) {
                    // Xác minh OTP thành công
                    String successMessage = "OTP verified successfully!";
                    request.setAttribute("MESSAGE", successMessage);
                    session.removeAttribute("otp");
                } else {
                    // OTP không đúng
                    String errorMessage = "OTP verification failed! ";
                    checkTime += 1;
                    request.setAttribute("ERROR", errorMessage);
                    url = "send-mail-noti.jsp";
                }
            }
            request.getRequestDispatcher(url).forward(request, response);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void setNewPassword(HttpServletRequest request, HttpServletResponse response) {
        try {
            String url = "confirm-success.jsp";
            HttpSession session = request.getSession();
            String newPassword = request.getParameter("newPassword");

            if (session.getAttribute("EMAIL") != null) {
                String email = (String) session.getAttribute("EMAIL");
                userDAO userDao = new userDAO();
                boolean result = userDao.ForgotPassWord(newPassword, email.trim());
                if (result) {
                    session.removeAttribute("EMAIL");
                    url = "login.jsp";
                    request.setAttribute("MESSAGE", "Reset password successfully!");
                    request.getRequestDispatcher(url).forward(request, response);
                } else {
                    request.setAttribute("ERROR", "ERROR in reset password");
                }
            } else {
                request.setAttribute("ERROR", "Cannot update anymore! Please confirm OTP again");
            }
            request.getRequestDispatcher(url).forward(request, response);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

     private void sendMail(HttpServletRequest request, HttpServletResponse response) {
        try {
            String url = "send-mail-noti.jsp";
            String email = request.getParameter("email");
            userDAO userDAO = new userDAO();
            boolean isValidate = true;
            if (email != null) {
                if (!isValidEmail(email.trim())) {
                    isValidate = false;
                    request.setAttribute("ERROR", "Định dạng email không hợp lệ");
                } else {
                    boolean isExsitEmail = userDAO.isExistEmail(email);
                    if (!isExsitEmail) {
                        isValidate = false;
                        request.setAttribute("ERROR", "Email của bạn không tồn tại trong hệ thống");
                        System.out.println("Email khong ton tai trong he thong");
                    }
                }

                if (isValidate) {
                    HttpSession session = request.getSession();
                    session.setAttribute("EMAIL", email);

                    OtpService optService = new OtpService();
                    String otp = OtpService.genarateOtp();
                    session.setAttribute("otp", otp);
                    session.setAttribute("EMAIL", email.trim());
                    MailService mailService = new MailService();
                    mailService.sendOtpToMail(email, otp);
                } else {
                    url = "forgot-password.jsp";
                }
            } else {
                url = "forgot-password.jsp";
                request.setAttribute("ERROR", "Vui lòng nhập email của bạn");
            }

            request.getRequestDispatcher(url).forward(request, response);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }


    // regex
    private static final String EMAIL_REGEX = "^[\\w.-]+@[a-zA-Z\\d.-]+\\.[a-zA-Z]{2,}$";

    // Method to validate email
    public static boolean isValidEmail(String email) {
        // Compile the regex pattern
        Pattern pattern = Pattern.compile(EMAIL_REGEX);
        // Match the input email string against the pattern
        Matcher matcher = pattern.matcher(email);
        // Return if the email matches the pattern
        return matcher.matches();
    }


    private void resendEmail(HttpServletRequest request, HttpServletResponse response) {
        try {
            HttpSession session = request.getSession();
            String email = (String) session.getAttribute("EMAIL");
            OtpService optService = new OtpService();
            String otp = OtpService.genarateOtp();
            session.setAttribute("otp", otp);
            session.setAttribute("EMAIL", email.trim());
            MailService mailService = new MailService();
            mailService.sendOtpToMail(email, otp);
            request.getRequestDispatcher("send-mail-noti.jsp").forward(request, response);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

}

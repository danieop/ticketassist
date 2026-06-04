/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/Servlet.java to edit this template
 */
package controller;

import dal.userDAO;
import java.io.IOException;
import java.io.PrintWriter;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import model.User;
import ultis.InputValidation;
import ultis.MailService;
import ultis.OtpService;

/**
 *
 * @author badao
 */
@WebServlet(name = "PersonalInfo", urlPatterns = {"/personalinfo"})
public class PersonalInfo extends HttpServlet {

    /**
     * Processes requests for both HTTP <code>GET</code> and <code>POST</code>
     * methods.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("text/html;charset=UTF-8");
        request.setCharacterEncoding("UTF-8");
        String type = request.getParameter("info");
        try {
            switch (type) {
                case "phoneNum": {
                    changePhoneNum(request, response);
                    break;
                }
                case "email": {
                    sendMail(request, response);
                    break;
                }
                case "OTP": {
                    ValidateOtp(request, response);
                    break;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void changePhoneNum(HttpServletRequest request, HttpServletResponse response) {
        try {
            String pn = request.getParameter("phoneNum");
            HttpSession session = request.getSession();
            userDAO d = new userDAO();
            User acc = (User) session.getAttribute("acc");
            if (acc == null) {
            } else {            
                acc.phoneNumber = pn;
                  //update account phone num to database
                d.UpdateInfo(acc);
                  //update account phone num to session
                session.setAttribute("acc", acc);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void sendMail(HttpServletRequest request, HttpServletResponse response) {
        try {
            HttpSession session = request.getSession();
            userDAO ud=new userDAO();
            InputValidation iV=new InputValidation();
            User acc = (User) session.getAttribute("acc");
            //get email
            String email = request.getParameter("email");
            if (email == null ? acc.getEmail() == null : email.equals(acc.getEmail())) {
                 //Fail
                     PrintWriter out = response.getWriter();
                     //send error string to ajax function success(error)
                    out.println("Hãy chọn email mới khác email hiện tại!"); 
            }
            else if(ud.CheckEmail(email)){
             PrintWriter out = response.getWriter();
                     //send error string to ajax function success(error)
                    out.println("Email bị trùng với 1 tài khoản khác!"); }
            else if(iV.GetEmail(email)!=null) {
            PrintWriter out = response.getWriter();
                     //send error string to ajax function success(error)
                    out.println("Email ko hợp lệ!"); }
            else{
                //get OTP 
                OtpService optService = new OtpService();
                String otp = OtpService.genarateOtp();
                //send otp to session
                session.setAttribute("otp", otp);
                session.setAttribute("EMAIL", email.trim());
                session.setMaxInactiveInterval(600);
                //send otp to email account
                MailService mailService = new MailService();
                mailService.sendOtpToMail(email, otp);
            // no need to request dispatcher because only session brought to the website
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void ValidateOtp(HttpServletRequest request, HttpServletResponse response) {
        try {
            // Get OTP from session
            HttpSession session = request.getSession();
            userDAO d = new userDAO();
            String otp = (String) session.getAttribute("otp");
            User acc = (User) session.getAttribute("acc");
            if (acc == null) {
                request.getRequestDispatcher("login.jsp").forward(request, response);
            } else {
                // Get OTP from user
                String enteredOTP = request.getParameter("otp");
                //  OTP validated
                if (otp != null && !otp.isEmpty() && otp.equals(enteredOTP)) {
                    // Success get email from session
                    String email = (String) session.getAttribute("EMAIL");
                    acc.email = email;
                    //update to database
                    d.UpdateInfo(acc);
                    session.setAttribute("acc", acc);
                } else {
                    //Fail
                     PrintWriter out = response.getWriter();
                     //send error string to ajax function success(error)
                    out.println("Xác nhận OTP không thành công!"); 
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // <editor-fold defaultstate="collapsed" desc="HttpServlet methods. Click on the + sign on the left to edit the code.">
    /**
     * Handles the HTTP <code>GET</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Handles the HTTP <code>POST</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Returns a short description of the servlet.
     *
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

}

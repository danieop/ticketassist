/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/Servlet.java to edit this template
 */
package controller;

import dal.transactionDAO;
import dal.userDAO;
import java.io.IOException;
import java.io.PrintWriter;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;
import model.User;
import nl.captcha.Captcha;
import ultis.InputValidation;
import ultis.MailService;
import ultis.OtpService;

/**
 *
 * @author bauserDAO
 */
@WebServlet(name = "SignUp", urlPatterns = {"/signup"})
public class SignUp extends HttpServlet {

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
        try (PrintWriter out = response.getWriter()) {
            /* TODO output your page here. You may use following sample code. */
            out.println("<!DOCTYPE html>");
            out.println("<html>");
            out.println("<head>");
            out.println("<title>Servlet SignUp</title>");
            out.println("</head>");
            out.println("<body>");
            out.println("<h1>Servlet SignUp at " + request.getContextPath() + "</h1>");
            out.println("</body>");
            out.println("</html>");
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
        String action = request.getParameter("action") == null ? "" : request.getParameter("action");
        try {
            switch (action) {
                case "": {
                    String url = "signup.jsp";
                    request.getRequestDispatcher(url).forward(request, response);
                    break;
                }
                case "sendMail": {
                    sendMail(request, response);
                    break;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
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
        String action = request.getParameter("action") == null ? "" : request.getParameter("action");
        switch (action) {
            //get the user sign up information and send OTP
            case "Input&sendMail": {
                InformationInput(request, response);
                break;
            }
            case "Check&CreateAccount": {
                ValidateOtp(request, response);
                break;
            }
        }

    }

    void InformationInput(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        HttpSession session = request.getSession();
        Captcha captcha = (Captcha) session.getAttribute(Captcha.NAME);
        request.setCharacterEncoding("UTF-8");
        String answer = request.getParameter("answer");
        String u = request.getParameter("user");
            String p = request.getParameter("pass");
            String p2 = request.getParameter("pass2");
            String e = request.getParameter("email");
            request.setAttribute("user", u);
            request.setAttribute("pass", p);
            request.setAttribute("email", e);
        if (captcha.isCorrect(answer)) {
            userDAO d = new userDAO();
            InputValidation v = new InputValidation();
            //check user info format 
            if (v.GetUserName(u) != null) {
                request.setAttribute("error", v.GetUserName(u));
                request.getRequestDispatcher("signup.jsp").forward(request, response);
            } else {
                //check email format
                if (v.GetEmail(e) != null) {
                    request.setAttribute("error", v.GetEmail(e));
                    request.getRequestDispatcher("signup.jsp").forward(request, response);
                } else {
                    //check password format
                    if (v.GetPassword(p) != null) {
                        request.setAttribute("error", v.GetPassword(p));
                        request.getRequestDispatcher("signup.jsp").forward(request, response);
                    } else {
                        //check confirm password 
                        if (p2.compareTo(p) != 0) {
                            request.setAttribute("error", "The confirm password is wrong!");
                            request.getRequestDispatcher("signup.jsp").forward(request, response);
                        } else {
                            try {
                                //check the user info is duplicate with other account
                                switch (d.CheckUser(u, e)) {
                                    case 0:
                                        User acc = new User(0,u, p, e, null, null, null, 0, true, 0, null, null);
                                        session.setAttribute("data", acc);
                                        session.setMaxInactiveInterval(600);
                                        sendMail(request, response);
                                        break;
                                    case 1:
                                        //return string email+"existed!!"
                                        request.setAttribute("error", e + " existed!!");
                                        request.getRequestDispatcher("signup.jsp").forward(request, response);
                                        break;
                                    case 2:
                                        //return string username+"existed!!"
                                        request.setAttribute("error", u + " existed!!");
                                        request.getRequestDispatcher("signup.jsp").forward(request, response);
                                        break;
                                    default:
                                        break;
                                }
                            } catch (SQLException ex) {
                                Logger.getLogger(SignUp.class.getName()).log(Level.SEVERE, null, ex);
                            }
                        }
                    }
                }
            }
        } else {
            request.setAttribute("error", "Wrong captcha!");
            request.getRequestDispatcher("signup.jsp").forward(request, response);
        }
    }

    private void sendMail(HttpServletRequest request, HttpServletResponse response) {
        try {
            HttpSession session = request.getSession();
            String url = "verify-signup.jsp";
            //get email
            User u = (User) session.getAttribute("data");
            if (u ==null) {
                url = "signup.jsp";
            } else {
                 String email = u.email;
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
            }
            request.getRequestDispatcher(url).forward(request, response);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void ValidateOtp(HttpServletRequest request, HttpServletResponse response) {
        try {
            // Get OTP from session
            HttpSession session = request.getSession();
            String otp = (String) session.getAttribute("otp");
            String url = "login.jsp";
            // Get OTP from user
            String enteredOTP = request.getParameter("otp");
            //  OTP validated
            if (otp != null && !otp.isEmpty() && otp.equals(enteredOTP)) {
                // Success
                CreateAccount(request, response);
            } else {
                //Fail
                String errorMessage = "OTP verification failed!";
                request.setAttribute("error", errorMessage);
                url = "verify-signup.jsp";
            }
            request.getRequestDispatcher(url).forward(request, response);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void CreateAccount(HttpServletRequest request, HttpServletResponse response) {
        try {
            HttpSession session = request.getSession();
            User acc = (User) session.getAttribute("data");
            userDAO d = new userDAO();
            transactionDAO td =new transactionDAO();
            d.CreateAcc(acc.getUsername(), acc.getPassword(), acc.getEmail());
            td.AddUserWallet(d.GetUserInfo(acc.getUsername()).getID());
        } catch (Exception e) {
            e.printStackTrace();
        }
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

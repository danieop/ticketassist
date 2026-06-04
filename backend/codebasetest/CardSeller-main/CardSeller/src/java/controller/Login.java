/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/Servlet.java to edit this template
 *////
package controller;

import dal.transactionDAO;
import dal.userDAO;
import java.io.IOException;
import java.io.PrintWriter;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.lang.System.Logger;
import java.lang.System.Logger.Level;
import model.User;
import model.UserWallet;
import nl.captcha.Captcha;

/**
 *
 * @author PC
 */
@WebServlet(name = "Login", urlPatterns = {"/login"})
public class Login extends HttpServlet {

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
            out.println("<title>Servlet Login</title>");
            out.println("</head>");
            out.println("<body>");
            out.println("<h1>Servlet Login at " + request.getContextPath() + "</h1>");
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
        HttpSession session = request.getSession();
        Captcha captcha = (Captcha) session.getAttribute(Captcha.NAME);
        request.setCharacterEncoding("UTF-8");
        String answer = request.getParameter("answer");
        String user = request.getParameter("user");
        String pass = request.getParameter("pass");

        if (captcha.isCorrect(answer)) {
            try {
                userDAO d = new userDAO();
                User acc = d.login(user, pass);
                if (acc == null) {
                    request.setAttribute("user", user);
                    request.setAttribute("pass", pass);
                    request.setAttribute("mess", "Wrong username or password!");
                    request.getRequestDispatcher("login.jsp").forward(request, response);
                } else {
                    if (acc.isIsDeleted() == true) {
                        request.setAttribute("user", user);
                        request.setAttribute("pass", pass);
                        request.setAttribute("mess", "Your account has been deactivated!");
                        request.getRequestDispatcher("login.jsp").forward(request, response);
                    } else {
                        transactionDAO td = new transactionDAO();
                        if (td.checkUserWallet(acc.getID()) == false) {
                            td.AddUserWallet(acc.getID());
                        }                  
                        session.setAttribute("acc", acc);
                        session.setAttribute("uwallet",td.getUserWallet(acc.getID()));          
                        response.sendRedirect("home");
                    }

                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        } else {
            request.setAttribute("user", user);
            request.setAttribute("pass", pass);
            request.setAttribute("mess", "Wrong captcha!");
            request.getRequestDispatcher("login.jsp").forward(request, response);
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

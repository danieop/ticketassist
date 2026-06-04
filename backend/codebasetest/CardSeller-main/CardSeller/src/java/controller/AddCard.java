/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/Servlet.java to edit this template
 */
package controller;

import dal.cardDAO;
import java.io.IOException;
import java.io.PrintWriter;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.file.Files;
import model.CardDetail;
import model.ProviderDetail;

/**
 *
 * @author PC
 */
@WebServlet(name = "AddCard", urlPatterns = {"/addcard"})
public class AddCard extends HttpServlet {

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
            out.println("<title>Servlet AddCard</title>");
            out.println("</head>");
            out.println("<body>");
            out.println("<h1>Servlet AddCard at " + request.getContextPath() + "</h1>");
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
        request.setCharacterEncoding("UTF-8");
        cardDAO d = new cardDAO();
        String providerid = request.getParameter("providerid");
        String priceid = request.getParameter("priceid");
        int id = Integer.parseInt(providerid);
        ProviderDetail provider = d.getProviderDetailById(id);
        CardDetail card = d.getPrice(priceid);
        request.setAttribute("provider", provider);
        request.setAttribute("card",card);
        request.getRequestDispatcher("addcard.jsp").forward(request, response);
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
        request.setCharacterEncoding("UTF-8");
        cardDAO d = new cardDAO();
        String mess="";
        String providerid = request.getParameter("providerid");
        String priceid = request.getParameter("priceid");
        String seri_r = request.getParameter("seri");
        String pin_r = request.getParameter("pin");
        int id = Integer.parseInt(providerid);
        ProviderDetail provider = d.getProviderDetailById(id);
        CardDetail card = d.getPrice(priceid);
        try {
            int seri = Integer.parseInt(seri_r);
            int pin = Integer.parseInt(pin_r);
            int countSeri = d.countSeri(seri);
            int countPin = d.countPin(pin);
            if(seri<0 || pin<0){
                throw new NumberFormatException();
            }
            if (countSeri > 0) {
                mess = "Serial number existed!";
                throw new Exception();
            }
            if (countPin > 0) {
                mess = "Pin number existed!";
                throw new Exception();
            }
            d.addCard(priceid, seri, pin);
            d.updateQuantityAfterAdd(priceid);
            mess = "Add card successfully";
        } catch (NumberFormatException e) {
            mess = "Including NUMBER only!";
        } catch (Exception e){
            
        }
                
        request.setAttribute("seri", seri_r);
        request.setAttribute("pin", pin_r);
        request.setAttribute("card", card);
        request.setAttribute("mess", mess);
        request.setAttribute("provider", provider);
        request.getRequestDispatcher("addcard.jsp").forward(request, response);
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

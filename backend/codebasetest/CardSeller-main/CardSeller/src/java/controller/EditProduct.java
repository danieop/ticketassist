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
import model.ProviderDetail;

/**
 *
 * @author PC
 */
@WebServlet(name = "EditProduct", urlPatterns = {"/editproduct"})
public class EditProduct extends HttpServlet {

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
            out.println("<title>Servlet EditProduct</title>");
            out.println("</head>");
            out.println("<body>");
            out.println("<h1>Servlet EditProduct at " + request.getContextPath() + "</h1>");
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
        String id_raw = request.getParameter("cid");
        int id = 0;
        try {
            id = Integer.parseInt(id_raw);
        } catch (Exception e) {

        }
        cardDAO d = new cardDAO();
        ProviderDetail card = d.getProviderDetailById(id);
        request.setAttribute("card", card);
        request.getRequestDispatcher("editproduct.jsp").forward(request, response);
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
        String cid = request.getParameter("cid");
        String provider = request.getParameter("provider");
        String category = request.getParameter("category");
        String image = request.getParameter("image");
        int id = 0;
        try {
            id = Integer.parseInt(cid);
        } catch (Exception e) {

        }
        ProviderDetail card = d.getProviderDetailById(id);
        int countProvider = d.countProvider(provider);
        if (countProvider > 0 && !card.getProviderName().equalsIgnoreCase(provider)) {
            request.setAttribute("card", card);
            request.setAttribute("mess", "Provider is already existed!");
            request.getRequestDispatcher("editproduct.jsp").forward(request, response);
        } else {
            d.editProviderDetail(cid, provider, image, category);
            card = d.getProviderDetailById(id);
            request.setAttribute("card", card);
            request.setAttribute("mess", "Save change succesfully!");
            request.getRequestDispatcher("editproduct.jsp").forward(request, response);
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

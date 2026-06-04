/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/Servlet.java to edit this template
 */
package controller;

import dal.discountDAO;
import dal.provideDetailDAO;
import java.io.IOException;
import java.io.PrintWriter;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import model.CardDetailDiscount;
import model.CardDiscount;
import model.ProviderDetail;
import model.User;

/**
 *
 * @author hacom
 */
public class ManageDiscount extends HttpServlet {

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
            out.println("<title>Servlet ManageDiscount</title>");
            out.println("</head>");
            out.println("<body>");
            out.println("<h1>Servlet ManageDiscount at " + request.getContextPath() + "</h1>");
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
         //check admin
        HttpSession session = request.getSession();
        if(session.getAttribute("acc") == null ) {
            request.getRequestDispatcher("login.jsp").forward(request, response);
            return;
        }
        User user = (User)session.getAttribute("acc");
         if(user.role == null || !user.role.equals("admin")) {
            request.getRequestDispatcher("login.jsp").forward(request, response);
            return;
        }
        //dieu huong trang quan ly discount
        String service = request.getParameter("service");
        discountDAO disDAO = new discountDAO();
        List<CardDetailDiscount> list = new ArrayList<>();
        if (service == null) {

        } else if (service.equals("deleteDiscount")) {
            String did = request.getParameter("did");
            int disId = Integer.parseInt(did);
            //delete card
            CardDiscount cardDis = new CardDiscount();
            cardDis.setDeleteBy(user.ID);
            cardDis.setID(disId);
            
            boolean isDelete = disDAO.deletDiscount(disId);
            
            request.setAttribute("mess", isDelete ? "delete success" : "delete error");
        } else if (service.equals("editDiscount")) {
            String did = request.getParameter("did");
            int disId = Integer.parseInt(did);
            //get cardDis
            CardDetailDiscount cardDetail = disDAO.getCardDiscountByCardId(disId);
            request.setAttribute("cardDetail", cardDetail);
//            provideDetailDAO prDao = new provideDetailDAO();
//            List<ProviderDetail> listPro = prDao.getAllProviderDetail();
//            request.setAttribute("listPro", listPro);
            request.getRequestDispatcher("editDiscount.jsp").forward(request, response);
            return;
        }
        int page = 1;
        int totalPerPage = 2;
        if(request.getParameter("page") != null) {
            page = Integer.parseInt(request.getParameter("page"));
        }
        int totalRecord = disDAO.getAllDiscount().size();
        int totalPage = (int)Math.ceil((double)totalRecord / totalPerPage);
        
        list = disDAO.getAllDiscountPaging(page, totalPerPage);
        request.setAttribute("list", list);
        request.setAttribute("currPage", page);
        request.setAttribute("totalPage", totalPage);
        
        request.getRequestDispatcher("manage-discount.jsp").forward(request, response);
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
        //check admin
        HttpSession session = request.getSession();
        if(session.getAttribute("acc") == null ) {
            request.getRequestDispatcher("login.jsp").forward(request, response);
            return;
        }
        User user = (User)session.getAttribute("acc");
         if(user.role == null || !user.role.equals("admin")) {
            request.getRequestDispatcher("login.jsp").forward(request, response);
            return;
        }
         
        provideDetailDAO prDao = new provideDetailDAO();
        discountDAO disDAO = new discountDAO();
        String service = request.getParameter("Service");
        if (service.equals("editDiscount")) {
            int cardId = Integer.parseInt(request.getParameter("cardId"));
            int percent = Integer.parseInt(request.getParameter("percent"));
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            LocalDateTime startDate = LocalDateTime.parse(request.getParameter("startDate"), formatter);
            LocalDateTime endDate = LocalDateTime.parse(request.getParameter("endDate"), formatter);
            if (endDate.isBefore(startDate)) {
                request.setAttribute("message", "end date must be after start date");
            } else {
                int createBy = user.ID; // Thay thế bằng logic lấy id người tạo

                // Tạo đối tượng CardDiscount
                CardDiscount cardDiscount = new CardDiscount();
                cardDiscount.setCardDetailId(cardId);
                cardDiscount.setPercent(percent);
                cardDiscount.setStartAt(startDate);
                cardDiscount.setEndAt(endDate);

                // Gọi đến DAO để thêm vào cơ sở dữ liệu
                discountDAO discountDAO = new discountDAO(); // Thay thế bằng tên của DAO thực tế của bạn
                boolean isInsert = discountDAO.updateCardDiscount(cardDiscount);
                if (isInsert) {
                    request.setAttribute("message", "Update thành công");
                } else {
                    request.setAttribute("message", "Update ko thành công");
                }
            }
            CardDetailDiscount cardDetail = disDAO.getCardDiscountByCardDetailId(cardId);
            System.out.println("id=" + cardId + "/cardDetail" + cardDetail);
            request.setAttribute("cardDetail", cardDetail);
            // Redirect hoặc forward đến trang cần thiết
            request.getRequestDispatcher("editDiscount.jsp").forward(request, response);
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

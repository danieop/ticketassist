/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/Servlet.java to edit this template
 */
package controller;

import dal.cardDAO;
import dal.discountDAO;
import dal.provideDetailDAO;
import java.io.IOException;
import java.io.PrintWriter;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import model.CardDiscount;
import model.ProviderDetail;
import model.User;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author hacom
 */
public class AddDiscount extends HttpServlet {

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
            out.println("<title>Servlet AddDiscount</title>");
            out.println("</head>");
            out.println("<body>");
            out.println("<h1>Servlet AddDiscount at " + request.getContextPath() + "</h1>");
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
        String service = request.getParameter("service");
        List<ProviderDetail> listPro = new ArrayList<>();
        provideDetailDAO prDao = new provideDetailDAO();
        if (service == null) {
            listPro = prDao.getAllProviderDetail();
        }
        request.setAttribute("listPro", listPro);
        request.getRequestDispatcher("addDiscount.jsp").forward(request, response);
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
        if(session.getAttribute("acc") == null ) {
            request.getRequestDispatcher("login.jsp").forward(request, response);
            return;
        }
        User user = (User)session.getAttribute("acc");
         if(user.role == null || !user.role.equals("admin")) {
            request.getRequestDispatcher("login.jsp").forward(request, response);
            return;
        }
        String service = request.getParameter("Service");
        provideDetailDAO prDao = new provideDetailDAO();
        JSONObject jsonResponse = new JSONObject();
        PrintWriter out = response.getWriter();
        cardDAO cardDAO = new cardDAO();
        if (service.equals("getListCard")) {
            try {
                System.out.println(cardDAO.getCardDetailByProviderID(Integer.parseInt(request.getParameter("proId"))));
                jsonResponse.put("listCard", cardDAO.getCardDetailByProviderID(
                        Integer.parseInt(request.getParameter("proId")
                        )));
                out.print(jsonResponse.toString());
            } catch (JSONException e) {
                System.out.println(e);
            } catch (SQLException ex) {
//                System.Logger.getLogger(AddDiscount.class.getName()).log(Level.SEVERE, null, ex);
                System.out.println("error");
            }
        } else if ("addDiscount".equals(service)) {
            try {
                discountDAO discountDAO = new discountDAO(); // Thay thế bằng tên của DAO thực tế của bạn
                // Lấy thông tin từ form
                int cardId = Integer.parseInt(request.getParameter("cardId"));
                if (discountDAO.getCardDiscountByCardDetailId(cardId) != null) {
                    request.setAttribute("message", "discount for this card have exist");
                } else {
                    int percent = Integer.parseInt(request.getParameter("percent"));
                    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                    LocalDateTime startDate = LocalDateTime.parse(request.getParameter("startDate"), formatter);
                    LocalDateTime endDate = LocalDateTime.parse(request.getParameter("endDate"), formatter);
                    int createBy = user.ID; // Thay thế bằng logic lấy id người tạo
                    if (endDate.isBefore(startDate)) {
                        request.setAttribute("message", "end date must be after start date");
                    } else {
                        // Tạo đối tượng CardDiscount
                        CardDiscount cardDiscount = new CardDiscount();
                        cardDiscount.setCardDetailId(cardId);
                        cardDiscount.setPercent(percent);
                        cardDiscount.setStartAt(startDate);
                        cardDiscount.setEndAt(endDate);
                        cardDiscount.setCreateBy(createBy);
                        // Gọi đến DAO để thêm vào cơ sở dữ liệu
                        boolean isInsert = discountDAO.addCardDiscount(cardDiscount);
                        if (isInsert) {
                            request.setAttribute("message", "Thêm thành công");
                        } else {
                            request.setAttribute("message", "Thêm ko thành công");
                        }
                    }
                }

                List<ProviderDetail> listPro = prDao.getAllProviderDetail();
                request.setAttribute("listPro", listPro);
                // Redirect hoặc forward đến trang cần thiết
                request.getRequestDispatcher("addDiscount.jsp").forward(request, response);
            } catch (Exception e) {
                e.printStackTrace();
                request.setAttribute("error", "Lỗi khi thêm dữ liệu");
                List<ProviderDetail> listPro = prDao.getAllProviderDetail();
                request.setAttribute("listPro", listPro);
                request.getRequestDispatcher("addDiscount.jsp").forward(request, response);
            }
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

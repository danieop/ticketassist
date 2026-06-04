package controller;

import dal.OrderItemDAO;
import java.io.IOException;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import model.CardOrderHistory;
import model.User;

@WebServlet("/orderItems")
public class OrderItem extends HttpServlet {

    private static final int ITEMS_PER_PAGE = 10; // Số mục trên mỗi trang

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        HttpSession session = request.getSession();
        User user = (User) session.getAttribute("acc");
        OrderItemDAO oiDAO = new OrderItemDAO();
        
        if (user == null) {
            response.sendRedirect("login.jsp");
            return;
        }
        
        int page = 1;
        if (request.getParameter("page") != null) {
            try {
                page = Integer.parseInt(request.getParameter("page"));
            } catch (NumberFormatException e) {
                page = 1;
            }
        }

        int totalRecords = oiDAO.getTotalOrderItemsByUserId(user.getID()); // Tổng số đơn đặt hàng của người dùng
        int totalPages = (int) Math.ceil((double) totalRecords / ITEMS_PER_PAGE);

        List<CardOrderHistory> orderItems = oiDAO.getOrderItemsByUserId(user.getID(), page, ITEMS_PER_PAGE);

        // Logging for debugging
//        System.out.println("Total Records: " + totalRecords);
//        System.out.println("Order Items: " + orderItems);

        request.setAttribute("orderItems", orderItems);
        request.setAttribute("currentPage", page);
        request.setAttribute("totalPages", totalPages);

        request.getRequestDispatcher("orderItem.jsp").forward(request, response);
    }
}

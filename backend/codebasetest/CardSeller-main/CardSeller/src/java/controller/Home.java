/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/Servlet.java to edit this template
 */
package controller;

import dal.cardDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.sql.SQLException;
import java.util.List;
import model.viewModel.CardHomepageVM;

/**
 *
 * @author BINH
 */
public class Home extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            String type = request.getParameter("type");
            cardDAO _cardDAO = new cardDAO();
            String indexS = request.getParameter("index");

            if (indexS == null) {
                indexS = "1";
            }
            if (type == null) {
                type = "phonecard";
            }
            int index = Integer.parseInt(indexS);
            List<CardHomepageVM> listCard = _cardDAO.getAllProduct(index, type);
            int total = _cardDAO.getAllProviderTotal();
            int lastPage = total / 12;
            if (total % 12 != 0) {
                lastPage++;
            }
            request.setAttribute("type", type);
            request.setAttribute("LIST_CARD", listCard);
            request.setAttribute("endP", lastPage);
            request.setAttribute("selectedPage", index);
            
            HttpSession session = request.getSession();
            if(session.getAttribute("QUANTITY_ERROR") != null) {
                String error = "Số lượng sản phẩm bạn muốn thêm đã vượt quá số lượng có sẵn trong kho. Vui lòng kiểm tra giỏ hàng của bạn và điều chỉnh lại số lượng";
                request.setAttribute("ERROR", error);
                session.removeAttribute("QUANTITY_ERROR");
            } else if(session.getAttribute("CARD_ERROR") != null) {
                String error = "Vui lòng chọn thẻ và số lượng thẻ";
                request.setAttribute("ERROR", error);
                session.removeAttribute("CARD_ERROR");
            }
            
            request.getRequestDispatcher("home.jsp").forward(request, response);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
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
public static void main(String[] args) throws SQLException {
    cardDAO _cardDAO = new cardDAO();
        List<CardHomepageVM> listCard = _cardDAO.getAllProduct(1, "phonecard");
        System.out.println(listCard);
    }
}




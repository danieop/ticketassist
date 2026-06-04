/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/Servlet.java to edit this template
 */
package controller;

import dal.cardDAO;
import dal.cartDAO;
import dal.transactionDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import model.Card;
import model.CardDetail;
import model.Order;
import model.OrderItem;
import model.User;
import model.UserWallet;
import model.viewModel.CartDetailVM;
import ultis.MailService;
import ultis.SendProduct;

/**
 *
 * @author Datnt
 */
public class CheckOutController extends HttpServlet {

//    public boolean isEnoughCard(){
//        cardDAO _cardDAO = new cardDAO();
//        HttpSession session = request.getSession();
//            User user = (User) session.getAttribute("acc");
//            cartDAO cartDAO = new cartDAO();
//            List<CartDetailVM> listUserCart = cartDAO.getCartHaveDisByUserId(user.getID());
//            if (listUserCart != null) {
//                request.setAttribute("CARTS", listUserCart);
//            }
//    }
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            boolean haveQuantity = true;
            HttpSession session = request.getSession();
            User user = (User) session.getAttribute("acc");
            cardDAO _cardDAO = new cardDAO();
            cartDAO _cartDAO = new cartDAO();
            List<CartDetailVM> listUserCart = _cartDAO.getCartHaveDisByUserId(user.getID());
            if (listUserCart != null) {
                for (CartDetailVM cartDetailVM : listUserCart) {
                    int cardId = cartDetailVM.getCartDetailId();//cardDetailId
                    System.out.println(cardId);
                    CardDetail cardDetail = _cardDAO.getPrice(Integer.toString(cardId));
                    if (cardDetail.getQuantity() < cartDetailVM.getQuantity()) {
                        haveQuantity = false;
                        System.out.println(haveQuantity);
                    }
                }
            }
            if (haveQuantity == true) {
                float totalCartPrice = _cartDAO.getTotalCartValue(user.getID());
                transactionDAO transDAO = new transactionDAO();
                UserWallet userWallet = transDAO.getUserWallet(user.getID());

                if (userWallet.getAmount() >= totalCartPrice) {
                    ManageOrderQueue.addOrderQueue(new Order(user.getID(),totalCartPrice));
//                    boolean result = _cartDAO.CheckOut(user.getID(), totalCartPrice);
//                    if (result) {
//                        _cartDAO.updateUserWallet(user.getID(), totalCartPrice);
                        session.setAttribute("uwallet", transDAO.getUserWallet(user.getID()));
//                        List<OrderItem> listOrderItem = _cartDAO.getAllUserOrderItem(_cartDAO.getLastestOrderId(user.getID()));
//                        List<Card> totalCards = new ArrayList<>();
//                        for (OrderItem orderItem : listOrderItem) {
//                            totalCards.addAll(_cartDAO.getCardInStock(orderItem.getCardDetailId(), (int) orderItem.getQuantity()));
//                            _cartDAO.removeSoldCard(orderItem.getCardDetailId(), (int) orderItem.getQuantity(), user.getID(),orderItem.getId());
//                            _cardDAO.updateQuantityAfterSold(Integer.toString(orderItem.getCardDetailId()), (int) orderItem.getQuantity());
//                        }
//                        SendProduct sendProduct = new SendProduct(totalCards, user.getEmail());
//                        Thread t1 = new Thread(sendProduct);
//                        t1.start();
////                        SendProduct.sendCardToMail(user.getEmail(), totalCards);
                        request.setAttribute("MESSAGE", "Đơn hàng đang được xử lý");
//                    } else {
//                        request.setAttribute("MESSAGE", "Check out thất bại");
//                    }
                } else {
                    request.setAttribute("MESSAGE", "Số tiền trong ví không đủ");
                }
            }else{
                request.setAttribute("MESSAGE", "Không có đủ thẻ trong kho");
            }

            request.getRequestDispatcher("home").forward(request, response);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    public static void main(String[] args) throws SQLException {
        cardDAO _cardDAO = new cardDAO();
        cartDAO _cartDAO = new cartDAO();
//        System.out.println(_cartDAO.getLastestOrderId(1));
//        List<OrderItem> listOrderItem = _cartDAO.getAllUserOrderItem(_cartDAO.getLastestOrderId(1));
//        System.out.println(listOrderItem);
        List<CartDetailVM> listUserCart = _cartDAO.getCartHaveDisByUserId(1);
            System.out.println(listUserCart);
            
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
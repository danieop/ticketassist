/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/Servlet.java to edit this template
 */
package controller;

import com.google.gson.JsonObject;
import dal.cardDAO;
import dal.cartDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;
import java.util.List;
import model.CardDetail;
import model.CartItem;
import model.User;
import model.viewModel.CartDetailVM;

/**
 *
 * @author Datnt
 */
public class Cart extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        HttpSession session = request.getSession();
        if (session != null && session.getAttribute("acc") != null) {
            String action = request.getParameter("action") == null ? "" : request.getParameter("action");
            switch (action) {
                case "view": {
                    viewUserCart(request, response);
                    break;
                }
                case "update":
                    updateCart(request, response);
                    break;
                case "remove":
                    removeFromCart(request, response);
                    break;

            }
        } else {
            response.sendRedirect("login.jsp");
        }

    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        HttpSession session = request.getSession();
        if (session != null && session.getAttribute("acc") != null) {
            String action = request.getParameter("action") == null ? "" : request.getParameter("action");
            switch (action) {
                case "add": {
                    addToCart(request, response);
                    break;
                }

            }
        } else {
            response.sendRedirect("login.jsp");
        }

    }

    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

    private void viewUserCart(HttpServletRequest request, HttpServletResponse response) {
        try {
            HttpSession session = request.getSession();
            User user = (User) session.getAttribute("acc");
            cartDAO cartDAO = new cartDAO();
            List<CartDetailVM> listUserCart = cartDAO.getCartHaveDisByUserId(user.getID());
            if (listUserCart != null) {
                request.setAttribute("CARTS", listUserCart);
            }
            float totalPrice = 0;
            for (CartDetailVM cartDetailVM : listUserCart) {
                totalPrice += cartDetailVM.getTotalPrice();
            }
            request.setAttribute("TOTAL_PRICE", totalPrice);

            request.getRequestDispatcher("cart.jsp").forward(request, response);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void addToCart(HttpServletRequest request, HttpServletResponse response) {
        try {
            HttpSession session = request.getSession();
            User user = (User) session.getAttribute("acc");
            String cardquantity = request.getParameter("card-quantity");
            String cardDetailId = request.getParameter("cardDetailId");
            cardDAO _cardDAO = new cardDAO();
            CardDetail cd = _cardDAO.getCardDetailById(cardDetailId);
            if (cd == null) {
                session.setAttribute("CARD_ERROR", true);
            } else {
                // lay thong tin cua card trong db ra dua vao cardDetailId; 
                int cardQuantity = Integer.parseInt(cardquantity);
                if (cardQuantity > cd.getQuantity()) {
                    session.setAttribute("QUANTITY_ERROR", true);
                } else {
                    cartDAO cartDAO = new cartDAO();
                    CartItem existingCartItem = cartDAO.getCartItemByUserIdAndCardDetailId(user.getID(), Integer.parseInt(cardDetailId));
                    if (existingCartItem != null) {
                        // Update the quantity of the existing cart item       
                        // soos luong moi = so lunog co trong card san roi + them so luong moi them vao
                        int newCardQuantity = existingCartItem.getQuantity() + Integer.parseInt(cardquantity);

                        if (newCardQuantity > cd.getQuantity()) {
                            session.setAttribute("QUANTITY_ERROR", true);
                        } else {
                            existingCartItem.setQuantity(newCardQuantity);
                            boolean result = cartDAO.updateCart(existingCartItem);
                            if (result) {
                                request.setAttribute("MESSAGE", "UPDATED CART SUCCESSFULLY");
                            } else {
                                System.out.println("Failed to update cart");
                            }
                        }

                    } else {
                        // Add a new cart item   
                        CartItem cartItem = new CartItem();
                        cartItem.setCartDetailId(Integer.parseInt(cardDetailId));
                        cartItem.setQuantity(Integer.parseInt(cardquantity));
                        cartItem.setUserId(user.getID());
                        boolean result = cartDAO.addToCart(cartItem);
                        if (result) {
                            request.setAttribute("MESSAGE", "ADD TO CART SUCCESSFULLY");
                        } else {
                            System.out.println("Failed add to cart");
                        }
                    }
                }
            }

            response.sendRedirect("home");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void updateCart(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();

        HttpSession session = request.getSession();
        User user = (User) session.getAttribute("acc");
        String cardquantity = request.getParameter("cardquantity");
        String cartItemId = request.getParameter("cartItemId");

        int cardQuantity = Integer.parseInt(cardquantity);
        int cardId = Integer.parseInt(cartItemId);
        cartDAO cartDAO = new cartDAO();
        JsonObject jsonResponse = new JsonObject();

        CartItem ci = cartDAO.getCartItemById(cardId);
        cardDAO _cardDAO = new cardDAO();
        CardDetail cd = _cardDAO.getCardDetailById(ci.getCartDetailId() + "");

        try {
            int cardDetailQuantity = Integer.parseInt(cardquantity);
            float totalPrice = 0;
            boolean result = false;
            if (cardDetailQuantity > cd.getQuantity()) {
                result = false;
            } else {
                if (cardQuantity == 0) {
                    result = cartDAO.removeFromCart(cardId);
                } else {
                    CartItem cartItem = new CartItem();
                    cartItem.setId(cardId);
                    cartItem.setQuantity(cardQuantity);
                    cartItem.setUserId(user.getID());
                    result = cartDAO.updateCart(cartItem);
                }
                List<CartDetailVM> listUserCart = cartDAO.getCartHaveDisByUserId(user.getID());
                if (listUserCart != null) {
                    request.setAttribute("CARTS", listUserCart);
                }
                for (CartDetailVM cartDetailVM : listUserCart) {
                    totalPrice += cartDetailVM.getTotalPrice();
                    if (cardId == cartDetailVM.getId()) {
                        jsonResponse.addProperty("totalPriceCard", cartDetailVM.getTotalPrice());
                    }
                }
            }

            if (result) {
                jsonResponse.addProperty("message", "Cart updated successfully");
                jsonResponse.addProperty("totalPrice", totalPrice);
                jsonResponse.addProperty("status", "success");
            } else {
                jsonResponse.addProperty("message", "Số lượng sản phẩm không đủ");
                jsonResponse.addProperty("status", "error");
            }
        } catch (Exception e) {
            jsonResponse.addProperty("message", "Server error");
            jsonResponse.addProperty("status", "error");
        }
        out.print(jsonResponse.toString());
        out.flush();
    }

    private void removeFromCart(HttpServletRequest request, HttpServletResponse response) {
        try {
            HttpSession session = request.getSession();
            User user = (User) session.getAttribute("acc");
            String cartItemId = request.getParameter("cartItemId");
            cartDAO cartDAO = new cartDAO();
            boolean result = cartDAO.removeFromCart(Integer.parseInt(cartItemId));
            if (result) {
                request.setAttribute("MESSAGE", "REMOVE FROM CART SUCCESSFULLY");
            } else {
                request.setAttribute("MESSAGE", "FAILED TO REMOVE FROM CART");
            }
            response.sendRedirect("cart?action=view");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void main(String[] args) throws SQLException {
        cartDAO cartDAO = new cartDAO();
        List<CartDetailVM> listUserCart = cartDAO.getCartHaveDisByUserId(1);
        System.out.println(listUserCart);
    }
}

/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package controller;

import dal.cardDAO;
import dal.cartDAO;
import dal.transactionDAO;
import dal.userDAO;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.logging.Level;
import java.util.logging.Logger;
import model.Card;
import model.CardDetail;
import model.Order;
import model.User;
import model.UserWallet;
import ultis.SendProduct;
import model.OrderItem;
import model.viewModel.CartDetailVM;

/**
 *
 * @author dangnqhe181760
 */
public class ManageOrderQueue implements Runnable {
//    public void run(){
//        
//    }

    private static Queue<Order> orderQueue = new LinkedList<>();
    cardDAO _cardDAO = new cardDAO();
    cartDAO _cartDAO = new cartDAO();
    userDAO _userDAO = new userDAO();

    @Override
    public void run() {
        while (true) {
            System.out.println("scanning");
            // Your code here
            if (!orderQueue.isEmpty()) {
                try {
                    Order currentOrder = orderQueue.poll();
                    System.out.println("poll");
                    boolean haveQuantity = true;
                    List<CartDetailVM> listUserCart = _cartDAO.getCartHaveDisByUserId(currentOrder.getUserId());
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
                    if (haveQuantity == false) {
                        try {
                            User user = _userDAO.GetUserInfoById(currentOrder.getUserId());
                            SendProduct sendProduct = new SendProduct();
                            sendProduct.sendError();
                        } catch (SQLException ex) {
                            Logger.getLogger(ManageOrderQueue.class.getName()).log(Level.SEVERE, null, ex);
                        }
                    } else {
                        boolean result = _cartDAO.CheckOut(currentOrder.getUserId(), (float) currentOrder.getTotal());
                        if (result) {
                            try {
                                _cartDAO.updateUserWallet(currentOrder.getUserId(), (float) currentOrder.getTotal());
//                        session.setAttribute("uwallet", transDAO.getUserWallet(user.getID()));
                                List<OrderItem> listOrderItem = _cartDAO.getAllUserOrderItem(_cartDAO.getLastestOrderId(currentOrder.getUserId()));
                                List<Card> totalCards = new ArrayList<>();
                                for (OrderItem orderItem : listOrderItem) {
                                    totalCards.addAll(_cartDAO.getCardInStock(orderItem.getCardDetailId(), (int) orderItem.getQuantity()));
                                    System.out.println(totalCards);
                                    _cartDAO.removeSoldCard(orderItem.getCardDetailId(), (int) orderItem.getQuantity(), currentOrder.getUserId(), orderItem.getId());
                                    _cardDAO.updateQuantityAfterSold(Integer.toString(orderItem.getCardDetailId()), (int) orderItem.getQuantity());
                                }
                                User user = _userDAO.GetUserInfoById(currentOrder.getUserId());
                                SendProduct sendProduct = new SendProduct(totalCards, user.getEmail());
                                sendProduct.run();
                            } catch (SQLException ex) {
                                Logger.getLogger(ManageOrderQueue.class.getName()).log(Level.SEVERE, null, ex);
                            }
                        }
                    }
                } catch (SQLException ex) {
                    Logger.getLogger(ManageOrderQueue.class.getName()).log(Level.SEVERE, null, ex);
                }
            }
            try {
                // Sleep to prevent high CPU usage
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break; // Exit the loop if the thread is interrupted
            }

        }
    }

    public static void addOrderQueue(Order newOrder) {
        orderQueue.add(newOrder);
        System.out.println("added");
    }

}

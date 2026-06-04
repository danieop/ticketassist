/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package model;

import java.time.LocalDateTime;
import java.util.List;

/**
 *
 * @author PC
 */
public class PurchaseHistory {
    private LocalDateTime buyDate;
    private List<CardOrderHistory> listPurchaseByOrder;

    public PurchaseHistory(LocalDateTime buyDate, List<CardOrderHistory> listPurchaseByOrder) {
        this.buyDate = buyDate;
        this.listPurchaseByOrder = listPurchaseByOrder;
    }

    public LocalDateTime getBuyDate() {
        return buyDate;
    }

    public void setBuyDate(LocalDateTime buyDate) {
        this.buyDate = buyDate;
    }

    public List<CardOrderHistory> getListPurchaseByOrder() {
        return listPurchaseByOrder;
    }

    public void setListPurchaseByOrder(List<CardOrderHistory> listPurchaseByOrder) {
        this.listPurchaseByOrder = listPurchaseByOrder;
    }

    
    
}

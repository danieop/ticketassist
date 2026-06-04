/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package model;

import java.time.LocalDateTime;

/**
 *
 * @author hacom
 */
public class CardOrderHistory {
    private String providerName, image;
    private int price, id, quantity, orderId, userId;
    private LocalDateTime buyDate;

    public CardOrderHistory(String providerName, String image, int price, int id, int quantity, int orderId, int userId, LocalDateTime buyDate) {
        this.providerName = providerName;
        this.image = image;
        this.price = price;
        this.id = id;
        this.quantity = quantity;
        this.orderId = orderId;
        this.userId = userId;
        this.buyDate = buyDate;
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    

    public int getOrderId() {
        return orderId;
    }

    public void setOrderId(int orderId) {
        this.orderId = orderId;
    }

    

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }
    
    public String getProviderName() {
        return providerName;
    }

    public void setProviderName(String providerName) {
        this.providerName = providerName;
    }

    public int getPrice() {
        return price;
    }

    public void setPrice(int price) {
        this.price = price;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public LocalDateTime getBuyDate() {
        return buyDate;
    }

    public void setBuyDate(LocalDateTime buyDate) {
        this.buyDate = buyDate;
    }

    @Override
    public String toString() {
        return "CardOrderHistory{" + "providerName=" + providerName + ", image=" + image + ", price=" + price + ", id=" + id + ", quantity=" + quantity + ", buyDate=" + buyDate + '}';
    }
}

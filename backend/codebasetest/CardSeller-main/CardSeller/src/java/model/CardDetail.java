/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package model;

import java.util.logging.Logger;

/**
 *
 * @author BINH
 */
public class CardDetail {
    private int Id;   
    private int providerId;
    private double price;
    private String createdAt;
    private String updatedAt;
    private int createdBy;
    private boolean isDeleted;
    private int deletedBy;
    private String deletedAt;
    private int quantity;
    private int discount;
    
    public CardDetail() {
    }

    public CardDetail(int Id, int providerId, double price, String createdAt, String updatedAt, int createdBy, boolean isDeleted, int deletedBy, String deletedAt, int quantity) {
        this.Id = Id;
        this.providerId = providerId;
        this.price = price;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.createdBy = createdBy;
        this.isDeleted = isDeleted;
        this.deletedBy = deletedBy;
        this.deletedAt = deletedAt;
        this.quantity = quantity;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public int getDiscount() {
        return discount;
    }

    public void setDiscount(int discount) {
        this.discount = discount;
    }

    public int getId() {
        return Id;
    }

    public int getProviderId() {
        return providerId;
    }

    public double getPrice() {
        return price;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public int getCreatedBy() {
        return createdBy;
    }

    public boolean isIsDeleted() {
        return isDeleted;
    }

    public int getDeletedBy() {
        return deletedBy;
    }

    public String getDeletedAt() {
        return deletedAt;
    }

    public void setId(int Id) {
        this.Id = Id;
    }

    public void setProviderId(int providerId) {
        this.providerId = providerId;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public void setCreatedBy(int createdBy) {
        this.createdBy = createdBy;
    }

    public void setIsDeleted(boolean isDeleted) {
        this.isDeleted = isDeleted;
    }

    public void setDeletedBy(int deletedBy) {
        this.deletedBy = deletedBy;
    }

    public void setDeletedAt(String deletedAt) {
        this.deletedAt = deletedAt;
    }

    @Override
    public String toString() {
        return "CardDetail{" + "Id=" + Id + ", providerId=" + providerId + 
                ", price=" + price + ", createdAt=" + createdAt + ", updatedAt=" + 
                updatedAt + ", createdBy=" + createdBy + ", isDeleted=" + isDeleted + ","
                + " deletedBy=" + deletedBy + ", deletedAt=" + deletedAt +", "+ discount+ '}';
    }

    
    
}

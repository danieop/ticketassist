/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package model;

import java.sql.Date;

/**
 *
 * @author dangnqhe181760
 */
public class OrderItem {
    private int Id;  
    private int orderId;
    private int cardDetailId;
    private double quantity;
    private Date createdAt;
    private Date updatedAt;
    private int createdBy;
    private boolean isDeleted;
    private int deletedBy;
    private Date deletedAt;

    public OrderItem() {
    }

    public OrderItem(int Id, int orderId, int cardDetailId, double quantity, Date createdAt, Date updatedAt, int createdBy, boolean isDeleted, int deletedBy, Date deletedAt) {
        this.Id = Id;
        this.orderId = orderId;
        this.cardDetailId = cardDetailId;
        this.quantity = quantity;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.createdBy = createdBy;
        this.isDeleted = isDeleted;
        this.deletedBy = deletedBy;
        this.deletedAt = deletedAt;
    }
    
    public int getId() {
        return Id;
    }

    public void setId(int Id) {
        this.Id = Id;
    }

    public int getOrderId() {
        return orderId;
    }

    public void setOrderId(int orderId) {
        this.orderId = orderId;
    }

    public int getCardDetailId() {
        return cardDetailId;
    }

    public void setCardDetailId(int cardDetailId) {
        this.cardDetailId = cardDetailId;
    }

    public double getQuantity() {
        return quantity;
    }

    public void setQuantity(double quantity) {
        this.quantity = quantity;
    }

    public int getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(int createdBy) {
        this.createdBy = createdBy;
    }

    public boolean isIsDeleted() {
        return isDeleted;
    }

    public void setIsDeleted(boolean isDeleted) {
        this.isDeleted = isDeleted;
    }

    public int getDeletedBy() {
        return deletedBy;
    }

    public void setDeletedBy(int deletedBy) {
        this.deletedBy = deletedBy;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public Date getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Date getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Date deletedAt) {
        this.deletedAt = deletedAt;
    }

    @Override
    public String toString() {
        return "OrderItem{" + "Id=" + Id + ", orderId=" + orderId + ", cardDetailId=" + cardDetailId + ", quantity=" + quantity + ", createdAt=" + createdAt + ", updatedAt=" + updatedAt + ", createdBy=" + createdBy + ", isDeleted=" + isDeleted + ", deletedBy=" + deletedBy + ", deletedAt=" + deletedAt + '}';
    }
    
   
}

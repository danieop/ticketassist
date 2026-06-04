/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package model;

/**
 *
 * @author BINH
 */
public class CartItem {
    private int Id;
    private int CartDetailId;
    private int UserId;
   private String createdAt;
    private String updatedAt;
    private int createdBy;
    private boolean isDeleted;
    private int deletedBy;
    private String deletedAt;
    private int quantity;

    public CartItem() {
    }

    public CartItem(int Id, int CartDetailId, int UserId, String createdAt, String updatedAt, int createdBy, boolean isDeleted, int deletedBy, String deletedAt, int quantity) {
        this.Id = Id;
        this.CartDetailId = CartDetailId;
        this.UserId = UserId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.createdBy = createdBy;
        this.isDeleted = isDeleted;
        this.deletedBy = deletedBy;
        this.deletedAt = deletedAt;
        this.quantity = quantity;
    }

    public void setId(int Id) {
        this.Id = Id;
    }

    public void setCartDetailId(int CartDetailId) {
        this.CartDetailId = CartDetailId;
    }

    public void setUserId(int UserId) {
        this.UserId = UserId;
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

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public int getId() {
        return Id;
    }

    public int getCartDetailId() {
        return CartDetailId;
    }

    public int getUserId() {
        return UserId;
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

    public int getQuantity() {
        return quantity;
    }
    
    
}

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
public class Card {
    private int Id;  
    private int cardDetailId;
    private int seriNumber;
    private int pinNumber;
    private int orderItemId;
    private Date createdAt;
    private Date updatedAt;
    private int createdBy;
    private boolean isBought;
    private int boughtBy;
    private Date boughtAt;
    private boolean isDeleted;
    private int deletedBy;
    private Date deletedAt;

    public Card() {
    }

    public Card(int Id, int cardDetailId, int seriNumber, int pinNumber, int orderItemId, Date createdAt, Date updatedAt, int createdBy, boolean isBought, int boughtBy, Date boughtAt, boolean isDeleted, int deletedBy, Date deletedAt) {
        this.Id = Id;
        this.cardDetailId = cardDetailId;
        this.seriNumber = seriNumber;
        this.pinNumber = pinNumber;
        this.orderItemId = orderItemId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.createdBy = createdBy;
        this.isBought = isBought;
        this.boughtBy = boughtBy;
        this.boughtAt = boughtAt;
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

    public int getCardDetailId() {
        return cardDetailId;
    }

    public void setCardDetailId(int cardDetailId) {
        this.cardDetailId = cardDetailId;
    }

    public int getSeriNumber() {
        return seriNumber;
    }

    public void setSeriNumber(int seriNumber) {
        this.seriNumber = seriNumber;
    }

    public int getPinNumber() {
        return pinNumber;
    }

    public void setPinNumber(int pinNumber) {
        this.pinNumber = pinNumber;
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

    public int getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(int createdBy) {
        this.createdBy = createdBy;
    }

    public boolean isIsBought() {
        return isBought;
    }

    public void setIsBought(boolean isBought) {
        this.isBought = isBought;
    }

    public int getBoughtBy() {
        return boughtBy;
    }

    public void setBoughtBy(int boughtBy) {
        this.boughtBy = boughtBy;
    }

    public Date getBoughtAt() {
        return boughtAt;
    }

    public void setBoughtAt(Date boughtAt) {
        this.boughtAt = boughtAt;
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

    public Date getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Date deletedAt) {
        this.deletedAt = deletedAt;
    }

    public int getOrderItemId() {
        return orderItemId;
    }

    public void setOrderItemId(int orderItemId) {
        this.orderItemId = orderItemId;
    }

    @Override
    public String toString() {
        return "Card{" + "Id=" + Id + ", cardDetailId=" + cardDetailId + ", seriNumber=" + seriNumber + ", pinNumber=" + pinNumber + ", orderItemId=" + orderItemId + ", createdAt=" + createdAt + ", updatedAt=" + updatedAt + ", createdBy=" + createdBy + ", isBought=" + isBought + ", boughtBy=" + boughtBy + ", boughtAt=" + boughtAt + ", isDeleted=" + isDeleted + ", deletedBy=" + deletedBy + ", deletedAt=" + deletedAt + '}';
    }
}

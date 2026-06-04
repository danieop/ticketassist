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
public class CardDiscount {
 private int ID, percent, isDeleted, deleteBy, createBy, cardDetailId;
    private LocalDateTime createAt, updateAt, startAt, endAt, deletedAt;

    public CardDiscount() {
    }

    public CardDiscount(int ID, int percent, int isDeleted, int deleteBy, int createBy, LocalDateTime createAt, 
            LocalDateTime updateAt, LocalDateTime startAt, LocalDateTime endAt, LocalDateTime deletedAt, int cardDetailId) {
        this.ID = ID;
        this.percent = percent;
        this.isDeleted = isDeleted;
        this.deleteBy = deleteBy;
        this.createBy = createBy;
        this.createAt = createAt;
        this.updateAt = updateAt;
        this.startAt = startAt;
        this.endAt = endAt;
        this.deletedAt = deletedAt;
        this.cardDetailId = cardDetailId;
    }

    public int getCardDetailId() {
        return cardDetailId;
    }

    public void setCardDetailId(int cardDetailId) {
        this.cardDetailId = cardDetailId;
    }

    public int getID() {
        return ID;
    }

    public void setID(int ID) {
        this.ID = ID;
    }

    public int getPercent() {
        return percent;
    }

    public void setPercent(int percent) {
        this.percent = percent;
    }

    public int getIsDeleted() {
        return isDeleted;
    }

    public void setIsDeleted(int isDeleted) {
        this.isDeleted = isDeleted;
    }

    public int getDeleteBy() {
        return deleteBy;
    }

    public void setDeleteBy(int deleteBy) {
        this.deleteBy = deleteBy;
    }

    public int getCreateBy() {
        return createBy;
    }

    public void setCreateBy(int createBy) {
        this.createBy = createBy;
    }

    public LocalDateTime getCreateAt() {
        return createAt;
    }

    public void setCreateAt(LocalDateTime createAt) {
        this.createAt = createAt;
    }

    public LocalDateTime getUpdateAt() {
        return updateAt;
    }

    public void setUpdateAt(LocalDateTime updateAt) {
        this.updateAt = updateAt;
    }

    public LocalDateTime getStartAt() {
        return startAt;
    }

    public void setStartAt(LocalDateTime startAt) {
        this.startAt = startAt;
    }

    public LocalDateTime getEndAt() {
        return endAt;
    }

    public void setEndAt(LocalDateTime endAt) {
        this.endAt = endAt;
    }

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(LocalDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }

    @Override
    public String toString() {
        return "CardDiscount{" + "ID=" + ID + ", percent=" + percent + ", isDeleted=" + isDeleted + ", deleteBy=" + deleteBy + ", createBy=" + createBy + ", createAt=" + createAt + ", updateAt=" + updateAt + ", startAt=" + startAt + ", endAt=" + endAt + ", deletedAt=" + deletedAt + '}';
    }
}
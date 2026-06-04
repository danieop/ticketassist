/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package model.viewModel;

import java.util.List;
import model.CardDetail;

/**
 *
 * @author Datnt
 */
public class CardHomepageVM {
    private int Id;
    private String providerName;
    private String image;
    private String category;
    private String createAt;
    private String updatedAt;
    private int createdBy;
    private boolean isDeleted;
    private int deletedBy;
    private String deletedAt;
    private List<CardDetail> cardPrice;
    int discount;

    public CardHomepageVM() {
    }

    public CardHomepageVM(int Id, String providerName, String image, String category, String createAt, String updatedAt, int createdBy, boolean isDeleted, int deletedBy, String deletedAt, List<CardDetail> cardPrice) {
        this.Id = Id;
        this.providerName = providerName;
        this.image = image;
        this.category = category;
        this.createAt = createAt;
        this.updatedAt = updatedAt;
        this.createdBy = createdBy;
        this.isDeleted = isDeleted;
        this.deletedBy = deletedBy;
        this.deletedAt = deletedAt;
        this.cardPrice = cardPrice;
    }

    public int getDiscount() {
        return discount;
    }

    public void setDiscount(int discount) {
        this.discount = discount;
    }

    public List<CardDetail> getCardPrice() {
        return cardPrice;
    }

    public void setCardPrice(List<CardDetail> cardPrice) {
        this.cardPrice = cardPrice;
    }
    

    public int getId() {
        return Id;
    }

    public String getProviderName() {
        return providerName;
    }

    public String getImage() {
        return image;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }
    
    

    public String getCreateAt() {
        return createAt;
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

    public void setProviderName(String providerName) {
        this.providerName = providerName;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public void setCreateAt(String createAt) {
        this.createAt = createAt;
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
        return "CardHomepageVM{" + "Id=" + Id + ", providerName=" + providerName + ", image=" + image + ", category=" + category + ", createAt=" + createAt + ", updatedAt=" + updatedAt + ", createdBy=" + createdBy + ", isDeleted=" + isDeleted + ", deletedBy=" + deletedBy + ", deletedAt=" + deletedAt + ", cardPrice=" + cardPrice + '}';
    }

    
}

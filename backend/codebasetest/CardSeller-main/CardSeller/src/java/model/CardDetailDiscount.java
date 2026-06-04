/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package model;

import java.time.LocalDateTime;
import java.util.Date;

/**
 *
 * @author hacom
 */
public class CardDetailDiscount {

    private int proId, percent, cardDetailId;
    private String image, providerName;
    private float price;
    private LocalDateTime startDate, endDate;

    public CardDetailDiscount(int proId, int percent, String image, 
            String providerName, float price, LocalDateTime startDate,
            LocalDateTime endDate, int cardDetailId) {
        this.proId = proId;
        this.percent = percent;
        this.image = image;
        this.providerName = providerName;
        this.price = price;
        this.startDate = startDate;
        this.endDate = endDate;
        this.cardDetailId = cardDetailId;
    }

    public int getCardDetailId() {
        return cardDetailId;
    }

    public void setCardDetailId(int cardDetailId) {
        this.cardDetailId = cardDetailId;
    }

    public int getProId() {
        return proId;
    }

    public void setProId(int proId) {
        this.proId = proId;
    }

    public int getPercent() {
        return percent;
    }

    public void setPercent(int percent) {
        this.percent = percent;
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

    public float getPrice() {
        return price;
    }

    public void setPrice(float price) {
        this.price = price;
    }

    public LocalDateTime getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDateTime startDate) {
        this.startDate = startDate;
    }

    public LocalDateTime getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDateTime endDate) {
        this.endDate = endDate;
    }

    @Override
    public String toString() {
        return "CardDetailDiscount{" + "proId=" + proId + ", percent=" + percent + ", image=" + image + ", providerName=" + providerName + ", price=" + price + ", startDate=" + startDate + ", endDate=" + endDate + '}';
    }
}

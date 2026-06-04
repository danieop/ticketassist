package model;

public class TopCard {
    private String cardProvider;
    private double cardPrice;
    private int purchaseCount;

    public TopCard() {
    }

    public TopCard(String cardProvider, double cardPrice, int purchaseCount) {
        this.cardProvider = cardProvider;
        this.cardPrice = cardPrice;
        this.purchaseCount = purchaseCount;
    }

    // Getters and Setters
    public String getCardProvider() {
        return cardProvider;
    }

    public void setCardProvider(String cardProvider) {
        this.cardProvider = cardProvider;
    }

    public double getCardPrice() {
        return cardPrice;
    }

    public void setCardPrice(double cardPrice) {
        this.cardPrice = cardPrice;
    }

    public int getPurchaseCount() {
        return purchaseCount;
    }

    public void setPurchaseCount(int purchaseCount) {
        this.purchaseCount = purchaseCount;
    }
}

/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package model.viewModel;

/**
 *
 * @author BINH
 */
public class CartDetailVM {

    private int Id;
    private int CartDetailId;
    private String providerName;
    private int quantity;
    private float price;
    private float totalPrice;
    private int percent;

    public CartDetailVM() {
    }

    public CartDetailVM(int Id, int CartDetailId, String providerName, int quantity, float price, float totalPrice) {
        this.Id = Id;
        this.CartDetailId = CartDetailId;
        this.providerName = providerName;
        this.quantity = quantity;
        this.price = price;
        this.totalPrice = totalPrice;
    }

    public int getPercent() {
        return percent;
    }

    public void setPercent(int percent) {
        this.percent = percent;
    }

    public void setPrice(float price) {
        this.price = price;
    }

    public float getPrice() {
        return price;
    }

  
    public void setId(int Id) {
        this.Id = Id;
    }

    public void setCartDetailId(int CartDetailId) {
        this.CartDetailId = CartDetailId;
    }

    public void setProviderName(String providerName) {
        this.providerName = providerName;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public void setTotalPrice(float totalPrice) {
        this.totalPrice = totalPrice;
    }

    public int getId() {
        return Id;
    }

    public int getCartDetailId() {
        return CartDetailId;
    }

    public String getProviderName() {
        return providerName;
    }

    public int getQuantity() {
        return quantity;
    }

    public float getTotalPrice() {
        return totalPrice;
    }

    @Override
    public String toString() {
        return "CartDetailVM{" + "Id=" + Id + ", CartDetailId=" + CartDetailId + ", providerName=" + providerName + ", quantity=" + quantity + ", price=" + price + ", totalPrice=" + totalPrice + ", percent=" + percent + '}';
    }

}

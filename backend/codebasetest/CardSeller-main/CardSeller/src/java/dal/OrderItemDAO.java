package dal;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import model.OrderItem;
import java.util.ArrayList;
import java.util.List;
import java.sql.Connection;
import java.time.LocalDateTime;
import model.CardOrderHistory;
import model.PurchaseHistory;

/**
 *
 * @author hacom
 */
public class OrderItemDAO extends DBContext {

    public List<PurchaseHistory> getPurchaseHistory(int userId) {
        List<PurchaseHistory> purchaseHistory = new ArrayList<>();
        List<Integer> listOrderId = new ArrayList<>();        
        String sql = "select distinct orderid from PurchaseHistory where userid = ? order by orderid desc";
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                listOrderId.add(rs.getInt("orderid"));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        for (int i = 0; i < listOrderId.size(); i++) {
            List<CardOrderHistory> getOrderItems = getOrderItems(userId, listOrderId.get(i));
            PurchaseHistory purchaseList = new PurchaseHistory(getOrderItems.get(0).getBuyDate(), getOrderItems);
            purchaseHistory.add(purchaseList);
        }
        
        return purchaseHistory;
    }

    public List<CardOrderHistory> getOrderItemsByUserId(int userId, int page, int itemsPerPage) {
        List<CardOrderHistory> orderItems = new ArrayList<>();
        String sql = "SELECT ID, providerName, image, createdAt, quantity, price "
                + "FROM PurchaseHistory "
                + "WHERE UserID = ? "
                + "ORDER BY createdAt DESC "
                + "OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setInt(2, (page - 1) * itemsPerPage);
            ps.setInt(3, itemsPerPage);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                CardOrderHistory card = new CardOrderHistory(
                        rs.getString("providerName"),
                        rs.getString("image"),
                        rs.getInt("price"),
                        rs.getInt("ID"),
                        rs.getInt("quantity"),
                        rs.getInt("OrderID"),
                        rs.getInt("UserID"),
                        rs.getTimestamp("createdAt").toLocalDateTime()
                );
                orderItems.add(card);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return orderItems;
    }

    public List<CardOrderHistory> getOrderItems(int userId, int orderId) {
        List<CardOrderHistory> orderItems = new ArrayList<>();
        String sql = "SELECT OrderID, UserId, ID, providerName, image, createdAt, quantity, price "
                + "FROM PurchaseHistory "
                + "WHERE UserID = ? and OrderID = ?";
        
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setInt(2, orderId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                CardOrderHistory card = new CardOrderHistory(
                        rs.getString("providerName"),
                        rs.getString("image"),
                        rs.getInt("price"),
                        rs.getInt("ID"),
                        rs.getInt("quantity"),
                        rs.getInt("OrderID"),
                        rs.getInt("UserID"),
                        rs.getTimestamp("createdAt").toLocalDateTime()
                );
                orderItems.add(card);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return orderItems;
    }
    
    public int getTotalOrderItemsByUserId(int userId) {
        String sql = "SELECT COUNT(*) FROM PurchaseHistory WHERE UserID = ?";
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getInt(1);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return 0;
    }

    public static void main(String[] args) throws SQLException {
        OrderItemDAO o = new OrderItemDAO();
        
       List<PurchaseHistory> getPurchaseHistory = o.getPurchaseHistory(1);
       for(int i = 0;i<getPurchaseHistory.size();i++){
        for(int j=0; j<getPurchaseHistory.get(i).getListPurchaseByOrder().size();j++){
            System.out.println(getPurchaseHistory.get(i).getListPurchaseByOrder().get(j));
        }
       }
        
    }
}

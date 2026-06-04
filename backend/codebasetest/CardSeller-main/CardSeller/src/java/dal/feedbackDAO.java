/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package dal;

import java.sql.Timestamp;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import model.CardDetail;
import model.CardOrderHistory;
import model.FeedBack;
import model.PurchaseHistory;
import model.User;

/**
 *
 * @author PC
 */
public class feedbackDAO extends DBContext {

    public User GetUserInfoById(int userId) {
        User acc = null;
        String sql = "select * from [User]\n"
                + "where id = ?";
        try {
            PreparedStatement st = connection.prepareStatement(sql);
            st.setInt(1, userId);
            ResultSet rs = st.executeQuery();
            while (rs.next()) {
                acc = new User(rs.getInt("id"),
                        rs.getString("username"),
                        rs.getString("password"),
                        rs.getString("email"),
                        rs.getString("phoneNumber"),
                        rs.getDate("createdAt"),
                        rs.getDate("updatedAt"),
                        rs.getInt("createdBy"),
                        rs.getBoolean("isDeleted"),
                        rs.getInt("deletedBy"),
                        rs.getDate("deletedAt"),
                        rs.getString("role"));
            }
        } catch (SQLException e) {

        }

        return acc;
    }
    public int countFeedback(){
        String sql = "select count(*) from feedback where isDeleted != 1 or isDeleted is null";
        int count = 0;
        try {
            PreparedStatement st = connection.prepareStatement(sql);
            ResultSet rs = st.executeQuery();
            while (rs.next()) {
                count = rs.getInt(1);
            }
        } catch (SQLException e) {

        }
        return count;
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

    public void createFeedback(int userid, int orderid, String feedback) {
        User userinfo = GetUserInfoById(userid);
        List<CardOrderHistory> getOrderItems = getOrderItems(userid, orderid);
        String sql = "insert into feedback(userid, username, email, orderid, PurchaseDate, Feedback, Status)\n"
                + "values (?,?,?,?,?,?,N'Chưa xử lý')";

        try {
            PreparedStatement st = connection.prepareStatement(sql);
            st.setInt(1, userinfo.getID());
            st.setString(2, userinfo.username);
            st.setString(3, userinfo.email);
            st.setInt(4, getOrderItems.get(0).getOrderId());
            st.setString(6, feedback);
            LocalDateTime buyDate = getOrderItems.get(0).getBuyDate();
            Timestamp timestamp = Timestamp.valueOf(buyDate);
            st.setTimestamp(5, timestamp);
            st.executeUpdate();
        } catch (SQLException e) {
            System.out.println(e);
        }

    }
    public void deleteFeedback(String id) {
        String sql = "update feedback\n"
                + "set isDeleted = 1 where id = ?";
        try {
            PreparedStatement st = connection.prepareStatement(sql);
            st.setString(1, id);
            st.executeUpdate();
        } catch (SQLException e) {

        }
    }
    public void changeStatus(String id, String status){
        String newstatus = "";
        if(status.equals("Chưa xử lý")){
            newstatus = "Đã xử lý";
        }
        else{
            newstatus = "Chưa xử lý";
        }
        String sql = "update feedback\n"
                + "set status = ? where id = ?";
        try {
            PreparedStatement st = connection.prepareStatement(sql);
            st.setString(1, newstatus);
            st.setString(2, id);
            st.executeUpdate();
        } catch (SQLException e) {

        }
    }
    public List<FeedBack> getAllFeedBack(int idx) {
        String sql = "SELECT * FROM feedback WHERE isDeleted !=1 or isDeleted is null"
                + " ORDER BY ID desc OFFSET ? ROWS FETCH NEXT 6 ROWS ONLY";
        List<FeedBack> listFeedback = new ArrayList<>();       
        try {
            PreparedStatement st = connection.prepareStatement(sql);
            st.setInt(1,(idx - 1) * 6);
            ResultSet rs = st.executeQuery();
            while (rs.next()) {
                FeedBack fb = new FeedBack(rs.getInt("Id"),
                        rs.getInt("UserId"),
                        rs.getInt("OrderId"),
                        rs.getString("Username"),
                        rs.getString("Email"),
                        rs.getString("Feedback"),
                        rs.getString("Status"),
                        rs.getDate("PurchaseDate"),
                        rs.getBoolean("IsDeleted"));
                
                
                listFeedback.add(fb);
            }
            
            return listFeedback;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }
    public static void main(String[] args) throws SQLException {
        feedbackDAO f = new feedbackDAO();
//       f.createFeedback(1, 99, "Thẻ sử dụng tốt");
        List<FeedBack> getAllFeedBack = f.getAllFeedBack(1);
        System.out.println(getAllFeedBack);
    }
}

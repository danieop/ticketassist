/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package dal;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import model.CardDetailDiscount;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAccessor;
import model.CardDiscount;
/**
 *
 * @author hacom
 */
public class discountDAO extends DBContext {
    
    public List<CardDetailDiscount> getAllDiscountPaging(int page, int size) {
        List<CardDetailDiscount> list = new ArrayList<>();
        String sql = "Select D.ID, P.providerName, P.image, C.price, D.startDate, D.endDate, D.[percent],"
                + " D.CardDetailID from ProviderDetail P\n"
                + "  join CardDetail C on C.ProviderID = P.ID\n"
                + "  join CardDiscount D on D.CardDetailID = C.ID Order by C.ID"
                + "  OFFSET ? ROWS FETCH NEXT ? ROWS only";
        try {
            PreparedStatement st = connection.prepareStatement(sql);
            int offset = (page - 1) * size;
            st.setInt(1, offset);
            st.setInt(2, size);
            ResultSet rs = st.executeQuery();
            while (rs.next()) {
                CardDetailDiscount dis = new CardDetailDiscount(
                        rs.getInt("ID"),
                        rs.getInt("percent"),
                        rs.getString("image"),
                        rs.getString("providerName"),
                        rs.getFloat("price"), 
                        rs.getTimestamp("startDate").toLocalDateTime(),
                        rs.getTimestamp("endDate").toLocalDateTime(),
                        rs.getInt("CardDetailID"));
                list.add(dis);
            }
            return list;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }
    public List<CardDetailDiscount> getAllDiscount() {
        List<CardDetailDiscount> list = new ArrayList<>();
        String sql = "Select D.ID, P.providerName, P.image, C.price, D.startDate, D.endDate, D.[percent],"
                + " D.CardDetailID from ProviderDetail P\n"
                + "  join CardDetail C on C.ProviderID = P.ID\n"
                + "  join CardDiscount D on D.CardDetailID = C.ID";
        try {
            PreparedStatement st = connection.prepareStatement(sql);
            ResultSet rs = st.executeQuery();
            while (rs.next()) {
                CardDetailDiscount dis = new CardDetailDiscount(
                        rs.getInt("ID"),
                        rs.getInt("percent"),
                        rs.getString("image"),
                        rs.getString("providerName"),
                        rs.getFloat("price"), 
                        rs.getTimestamp("startDate").toLocalDateTime(),
                        rs.getTimestamp("endDate").toLocalDateTime(),
                        rs.getInt("CardDetailID"));
                list.add(dis);
            }
            return list;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }
    
    public CardDetailDiscount getCardDiscountByCardId(int cardId) {
        List<CardDetailDiscount> list = new ArrayList<>();
        String sql = "  Select D.ID, P.providerName, P.image, C.price, D.startDate, D.endDate,"
                + " D.[percent], D.CardDetailID  from ProviderDetail P\n"
                + "  join CardDetail C on C.ProviderID = P.ID\n"
                + "  join CardDiscount D on D.CardDetailID = C.ID where D.ID = ?";
        try {
             PreparedStatement st = connection.prepareStatement(sql);
             st.setInt(1, cardId);
            ResultSet rs = st.executeQuery();
            while (rs.next()) {
                return new CardDetailDiscount(
                        rs.getInt("ID"), rs.getInt("percent"), 
                        rs.getString("image"),rs.getString("providerName"),
                        rs.getFloat("price") ,   rs.getTimestamp("startDate").toLocalDateTime(),
                         rs.getTimestamp("endDate").toLocalDateTime(),
                        rs.getInt("CardDetailID"));
            }
        } catch (Exception e) {
            e.printStackTrace();
        } 
        return null;
    }
     public CardDetailDiscount getCardDiscountByCardDetailId(int cardDetailId) {
        String sql = "Select D.ID, P.providerName, P.image, C.price, D.startDate, D.endDate,"
                + " D.[percent], D.CardDetailID  from ProviderDetail P\n"
                + "  join CardDetail C on C.ProviderID = P.ID\n"
                + "  join CardDiscount D on D.CardDetailID = C.ID where D.CardDetailID = ?";
        try {
             PreparedStatement st = connection.prepareStatement(sql);
             st.setInt(1, cardDetailId);
            ResultSet rs = st.executeQuery();
            while (rs.next()) {
                return new CardDetailDiscount(
                        rs.getInt("ID"), rs.getInt("percent"), 
                        rs.getString("image"),rs.getString("providerName"),
                        rs.getFloat("price") ,   rs.getTimestamp("startDate").toLocalDateTime(),
                         rs.getTimestamp("endDate").toLocalDateTime(),
                        rs.getInt("CardDetailID"));
            }
        } catch (Exception e) {
            e.printStackTrace();
        } 
        return null;
    }
    public boolean addCardDiscount(CardDiscount carDis) {
        String sql = "INSERT INTO [dbo].[CardDiscount]\n"
                + "           ([cardDetailId]\n"
                + "           ,[percent]\n"
                + "           ,[createdAt]\n"
                + "           ,[startDate]\n"
                + "           ,[createdBy]\n"
                + "           ,[endDate])\n"
                + "     VALUES(?, ?, ?, ?, ?, ?)";
        LocalDateTime today = LocalDateTime.now();
        try {
            PreparedStatement st = connection.prepareStatement(sql);
            st.setInt(1, carDis.getCardDetailId());
            st.setInt(2, carDis.getPercent());
            st.setTimestamp(3, Timestamp.valueOf(today));
            st.setTimestamp(4, Timestamp.valueOf(carDis.getStartAt()));
            st.setInt(5, carDis.getCreateBy());
            st.setTimestamp(6, Timestamp.valueOf(carDis.getEndAt()));
            return st.executeUpdate() > 0;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }
    
    public boolean updateCardDiscount(CardDiscount carDis) {
        String sql = "UPDATE [dbo].[CardDiscount]\n"
                + "   SET [percent] = ?\n"
                + "      ,[updatedAt] = ?\n"
                + "      ,[startDate] = ?\n"
                + "      ,[endDate] = ?\n"
                + " WHERE [cardDetailId] = ?";
        LocalDateTime today = LocalDateTime.now();
        try {
            PreparedStatement st = connection.prepareStatement(sql);
            st.setInt(1, carDis.getPercent());
            st.setTimestamp(2, Timestamp.valueOf(today));
            st.setTimestamp(3, Timestamp.valueOf(carDis.getStartAt()));
            st.setTimestamp(4, Timestamp.valueOf(carDis.getEndAt()));
            st.setInt(5, carDis.getCardDetailId());
            return st.executeUpdate() > 0;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }
    
    public boolean deletDiscount(int disId) {
        String sql = "Delete from [dbo].[CardDiscount]\n"
                + "where ID = ?";
        try {
            PreparedStatement st = connection.prepareStatement(sql);
            st.setInt(1, disId);
            return st.executeUpdate() > 0;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }
    
    
//    public boolean deletDiscount(CardDiscount card) {
//        String sql = "UPDATE [dbo].[CardDiscount]\n"
//                + "   SET [isDeleted] = ?\n"
//                + "      ,[deletedBy] = ?\n"
//                + "      ,[deletedAt] = ?\n"
//                + " WHERE ID = ?";
//        try {
//            LocalDateTime today = LocalDateTime.now();
//            PreparedStatement st = connection.prepareStatement(sql);
//            st.setInt(1, 1);
//            st.setInt(2, card.getDeleteBy());
//            st.setTimestamp(3, Timestamp.valueOf(today));
//            st.setInt(4, card.getID());
//            return st.executeUpdate() > 0;
//        } catch (Exception e) {
//            e.printStackTrace();
//        }
//        return false;
//    }
}

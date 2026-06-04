/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package dal;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import model.TransHistory;
import model.UserWallet;

/**
 *
 * @author badao
 */
public class transactionDAO extends DBContext {

    public void AddUserWallet(int uID) throws SQLException {
        String sql = "Insert into UserWallet(UserID,amount,createdAt,createdBy) values(?,0,getDate(),?)";
        PreparedStatement st = connection.prepareStatement(sql);
        try {
            st.setInt(1, uID);
            st.setInt(2, uID);
            st.executeUpdate();
        } catch (SQLException e) {
            System.out.println(e);
        } finally {
            st.close();
        }
    }

    public boolean checkUserWallet(int uID) throws SQLException {
        String sql = "Select* from UserWallet where UserID=?";
        PreparedStatement st = connection.prepareStatement(sql);
        double uAmount = 0;
        try {
            st.setInt(1, uID);
            ResultSet rs = st.executeQuery();
            if (rs.next()) {
                return true;
            }
        } catch (SQLException e) {
            System.out.println(e);
        } finally {
            st.close();
        }
        return false;
    }

    public UserWallet getUserWallet(int uID) throws SQLException {
        String sql = "Select* from UserWallet where UserID=?";
        PreparedStatement st = connection.prepareStatement(sql);
        UserWallet uW = null;
        try {
            st.setInt(1, uID);
            ResultSet rs = st.executeQuery();
            if (rs.next()) {
                uW = new UserWallet(rs.getInt("ID"),
                        rs.getInt("UserID"),
                        rs.getDouble("amount"),
                        rs.getDate("createdAt"),
                        rs.getDate("updatedAt"),
                        rs.getInt("createdBy"),
                        rs.getBoolean("isDeleted"),
                        rs.getInt("deletedBy"),
                        rs.getDate("deletedAt"));
            }
        } catch (SQLException e) {
            System.out.println(e);
        } finally {
            st.close();
        }
        return uW;
    }

    public int getTotalUserTransaction(int uwid) {
        String sql = "select count(*) from TransactionHistory where UserWalletID=?  ";
        int count = 0;
        try {
            PreparedStatement st = connection.prepareStatement(sql);
            st.setInt(1, uwid);
            ResultSet rs = st.executeQuery();
            while (rs.next()) {
                count = rs.getInt(1);
            }
        } catch (SQLException e) {

        }
        return count;
    }

    public List<TransHistory> getTransHistory(int uwid, int idx) throws SQLException {
        List<TransHistory> list = new ArrayList<>();
        String sql = "select* from TransactionHistory where UserWalletID=? ORDER BY ID OFFSET ? ROWS FETCH NEXT 10 ROWS ONLY";
        PreparedStatement st = connection.prepareStatement(sql);
        try {
            st.setInt(1, uwid);
            st.setInt(2, (idx - 1) * 10);
            ResultSet rs = st.executeQuery();
            while (rs.next()) {
                TransHistory transHis = new TransHistory(rs.getInt("ID"),
                        rs.getInt("UserWalletID"),
                        rs.getDouble("amount"),
                        rs.getString("method"),
                        rs.getBoolean("processStatus"),
                        rs.getBoolean("successStatus"),
                        rs.getDate("createdAt"),
                        rs.getBoolean("isDeleted"),
                        rs.getInt("deletedBy"),
                        rs.getDate("deletedAt"));
                list.add(transHis);
            }
        } catch (SQLException e) {
            System.out.println(e);
        } finally {
            st.close();
        }

        return list;
    }

    public void updateUserWallet(int uID) throws SQLException {
        int userWalletID = getUserWallet(uID).getID();
        String sql = "select* from TransactionHistory where UserWalletID=? AND processStatus=0";
        String sql2 = "Update TransactionHistory set processStatus=1 where ID=?";
        String sql3 = "Update UserWallet set amount=?,updatedAt=getDate() where UserID=?";
        List<TransHistory> list = new ArrayList<>();
        try {
            PreparedStatement st = connection.prepareStatement(sql);
            st.setInt(1, userWalletID);
            double currAmount = getUserWallet(uID).getAmount();
            ResultSet rs = st.executeQuery();
            //get the list new transaction (processStatus=0)
            while (rs.next()) {
                TransHistory transHis = new TransHistory(rs.getInt("ID"),
                        rs.getInt("UserWalletID"),
                        rs.getDouble("amount"),
                        rs.getString("method"),
                        rs.getBoolean("processStatus"),
                        rs.getBoolean("successStatus"),
                        rs.getDate("createdAt"),
                        rs.getBoolean("isDeleted"),
                        rs.getInt("deletedBy"),
                        rs.getDate("deletedAt"));
                list.add(transHis);
            }
            //check the list
            for (int i = 0; i < list.size(); i++) {
                //amount increase when have a success transfer
                if (list.get(i).isSuccessStatus() == true) {
                    currAmount += list.get(i).getAmount();
                    PreparedStatement st3 = connection.prepareStatement(sql3);
                    st3.setDouble(1, currAmount);
                    st3.setInt(2, uID);
                    st3.executeUpdate();
                }
                //update transaction status
                PreparedStatement st2 = connection.prepareStatement(sql2);
                st2.setInt(1, list.get(i).getID());
                st2.executeUpdate();
            }
        } catch (SQLException e) {
            System.out.println(e);
        }
    }

    public void AddTransactionRecord(int uID, double amount, String method, boolean status) throws SQLException {
        int walletID = getUserWallet(uID).getID();
        String sql = "Insert into TransactionHistory(UserWalletID,amount,method,processStatus,"
                + "successStatus,createdAt) values (?,?,?,0,?,getDate())";
        PreparedStatement st = connection.prepareStatement(sql);
        try {
            st.setInt(1, walletID);
            st.setDouble(2, amount);
            st.setString(3, method);
            st.setBoolean(4, status);
            st.executeUpdate();
        } catch (SQLException e) {
            System.out.println(e);
        } finally {
            st.close();
        }
    }

}

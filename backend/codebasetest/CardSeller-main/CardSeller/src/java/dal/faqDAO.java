/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package dal;

import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import model.FAQ;
/**
 *
 * @author hacom
 */
// src/java/com/example/dao/faqDAO.java


public class faqDAO extends DBContext {

    public List<FAQ> getAllFAQs() {
        List<FAQ> list = new ArrayList<>();
        String sql = "SELECT ID, Question, Answer FROM FAQs";
        try {
            PreparedStatement st = connection.prepareStatement(sql);
            ResultSet rs = st.executeQuery();
            while (rs.next()) {
                FAQ faq = new FAQ(
                        rs.getInt("ID"),
                        rs.getString("Question"),
                        rs.getString("Answer")
                );
                list.add(faq);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        } 
        return list;
    }
}

/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package dal;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import model.CardDetailDiscount;
import model.ProviderDetail;

/**
 *
 * @author hacom
 */
public class provideDetailDAO extends DBContext {
   public List<ProviderDetail> getAllProviderDetail() {
       List<ProviderDetail> list = new ArrayList<>();
       String sql = "Select P.ID, P.providerName FROM [dbo].[ProviderDetail] P";
       try{
           PreparedStatement st = connection.prepareStatement(sql);
            ResultSet rs = st.executeQuery();
            while (rs.next()) {
               ProviderDetail dis = new ProviderDetail(rs.getInt(1), rs.getString(2));
               list.add(dis);
            }
            return list;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
   }
}

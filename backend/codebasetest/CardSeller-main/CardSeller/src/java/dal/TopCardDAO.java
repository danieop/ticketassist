package dal;

import model.TopCard;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import model.PurchaseHistory;

public class TopCardDAO extends DBContext {

    public List<TopCard> getTopCards() {
        List<TopCard> topCards = new ArrayList<>();
        String sql = 
                     "SELECT "
                   + "    providerName AS CardProvider, "
                   + "    price AS CardPrice, "
                   + "    COUNT([ID]) AS PurchaseCount "
                   + "FROM "
                   + "    dbo.PurchaseHistory "
                   + "GROUP BY "
                   + "    providerName, price "
                   + "ORDER BY "
                   + "    PurchaseCount DESC";

        try (PreparedStatement st = connection.prepareStatement(sql);
             ResultSet rs = st.executeQuery()) {

            while (rs.next()) {
                String provider = rs.getString("CardProvider");
                double price = rs.getDouble("CardPrice");
                int count = rs.getInt("PurchaseCount");
                topCards.add(new TopCard(provider, price, count));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }

        return topCards;
    }
}


       
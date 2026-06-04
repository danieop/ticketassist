package dal;

import java.lang.System.Logger;
import java.lang.System.Logger.Level;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import model.Card;
import model.CartItem;
import model.OrderItem;
import model.UserWallet;
import model.viewModel.CartDetailVM;

/**
 *
 * @author BINH
 */
public class cartDAO extends DBContext {

    public boolean addToCart(CartItem cartItem) throws SQLException {
        String sql = "INSERT INTO CartItem (CardDetailID, quantity, createdAt, UserId) VALUES(?, ?, ?, ?)";
        PreparedStatement st = connection.prepareStatement(sql);
        try {
            st.setInt(1, cartItem.getCartDetailId());
            st.setInt(2, cartItem.getQuantity());

            DateFormat dateFormat = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss");
            Date date = new Date();
            String currentDate = dateFormat.format(date);
            st.setString(3, currentDate);
            st.setInt(4, cartItem.getUserId());
            int affectedRow = st.executeUpdate();
            return affectedRow > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Add to cart failed");
        } finally {
            st.close();
        }
        return false;
    }

    public boolean updateCart(CartItem cartItem) throws SQLException {
        String sql = "UPDATE CartItem SET quantity = ? WHERE ID = ? AND UserId = ?";
        PreparedStatement st = connection.prepareStatement(sql);
        try {
            st.setInt(1, cartItem.getQuantity());
            st.setInt(2, cartItem.getId());
            st.setInt(3, cartItem.getUserId());
            int affectedRow = st.executeUpdate();
            return affectedRow > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Update cart failed");
        } finally {
            st.close();
        }
        return false;
    }

    public boolean removeFromCart(int cartItemId) throws SQLException {
        String sql = "DELETE FROM CartItem WHERE ID = ?";
        PreparedStatement st = connection.prepareStatement(sql);
        try {
            st.setInt(1, cartItemId);
            int affectedRow = st.executeUpdate();
            return affectedRow > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Remove from cart failed");
        } finally {
            st.close();
        }
        return false;
    }

    public List<CartDetailVM> getCartByUserId(int userId) throws SQLException {
        List<CartDetailVM> cartDetailIem = new ArrayList<>();
        String sql = "SELECT ci.quantity, cd.price, p.providerName, ci.ID, "
                + "cd.ID as CardID FROM CartItem ci JOIN CardDetail cd ON ci.CardDetailID = cd.ID JOIN ProviderDetail p ON cd.ProviderID = p.ID WHERE ci.UserId = ? ";
        PreparedStatement st = connection.prepareStatement(sql);
        try {
            st.setInt(1, userId);
            ResultSet rs = st.executeQuery();
            while (rs.next()) {
                CartDetailVM cartDetailVM = new CartDetailVM();
                int quantity = rs.getInt("quantity");
                float price = rs.getFloat("price");
                float totalPriice = quantity * price;
                cartDetailVM.setProviderName(rs.getString("providerName"));
                cartDetailVM.setId(rs.getInt("ID"));
                cartDetailVM.setQuantity(quantity);
                cartDetailVM.setPrice(price);
                cartDetailVM.setTotalPrice(totalPriice);
                cartDetailVM.setCartDetailId(rs.getInt("CardID"));
                cartDetailIem.add(cartDetailVM);
            }
            return cartDetailIem;
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            st.close();
        }
        return null;
    }

    public List<CartDetailVM> getCartHaveDisByUserId(int userId) throws SQLException {
        List<CartDetailVM> cartDetailIem = new ArrayList<>();
        String sql = "SELECT ci.quantity, cd.price, p.providerName, ci.ID, cd.ID as CardID,\n"
                + "ISNULL(dis.[percent], 0) as [percent], dis.startDate, dis.endDate\n"
                + "FROM CartItem ci\n"
                + "JOIN CardDetail cd ON ci.CardDetailID = cd.ID\n"
                + "JOIN ProviderDetail p ON cd.ProviderID = p.ID\n"
                + "LEFT JOIN CardDiscount dis ON dis.cardDetailId = ci.CardDetailID\n"
                + "WHERE ci.UserId = ?";
        PreparedStatement st = connection.prepareStatement(sql);
        try {
            LocalDateTime today = LocalDateTime.now();

            st.setInt(1, userId);
            ResultSet rs = st.executeQuery();

            while (rs.next()) {
                LocalDateTime startDate = LocalDateTime.MIN;
                LocalDateTime endDate = LocalDateTime.MIN;
                if (rs.getTimestamp("startDate") != null) {
                    startDate = rs.getTimestamp("startDate").toLocalDateTime();
                }
                if (rs.getTimestamp("endDate") != null) {
                    endDate = rs.getTimestamp("endDate").toLocalDateTime();
                }
                CartDetailVM cartDetailVM = new CartDetailVM();
                int quantity = rs.getInt("quantity");
                int percent = rs.getInt("percent");
                float price = rs.getFloat("price");
                float totalPriice = 0;
                if (today.isAfter(startDate) && today.isBefore(endDate)) {
                    totalPriice = (float) (quantity * (price - (price * percent * 0.01)));
                } else {
                    percent = 0;
                    totalPriice = quantity * (price);
                }
                cartDetailVM.setProviderName(rs.getString("providerName"));
                cartDetailVM.setId(rs.getInt("ID"));
                cartDetailVM.setPercent(percent);
                cartDetailVM.setQuantity(quantity);
                cartDetailVM.setPrice(price);
                cartDetailVM.setTotalPrice(totalPriice);
                cartDetailVM.setCartDetailId(rs.getInt("CardID"));
                cartDetailIem.add(cartDetailVM);
            }
            return cartDetailIem;
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            st.close();
        }
        return null;
    }

    public CartItem getCartItemByUserIdAndCardDetailId(int userId, int cardDetailId) throws SQLException {
        String sql = "SELECT * FROM CartItem WHERE UserId = ? AND CardDetailID = ?";
        PreparedStatement st = connection.prepareStatement(sql);
        try {
            st.setInt(1, userId);
            st.setInt(2, cardDetailId);
            ResultSet rs = st.executeQuery();
            if (rs.next()) {
                CartItem cartItem = new CartItem();
                cartItem.setId(rs.getInt("ID"));
                cartItem.setCartDetailId(rs.getInt("CardDetailID"));
                cartItem.setUserId(rs.getInt("UserId"));
                cartItem.setQuantity(rs.getInt("quantity"));
                cartItem.setCreatedAt(rs.getString("createdAt"));
                cartItem.setUpdatedAt(rs.getString("updatedAt"));
                cartItem.setCreatedBy(rs.getInt("createdBy"));
                cartItem.setIsDeleted(rs.getBoolean("isDeleted"));
                cartItem.setDeletedBy(rs.getInt("deletedBy"));
                cartItem.setDeletedAt(rs.getString("deletedAt"));
                return cartItem;
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            st.close();
        }
        return null;
    }

    public float getTotalCartValue(int userId) {
        try {
            List<CartDetailVM> listCart = getCartByUserId(userId);
            float totalPriceOrder = 0;
            for (CartDetailVM cartVM : listCart) {
                totalPriceOrder += cartVM.getTotalPrice();
            }
            return totalPriceOrder;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return 0;
    }

    public boolean CheckOut(int userId, float totalCartValue) {
        try {
//            float totalCartValue = getTotalCartValue(userId);
            String sql = "INSERT INTO [Order] (UserID, total, createdAt) VALUES(?, ?, ?)";
            PreparedStatement st = connection.prepareStatement(sql);
            try {
                st.setInt(1, userId);

                st.setFloat(2, totalCartValue);
                DateFormat dateFormat = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss");
                Date date = new Date();
                String currentDate = dateFormat.format(date);
                st.setString(3, currentDate);
                int affectedRow = st.executeUpdate();
                if (affectedRow > 0) {
                    sql = "SELECT TOP 1 ID FROM [Order] WHERE UserID = ? ORDER BY ID DESC";
                    st = connection.prepareStatement(sql);
                    st.setInt(1, userId);
                    ResultSet rs = st.executeQuery();
                    if (rs.next()) {
                        int orderId = rs.getInt(1);
                        List<CartDetailVM> listCart = getCartByUserId(userId);
                        for (CartDetailVM cartDetailVM : listCart) {
                            sql = "INSERT INTO OrderItem (OrderID, CardDetailID, quantity, createdAt)VALUES(?, ?, ?, ?)";
                            st = connection.prepareStatement(sql);
                            st.setInt(1, orderId);
                            st.setInt(2, cartDetailVM.getCartDetailId());

                            st.setFloat(3, cartDetailVM.getQuantity());
                            dateFormat = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss");
                            date = new Date();
                            currentDate = dateFormat.format(date);
                            st.setString(4, currentDate);
                            affectedRow = st.executeUpdate();
                            if (affectedRow > 0) {
                                clearUserCart(userId);
                            }
                        }
                    }
                }
                return affectedRow > 0;
            } catch (SQLException e) {
                e.printStackTrace();
                System.out.println("Check out failed");
            } finally {
                st.close();
            }
            return false;

        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    public int getLastestOrderId(int userId) throws SQLException {
        String sql = "SELECT TOP 1 ID FROM [Order] WHERE UserID = ? ORDER BY ID DESC";
        PreparedStatement st = connection.prepareStatement(sql);
        try {
            st.setInt(1, userId);
            ResultSet rs = st.executeQuery();
            if (rs.next()) {
                return rs.getInt(1);
            }
        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("can't get lastest order");
        } finally {
            st.close();
        }
        return -1;
    }

    public List<OrderItem> getAllUserOrderItem(int orderId) throws SQLException {
        List<OrderItem> orderItems = new ArrayList<>();
        String sql = "SELECT * FROM [dbo].[OrderItem] WHERE OrderID = ? ";
        PreparedStatement st = connection.prepareStatement(sql);
        try {
            st.setInt(1, orderId);
            ResultSet rs = st.executeQuery();
            while (rs.next()) {
                OrderItem orderItem = new OrderItem();
                orderItem.setId(rs.getInt("ID"));
                orderItem.setOrderId(rs.getInt("OrderID"));
                orderItem.setCardDetailId(rs.getInt("CardDetailID"));
                orderItem.setQuantity(rs.getInt("quantity"));
                orderItem.setCreatedAt(rs.getDate("createdAt"));
                orderItem.setUpdatedAt(rs.getDate("updatedAt"));
                orderItem.setCreatedBy(rs.getInt("createdBy"));
                orderItem.setIsDeleted(rs.getBoolean("isDeleted"));
                orderItem.setDeletedBy(rs.getInt("deletedBy"));
                orderItem.setDeletedAt(rs.getDate("deletedAt"));
                orderItems.add(orderItem);
            }
            return orderItems;
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            st.close();
        }
        return null;
    }

    public List<Card> getCardInStock(int cardDetailId, int itemQuantity) throws SQLException {
        List<Card> cards = new ArrayList<>();
        String sql = "SELECT TOP (?) * FROM [dbo].[Card] WHERE (isBought IS NULL OR isBought = 0) AND (isDeleted IS NULL OR isDeleted = 0) AND (CardDetailID = ?)";
        PreparedStatement st = connection.prepareStatement(sql);
        try {
            st.setInt(1, itemQuantity);
            st.setInt(2, cardDetailId);
            ResultSet rs = st.executeQuery();
            while (rs.next()) {
                Card card = new Card();
                card.setId(rs.getInt("ID"));
                card.setCardDetailId(rs.getInt("CardDetailID"));
                card.setSeriNumber(rs.getInt("seriNumber"));
                card.setPinNumber(rs.getInt("pinNumber"));
                card.setCreatedAt(rs.getDate("createdAt"));
                card.setUpdatedAt(rs.getDate("updatedAt"));
                card.setCreatedBy(rs.getInt("createdBy"));
                card.setIsBought(rs.getBoolean("isBought"));
                card.setBoughtBy(rs.getInt("boughtBy"));
                card.setBoughtAt(rs.getDate("boughtAt"));
                card.setIsDeleted(rs.getBoolean("isDeleted"));
                card.setDeletedBy(rs.getInt("deletedBy"));
                card.setDeletedAt(rs.getDate("deletedAt"));
                cards.add(card);
            }
            return cards;
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            st.close();
        }
        return null;
    }

    public boolean removeSoldCard(int cardDetailId, int itemQuantity, int userId, int orderItemId) throws SQLException {
        String sql = "UPDATE TOP (?) Card SET isBought = 1, boughtBy = ?, boughtAt = getdate(), OrderItemID = ? WHERE (isBought IS NULL OR isBought = 0) AND (isDeleted IS NULL OR isDeleted = 0) AND (CardDetailID = ?)";
        PreparedStatement st = connection.prepareStatement(sql);
        try {
            st.setInt(1, itemQuantity);
            st.setInt(2, userId);
            st.setInt(3, orderItemId);
            st.setInt(4, cardDetailId);   
            int affectedRow = st.executeUpdate();
            return affectedRow > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("Remove card failed");
        } finally {
            st.close();
        }
        return false;
    }

    public boolean clearUserCart(int userId) throws SQLException {
        PreparedStatement st = null;
        try {
            String sql = "DELETE FROM CartItem WHERE UserID = ? ";
            st = connection.prepareStatement(sql);
            st.setInt(1, userId);
            int affectedRow = st.executeUpdate();
            return affectedRow > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            System.out.println("clearCart failed");
        } finally {
            st.close();
        }
        return false;
    }

    public boolean updateUserWallet(int userId, float ammout) {
        try {
            transactionDAO transDAO = new transactionDAO();
            UserWallet userwallet = transDAO.getUserWallet(userId);
            if (userwallet != null) {
                double currentAmount = userwallet.getAmount() - ammout;
                String sql = "Update UserWallet SET amount = ? WHERE ID = ? ";
                PreparedStatement st = connection.prepareStatement(sql);
                st.setDouble(1, currentAmount);
                st.setInt(2, userwallet.getID());
                int afftectedRow = st.executeUpdate();
                return afftectedRow > 0;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }
    
      public CartItem getCartItemById(int id) {
        PreparedStatement st = null;
        try {
            String sql = "SELECT *  FROM CartItem WHERE ID = ? ";
            st = connection.prepareStatement(sql);
            st.setInt(1, id);
            ResultSet rs = st.executeQuery();
            if(rs.next()) {
                CartItem ci = new CartItem();
                ci.setCartDetailId(rs.getInt("CardDetailID"));
                return ci;
            }
        } catch (SQLException e) {
            e.printStackTrace();
        } finally {
            try {
                st.close();
            } catch (SQLException ex) {
                ex.printStackTrace();
            }
        }
        return null;
    }
      

    public static void main(String[] args) throws SQLException {
        cartDAO cartDAO = new cartDAO();
//        System.out.println(cartDAO.getLastestOrderId(1));
//        System.out.println(cartDAO.getCardInStock(1, 3));
        List<CartDetailVM> listUserCart = cartDAO.getCartHaveDisByUserId(1);
        System.out.println(listUserCart);
//        cartDAO.CheckOut(1004, 1);
    }

}

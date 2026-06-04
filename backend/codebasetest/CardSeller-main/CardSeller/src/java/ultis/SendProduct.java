/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package ultis;

import dal.cardDAO;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;
import model.Card;

/**
 *
 * @author admin
 */
public class SendProduct{

//    static final String from = "badaothien12@gmail.com";// your email
//	static final String password = "wjum cxdu vchr vvui";
    public static final String username = "huysugar123@gmail.com";
    public static final String password = "dpmtgtmguxwknswr";
    public List<Card> cards = new ArrayList<>();
    public String email = "";

    public SendProduct() {
    }

    public SendProduct(List<Card> cards, String email) {
        this.cards = cards;
        this.email = email;
    }
    
    public void run() {
        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.host", "smtp.gmail.com");
        props.put("mail.smtp.port", "587");

        Session session = Session.getInstance(props,
                new jakarta.mail.Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(username, password);
            }
        });
        try {
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(username));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(email));
            message.setSubject("CardSeller - Here is your card"); // Email subject
            String allCards = "";
            cardDAO _cardDAO = new cardDAO();
            for (Card card : cards) {
                allCards += "<tr>\n"
                        + "    <td>" + _cardDAO.getProviderNameByCardDetailId(card.getCardDetailId()) + "</td>\n"
                        + "    <td>" + card.getSeriNumber() + "</td>\n"
                        + "    <td>" + card.getPinNumber() + "</td>\n"
                        + "  </tr>\n";
            }
            // Email content with enhanced design
            String htmlBody = "<html><head><style>"
                    + "body { font-family: Arial, sans-serif; }"
                    + ".header { color: #007bff; }"
                    + ".otp { color: #28a745; }"
                    + ".footer { margin-top: 20px; text-align: center; color: #6c757d; }"
                    + ".content { color: #343a40; }"
                    + "</style></head>"
                    + "<body>"
                    + "<h1 class='header'>Thank you for shopping by</h1>"
                    + "<table style='witdth:100%'>"
                    + "<tr>\n"
                    + "    <th>Provider</th>\n"
                    + "    <th>SeriNumber</th>\n"
                    + "    <th>PinNumber</th>\n"
                    + "  </tr>\n"
                    + allCards
                    + "</table>"
                    + "<p class='footer'>CardSeller.</p>"
                    + "</body></html>";

            message.setContent(htmlBody, "text/html");

            Transport.send(message);
            System.out.println("Email sent successfully.");
        } catch (MessagingException e) {
            throw new RuntimeException(e);
        } catch (SQLException ex) {
            Logger.getLogger(SendProduct.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
    public void sendError(){
        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.host", "smtp.gmail.com");
        props.put("mail.smtp.port", "587");

        Session session = Session.getInstance(props,
                new jakarta.mail.Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(username, password);
            }
        });
        try {
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(username));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(email));
            message.setSubject("CardSeller - No card in stock"); // Email subject
            // Email content with enhanced design
            String htmlBody = "<html><head><style>"
                    + "body { font-family: Arial, sans-serif; }"
                    + ".header { color: #007bff; }"
                    + ".otp { color: #28a745; }"
                    + ".footer { margin-top: 20px; text-align: center; color: #6c757d; }"
                    + ".content { color: #343a40; }"
                    + "</style></head>"
                    + "<body>"
                    + "<h1 class='header'>Sorry we do not have enough card for you</h1>"
                    + "<p class='footer'>CardSeller</p>"
                    + "</body></html>";

            message.setContent(htmlBody, "text/html");

            Transport.send(message);
            System.out.println("Email error sent successfully.");
        } catch (MessagingException e) {
            throw new RuntimeException(e);
        }
    }
}
//    public static void sendCardToMail(String email, List<Card> cards) throws SQLException {
//
//        Properties props = new Properties();
//        props.put("mail.smtp.auth", "true");
//        props.put("mail.smtp.starttls.enable", "true");
//        props.put("mail.smtp.host", "smtp.gmail.com");
//        props.put("mail.smtp.port", "587");
//
//        Session session = Session.getInstance(props,
//                new jakarta.mail.Authenticator() {
//            @Override
//            protected PasswordAuthentication getPasswordAuthentication() {
//                return new PasswordAuthentication(username, password);
//            }
//        });
//        try {
//            Message message = new MimeMessage(session);
//            message.setFrom(new InternetAddress(username));
//            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(email));
//            message.setSubject("CardSeller - Here is your cards"); // Email subject
//            String allCards = "";
//            cardDAO _cardDAO = new cardDAO();
//            for (Card card : cards) {
//                allCards += "<tr>\n"
//                        + "    <td>" + _cardDAO.getProviderNameByCardDetailId(card.getCardDetailId()) + "</td>\n"
//                        + "    <td>" + card.getSeriNumber() + "</td>\n"
//                        + "    <td>" + card.getPinNumber() + "</td>\n"
//                        + "  </tr>\n";
//            }
//            // Email content with enhanced design
//            String htmlBody = "<html><head><style>"
//                    + "body { font-family: Arial, sans-serif; }"
//                    + ".header { color: #007bff; }"
//                    + ".otp { color: #28a745; }"
//                    + ".footer { margin-top: 20px; text-align: center; color: #6c757d; }"
//                    + ".content { color: #343a40; }"
//                    + "</style></head>"
//                    + "<body>"
//                    + "<h1 class='header'>Thank you for shopping by</h1>"
//                    + "<table style='witdth:100%'>"
//                    + "<tr>\n"
//                    + "    <th>Provider</th>\n"
//                    + "    <th>SeriNumber</th>\n"
//                    + "    <th>PinNumber</th>\n"
//                    + "  </tr>\n"
//                    + allCards
//                    + "</table>"
//                    + "<p class='footer'>Thank you from CardSeller.</p>"
//                    + "</body></html>";
//
//            message.setContent(htmlBody, "text/html");
//
//            Transport.send(message);
//            System.out.println("Email sent successfully.");
//        } catch (MessagingException e) {
//            throw new RuntimeException(e);
//        }
//    }


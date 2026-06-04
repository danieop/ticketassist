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
import java.util.List;
import java.util.Properties;
import model.Card;

/**
 *
 * @author admin
 */
public class MailService {

//    static final String from = "badaothien12@gmail.com";// your email
//	static final String password = "wjum cxdu vchr vvui";
    public static final String username = "huysugar123@gmail.com";
    public static final String password = "dpmtgtmguxwknswr";

    public static void sendOtpToMail(String email, String otp) {

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
            message.setSubject("CardSeller - Verify your otp to reset your password"); // Email subject

            // Email content with enhanced design
            String htmlBody = "<html><head><style>"
                    + "body { font-family: Arial, sans-serif; }"
                    + ".header { color: #007bff; }"
                    + ".otp { color: #28a745; }"
                    + ".footer { margin-top: 20px; text-align: center; color: #6c757d; }"
                    + ".content { color: #343a40; }"
                    + "</style></head>"
                    + "<body>"
                    + "<h1 class='header'>VERIFY YOUR OTP FROM CARD SELLER</h1>"
                    + "<p class='content'>Your OTP is: <strong class='otp'>" + otp + "</strong></p>"
                    + "<p class='content'>Please enter this code on the website to complete the verification process.</p>"
                    + "<p class='footer'>Thank you from CardSeller.</p>"
                    + "</body></html>";

            message.setContent(htmlBody, "text/html");

            Transport.send(message);
            System.out.println("Email sent successfully.");
        } catch (MessagingException e) {
            throw new RuntimeException(e);
        }
    }

}

/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package ultis;

import dal.userDAO;

/**
 *
 * @author badao
 */
public class InputValidation {

    public String GetUserName(String username) {
        String error;
        //anything atleast 8 places
        if (username.matches("^.{3,}$")) {
        } else {
            error = "Invalid username! ";
            return error;
        }
        return null;
    }

    public String GetPassword(String password) {
        String error;
        //1digit 1 Lowercase and Uppercase letter atleast 8 places,?=\\S+$ no whitespace
        //special chars allow:@ # $ % ^ & + = !
        if (password.matches("^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!])(?=\\S+$).{8,}$")) {
        } else {
            error = "Invalid password!";
            return error;
        }
        return null;
    }

    public String GetEmail(String Email) {
        String error;
        //check email format
        //(\\.[a-z]{2,6})?):the third dot can have or not
        if (Email.matches("^[a-zA-Z0-9_!#$%&’*+/=?`{|}~^.-]+@([a-z]{2,6}\\.[a-z]{2,6}(\\.[a-z]{2,6})?)$")) {
        } else {
            error = "Invalid email!";
            return error;
        }
        return null;
    }

}

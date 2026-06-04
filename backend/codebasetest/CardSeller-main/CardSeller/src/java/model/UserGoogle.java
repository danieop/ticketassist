/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package model;

/**
 *
 * @author PC
 */
public class UserGoogle {
    private String email;
    private boolean verified_email;

    public UserGoogle() {
    }

    public UserGoogle(String email, boolean verified_email) {
        this.email = email;
        this.verified_email = verified_email;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean isVerified_email() {
        return verified_email;
    }

    public void setVerified_email(boolean verified_email) {
        this.verified_email = verified_email;
    }

    @Override
    public String toString() {
        return "UserGoogle{" + "email=" + email + ", verified_email=" + verified_email + '}';
    }

    
}

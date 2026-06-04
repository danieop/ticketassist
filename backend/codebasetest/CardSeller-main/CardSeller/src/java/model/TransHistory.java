/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package model;

import java.sql.Date;

/**
 *
 * @author badao
 */
public class TransHistory {

    private int ID;
    private int UserWalletID;
    private double amount;
    private String method;
    private boolean processStatus;
    private boolean successStatus;
    public Date createdAt;
    private boolean isDeleted;
    private int deletedBy;
    private Date deletedAt;

    public TransHistory() {
    }

    public TransHistory(int ID, int UserWalletID, double amount, String method, boolean processStatus, boolean successStatus, Date createdAt, boolean isDeleted, int deletedBy, Date deletedAt) {
        this.ID = ID;
        this.UserWalletID = UserWalletID;
        this.amount = amount;
        this.method = method;
        this.processStatus = processStatus;
        this.successStatus = successStatus;
        this.createdAt = createdAt;
        this.isDeleted = isDeleted;
        this.deletedBy = deletedBy;
        this.deletedAt = deletedAt;
    }



    public boolean isProcessStatus() {
        return processStatus;
    }

    public void setProcessStatus(boolean processStatus) {
        this.processStatus = processStatus;
    }

    public boolean isSuccessStatus() {
        return successStatus;
    }

    public void setSuccessStatus(boolean successStatus) {
        this.successStatus = successStatus;
    }

  
    public int getID() {
        return ID;
    }

    public void setID(int ID) {
        this.ID = ID;
    }

    public int getUserWalletID() {
        return UserWalletID;
    }

    public void setUserWalletID(int UserWalletID) {
        this.UserWalletID = UserWalletID;
    }


    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public String getMethod() {
        return method;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isIsDeleted() {
        return isDeleted;
    }

    public void setIsDeleted(boolean isDeleted) {
        this.isDeleted = isDeleted;
    }

    public int getDeletedBy() {
        return deletedBy;
    }

    public void setDeletedBy(int deletedBy) {
        this.deletedBy = deletedBy;
    }

    public Date getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Date deletedAt) {
        this.deletedAt = deletedAt;
    }
    
    
}

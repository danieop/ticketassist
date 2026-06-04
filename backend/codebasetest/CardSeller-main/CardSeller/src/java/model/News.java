package model;
import java.util.Date;
public class News {
    private int id;
    private String title;
    private Date createdAt;
    private String imageUrl;
    private String link; // Add link property

    public News(int id, String title, Date createdAt, String imageUrl, String link) {
        this.id = id;
        this.title = title;
        this.createdAt = createdAt;
        this.imageUrl = imageUrl;
        this.link = link; // Initialize link
    }

    // Getters and setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }
}

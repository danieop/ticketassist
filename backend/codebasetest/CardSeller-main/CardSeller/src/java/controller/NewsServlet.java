package controller;

import model.News;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.ArrayList;
import java.util.Date;

public class NewsServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        List<News> newsList = new ArrayList<>();
        
        // Thêm dữ liệu mẫu
        newsList.add(new News(1, "Quốc Khánh 2/9 cận kề, đặt vé tàu hỏa giảm tới 230.000 đồng trên ứng dụng ngân hàng và ví VNPAY", new Date(), "https://stcd02206177151.cloud.edgevnpay.vn/files/640/s1/statics.vnpay.vn/2024/8/08p03xgd8md81722480484978.jpg", "https://vnpay.vn/Quoc-Khanh-2-9-can-ke-dat-ve-tau-hoa-giam-toi-230-000-dong-tren-ung-dung-ngan-hang-va-vi-VNPAY-0qrdashb9h1d"));
        newsList.add(new News(2, "Chào Quốc khánh: Giảm sốc tới 250.000 đồng khi đặt vé xe khách trên ví VNPAY và ứng dụng ngân hàng", new Date(), "https://stcd02206177151.cloud.edgevnpay.vn/files/640/s1/statics.vnpay.vn/2024/8/04zded6z3xe51722485024347.jpg","https://vnpay.vn/Chao-Quoc-khanh-Giam-soc-toi-250-000-dong-khi-dat-ve-xe-khach-tren-vi-VNPAY-va-ung-dung-ngan-hang-0yw9ovlx3jx"));
        newsList.add(new News(3, "Đã tìm ra chủ nhân các giải thưởng chương trình Siêu sale du lịch trên app ngân hàng và ví VNPAY tuần 5-6", new Date(), "https://stcd02206177151.cloud.edgevnpay.vn/files/1920/s1/statics.vnpay.vn/2024/7/07xy1gl7g691721902723313.jpg","https://vnpay.vn/Sale-sieu-du-lich-tuan-5-6-0kyrbos6r8s"));
        newsList.add(new News(4, "Tiết Kiệm Tối Đa 150.000 Đồng Khi Đặt Vé Tàu Thủy Qua Ứng Dụng Agribank Plus Và Ví VNPAY", new Date(), "https://stcd02206177151.cloud.edgevnpay.vn/files/1920/s1/statics.vnpay.vn/2024/8/0vne9rx58bx1722484895852.jpg","https://vnpay.vn/Tiet-Kiem-Toi-Da-150-000-Dong-Khi-Dat-Ve-Tau-Thuy-Qua-Ung-Dung-Agribank-Plus-Va-Vi-VNPAY-04hw60uapexb"));

        request.setAttribute("newsList", newsList);
        request.getRequestDispatcher("news.jsp").forward(request, response);
    }
}

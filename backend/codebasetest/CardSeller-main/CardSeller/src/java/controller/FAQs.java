package controller;

import model.FAQ;
import dal.faqDAO;
import java.io.IOException;
import java.util.List;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebServlet("/faq")
public class FAQs extends HttpServlet {
    private static final long serialVersionUID = 1L;
    private faqDAO faqDAO;

    public void init() {
        faqDAO = new faqDAO();
    }

    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        List<FAQ> faqList = faqDAO.getAllFAQs();
        request.setAttribute("faqList", faqList);
        request.getRequestDispatcher("faq.jsp").forward(request, response);
    }
}

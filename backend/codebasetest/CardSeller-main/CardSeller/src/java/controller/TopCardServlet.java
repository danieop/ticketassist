package controller;

import dal.TopCardDAO;
import model.TopCard;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;

public class TopCardServlet extends HttpServlet {
    private TopCardDAO topCardDAO = new TopCardDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        List<TopCard> topCards = topCardDAO.getTopCards();
        req.setAttribute("topCards", topCards);
        req.getRequestDispatcher("topCards.jsp").forward(req, resp);
    }
}

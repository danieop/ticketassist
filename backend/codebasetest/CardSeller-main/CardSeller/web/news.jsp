<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tin tức</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            position: relative;
        }

        .header h1 {
            font-size: 2.5em;
            color: #333;
            margin: 0;
            padding: 10px;
            background: linear-gradient(135deg, #ff6f61, #d47d82);
            color: #fff;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .header .home-button {
            position: absolute;
            top: 50%;
            left: 20px;
            transform: translateY(-50%);
            background-color: #007bff;
            color: #fff;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 1em;
            cursor: pointer;
            text-decoration: none;
        }

        .header .home-button:hover {
            background-color: #0056b3;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
        }

        .news-item {
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            overflow: hidden;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            display: flex;
            flex-direction: column;
        }

        .news-item:hover {
            transform: translateY(-10px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }

        .news-image {
            width: 100%;
            height: 180px;
            object-fit: cover;
            transition: opacity 0.3s ease;
        }

        .news-item:hover .news-image {
            opacity: 0.9;
        }

        .news-title {
            font-size: 1.5em;
            color: #333;
            margin: 15px;
            text-decoration: none;
            font-weight: bold;
            transition: color 0.3s ease;
        }

        .news-title a {
            color: inherit;
            text-decoration: none;
        }

        .news-title a:hover {
            color: #ff6f61;
        }

        .news-date {
            font-size: 0.9em;
            color: #777;
            margin: 0 15px 15px;
        }

        @media (max-width: 1200px) {
            .container {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (max-width: 800px) {
            .container {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <a href="home" class="home-button">Về trang chủ</a>
        <h1>Tin tức</h1>
    </div>
    <div class="container">
        <c:forEach var="news" items="${newsList}">
            <div class="news-item">
                <a href="${news.link}" target="_blank">
                    <img src="${news.imageUrl}" alt="${news.title}" class="news-image">
                </a>
                <h2 class="news-title">
                    <a href="${news.link}" target="_blank">${news.title}</a>
                </h2>
                <p class="news-date">
                    <fmt:formatDate value="${news.createdAt}" pattern="dd/MM/yyyy, HH:mm" />
                </p>
            </div>
        </c:forEach>
    </div>
</body>
</html>

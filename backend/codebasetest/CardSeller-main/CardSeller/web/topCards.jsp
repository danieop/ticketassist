<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ page contentType="text/html" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html>
<head>
    <title>Danh Sách Thẻ Được Mua Nhiều Nhất</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f2f3f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            flex-direction: column;
        }
        .container {
            width: 80%;
            max-width: 1200px;
            margin: 40px auto;
            padding: 20px;
            background-color: #fff;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            position: relative;
        }
        h1 {
            text-align: center;
            font-size: 2em;
            color: #333;
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 15px;
            text-align: left;
        }
        th {
            background-color: #4CAF50;
            color: white;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #f1f1f1;
        }
        th, td {
            border-bottom: 1px solid #ddd;
        }
        @media (max-width: 768px) {
            th, td {
                font-size: 0.9em;
                padding: 10px;
            }
        }
        .home-button {
            position: absolute;
            top: 10px;
            left: 20px;
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            font-size: 1em;
        }
        .home-button:hover {
            background-color: #45a049;
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="home" class="home-button">Trang Chủ</a>
        <h1>Danh Sách Thẻ Được Mua Nhiều Nhất</h1>
        <table>
            <thead>
                <tr>
                    <th>Hãng Thẻ</th>
                    <th>Mệnh giá</th>
                    <th>Số Lượng Mua</th>
                </tr>
            </thead>
            <tbody>
                <c:forEach var="topCard" items="${topCards}">
                    <tr>
                        <td>${topCard.cardProvider}</td>
                        <td><fmt:formatNumber value="${topCard.cardPrice}" type="number" maxFractionDigits="0" groupingUsed="true" /></td>
                        <td><fmt:formatNumber value="${topCard.purchaseCount}" type="number" maxFractionDigits="0" groupingUsed="true" /></td>
                    </tr>
                </c:forEach>
            </tbody>
        </table>
    </div>
</body>
</html>

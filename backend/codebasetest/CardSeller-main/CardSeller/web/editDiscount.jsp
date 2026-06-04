<%-- 
    Document   : addDiscount
    Created on : Jul 12, 2024, 2:22:14 AM
    Author     : hacom
--%>

<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discount Form</title>
  <!-- Bootstrap CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM" crossorigin="anonymous"></script>
  <!-- jQuery -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <!-- Bootstrap DateTimePicker CSS -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datetimepicker/4.17.47/css/bootstrap-datetimepicker.min.css">
  <!-- Bootstrap DateTimePicker JS -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datetimepicker/4.17.47/js/bootstrap-datetimepicker.min.js"></script>
</head>
<body>
<div class="container mt-5">
    <a href="manageDiscount">Back manage discount</a>
    <form action="manageDiscount" method="POST">
      <input name="Service" value="editDiscount" hidden>
      <div class="mb-3">
      <c:set var="cardDiscount" value="${cardDetail}" />
      <label for="mainCategory" class="form-label">Main Category</label>
      <select class="form-select" id="mainCategory" aria-label="Main Category">
        <option selected>${cardDiscount.getProviderName()}</option>
      </select>
    </div>
    <div class="mb-3">
      <label for="subCategory" class="form-label">Sub Category</label>
      <select class="form-select" id="subCategory" aria-label="Sub Category" name="cardId">
          <option value="${cardDiscount.getCardDetailId()}"><fmt:formatNumber  maxFractionDigits = "3" value="${cardDiscount.getPrice()}"/></option>
      </select>
    </div>
    <div class="mb-3">
      <label for="startDate" class="form-label">Start Date</label>
      <input type="text" class="form-control datetimepicker" name="startDate" value="${cardDiscount.getStartDate()}" id="startDate" placeholder="Select start date and time">
    </div>
    <div class="mb-3">
      <label for="endDate" class="form-label">End Date</label>
      <input type="text" class="form-control datetimepicker"  name="endDate" v value="${cardDiscount.getEndDate()}" id="endDate" placeholder="Select end date and time">
    </div>
    <div class="mb-3">
      <label for="percent" class="form-label">Discount Percent</label>
      <input type="number" class="form-control" id="percent" name="percent" value="${cardDiscount.getPercent()}" placeholder="Enter discount percent">
    </div>
    
    <button type="submit" class="btn btn-primary">Submit</button>
  </form>
</div>
    <h3>${message}</h3>
    <h3>${error}</h3>
<script>
    
       
        $('#mainCategory').change(() => {
            //get cate of brand
            getListCard($("#mainCategory").find(':selected').data('id'), function(data) {
             let options = '<option value="" selected>Chọn thể loại</option>';
               data.listCard.forEach(function(element) {
                  options += '<option name="cateValue" value="'+element.id+'" \n\
                                data-id="'+element.id+'">\n\
                                     '+element.price+'\
                              </option>';
               });
               console.log(data)
             document.getElementById("subCategory").innerHTML = options;
            });
        });

        function getListCard(proId, callback) {
            
            $.ajax({
             type: 'POST',
             url: 'addDiscount',
             dataType: 'json',
           data: {
            Service: "getListCard",
            proId: proId
          },
        success: function (data) {
            callback(data);
        },
        error: function (error) {
            callback(false);
        }
     });
    }
    
    
    
    
    
  $(function () {
    $('.datetimepicker').datetimepicker({
      format: 'YYYY-MM-DD HH:mm:ss'
    });

    const subCategories = {
      1: ['Sub Category 1.1', 'Sub Category 1.2', 'Sub Category 1.3'],
      2: ['Sub Category 2.1', 'Sub Category 2.2', 'Sub Category 2.3'],
      3: ['Sub Category 3.1', 'Sub Category 3.2', 'Sub Category 3.3'],
    };

    $('#mainCategory').change(function () {
      const mainCat = $(this).val();
      const subCatSelect = $('#subCategory');
      subCatSelect.empty();

      if (mainCat) {
        subCatSelect.append('<option selected>Select sub category</option>');
        subCategories[mainCat].forEach(function (subCat) {
          subCatSelect.append(`<option value="${subCat}">${subCat}</option>`);
        });
      }
    });
  });
</script>

<!-- Bootstrap JS -->
<script src="https://stackpath.bootstrapcdn.com/bootstrap/5.1.0/js/bootstrap.bundle.min.js"></script>
</body>
</html>

package com.northstar.crm.api;

import com.northstar.crm.service.CustomerNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(CustomerNotFoundException.class) //When we face the Issue that Customer not found then
    //the following code will deal with the issue.
    public ProblemDetail handleCustomerNotFound(CustomerNotFoundException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(// Status code will be 404 NOT FOUND which is HttpStatus.NOT_FOUND
                HttpStatus.NOT_FOUND,
                ex.getMessage());
        problemDetail.setTitle("Customer Not Found");
        return problemDetail;
    }
}
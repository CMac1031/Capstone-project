package com.northstar.crm.api;

import com.northstar.crm.service.CustomerAlreadyExistsException;
import com.northstar.crm.service.CustomerNotFoundException;
import com.northstar.crm.service.DuplicateEmailException;
import com.northstar.crm.service.DuplicatePhoneException;
import com.northstar.crm.service.InvalidSignupException;
import com.northstar.crm.service.SignupAlreadyReviewedException;
import com.northstar.crm.service.SignupConflictException;
import com.northstar.crm.service.SignupRequestNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(CustomerNotFoundException.class)
    public ProblemDetail handleCustomerNotFound(CustomerNotFoundException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problemDetail.setTitle("Customer Not Found");
        return problemDetail;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getDefaultMessage())
                .orElse("Invalid request");
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, message);
        problemDetail.setTitle("Validation Failed");
        return problemDetail;
    }

    @ExceptionHandler(InvalidSignupException.class)
    public ProblemDetail handleInvalidSignup(InvalidSignupException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problemDetail.setTitle("Invalid Signup Request");
        return problemDetail;
    }

    @ExceptionHandler(SignupConflictException.class)
    public ProblemDetail handleSignupConflict(SignupConflictException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problemDetail.setTitle("Signup Conflict");
        return problemDetail;
    }

    @ExceptionHandler(SignupRequestNotFoundException.class)
    public ProblemDetail handleSignupRequestNotFound(SignupRequestNotFoundException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problemDetail.setTitle("Signup Request Not Found");
        return problemDetail;
    }

    @ExceptionHandler(SignupAlreadyReviewedException.class)
    public ProblemDetail handleSignupAlreadyReviewed(SignupAlreadyReviewedException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problemDetail.setTitle("Signup Request Already Reviewed");
        return problemDetail;
    }

    @ExceptionHandler(CustomerAlreadyExistsException.class)
    public ProblemDetail handleCustomerAlreadyExists(CustomerAlreadyExistsException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problemDetail.setTitle("Customer Already Exists");
        return problemDetail;
    }

    @ExceptionHandler(DuplicateEmailException.class)
    public ProblemDetail handleDuplicateEmail(DuplicateEmailException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problemDetail.setTitle("Duplicate Email");
        return problemDetail;
    }

    @ExceptionHandler(DuplicatePhoneException.class)
    public ProblemDetail handleDuplicatePhone(DuplicatePhoneException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problemDetail.setTitle("Duplicate Phone");
        return problemDetail;
    }
}
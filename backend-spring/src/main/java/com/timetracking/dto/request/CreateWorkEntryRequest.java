package com.timetracking.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public class CreateWorkEntryRequest {

    @NotNull(message = "Client ID is required")
    @Positive(message = "Client ID must be a positive number")
    private Long clientId;

    @NotNull(message = "Hours are required")
    @Positive(message = "Hours must be positive")
    @DecimalMax(value = "24", message = "Hours cannot exceed 24")
    private BigDecimal hours;

    private String description;

    @NotNull(message = "Date is required")
    private String date;

    public CreateWorkEntryRequest() {
    }

    public Long getClientId() {
        return clientId;
    }

    public void setClientId(Long clientId) {
        this.clientId = clientId;
    }

    public BigDecimal getHours() {
        return hours;
    }

    public void setHours(BigDecimal hours) {
        this.hours = hours;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }
}

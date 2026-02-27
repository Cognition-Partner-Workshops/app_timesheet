package com.timetracking.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public class UpdateWorkEntryRequest {

    @Positive(message = "Client ID must be a positive number")
    private Long clientId;

    @Positive(message = "Hours must be positive")
    @DecimalMax(value = "24", message = "Hours cannot exceed 24")
    private BigDecimal hours;

    private String description;

    private String date;

    public UpdateWorkEntryRequest() {
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

    public boolean hasUpdates() {
        return clientId != null || hours != null || description != null || date != null;
    }
}

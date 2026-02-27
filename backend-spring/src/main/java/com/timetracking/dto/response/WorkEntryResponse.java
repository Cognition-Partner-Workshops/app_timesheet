package com.timetracking.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.timetracking.entity.WorkEntry;

import java.math.BigDecimal;

public class WorkEntryResponse {

    private Long id;

    @JsonProperty("client_id")
    private Long clientId;

    private BigDecimal hours;
    private String description;
    private String date;

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("updated_at")
    private String updatedAt;

    @JsonProperty("client_name")
    private String clientName;

    public WorkEntryResponse() {
    }

    public static WorkEntryResponse fromEntity(WorkEntry workEntry) {
        WorkEntryResponse response = new WorkEntryResponse();
        response.setId(workEntry.getId());
        response.setClientId(workEntry.getClientId());
        response.setHours(workEntry.getHours());
        response.setDescription(workEntry.getDescription());
        response.setDate(workEntry.getDate() != null ? workEntry.getDate().toString() : null);
        response.setCreatedAt(workEntry.getCreatedAt() != null ? workEntry.getCreatedAt().toString() : null);
        response.setUpdatedAt(workEntry.getUpdatedAt() != null ? workEntry.getUpdatedAt().toString() : null);
        if (workEntry.getClient() != null) {
            response.setClientName(workEntry.getClient().getName());
        }
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }
}

package com.timetracking.dto.response;

import java.math.BigDecimal;
import java.util.List;

public class ReportResponse {

    private ClientInfo client;
    private List<ReportWorkEntry> workEntries;
    private BigDecimal totalHours;
    private int entryCount;

    public ReportResponse() {
    }

    public ClientInfo getClient() {
        return client;
    }

    public void setClient(ClientInfo client) {
        this.client = client;
    }

    public List<ReportWorkEntry> getWorkEntries() {
        return workEntries;
    }

    public void setWorkEntries(List<ReportWorkEntry> workEntries) {
        this.workEntries = workEntries;
    }

    public BigDecimal getTotalHours() {
        return totalHours;
    }

    public void setTotalHours(BigDecimal totalHours) {
        this.totalHours = totalHours;
    }

    public int getEntryCount() {
        return entryCount;
    }

    public void setEntryCount(int entryCount) {
        this.entryCount = entryCount;
    }

    public static class ClientInfo {
        private Long id;
        private String name;

        public ClientInfo() {
        }

        public ClientInfo(Long id, String name) {
            this.id = id;
            this.name = name;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }

    public static class ReportWorkEntry {
        private Long id;
        private BigDecimal hours;
        private String description;
        private String date;

        @com.fasterxml.jackson.annotation.JsonProperty("created_at")
        private String createdAt;

        @com.fasterxml.jackson.annotation.JsonProperty("updated_at")
        private String updatedAt;

        public ReportWorkEntry() {
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
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
    }
}

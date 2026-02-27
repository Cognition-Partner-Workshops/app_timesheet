package com.timetracking.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.timetracking.entity.Client;

public class ClientResponse {

    private Long id;
    private String name;
    private String description;
    private String department;
    private String email;

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("updated_at")
    private String updatedAt;

    public ClientResponse() {
    }

    public static ClientResponse fromEntity(Client client) {
        ClientResponse response = new ClientResponse();
        response.setId(client.getId());
        response.setName(client.getName());
        response.setDescription(client.getDescription());
        response.setDepartment(client.getDepartment());
        response.setEmail(client.getEmail());
        response.setCreatedAt(client.getCreatedAt() != null ? client.getCreatedAt().toString() : null);
        response.setUpdatedAt(client.getUpdatedAt() != null ? client.getUpdatedAt().toString() : null);
        return response;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
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

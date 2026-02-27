package com.timetracking.dto.response;

import com.timetracking.entity.User;

public class UserResponse {

    private String email;
    private String createdAt;

    public UserResponse() {
    }

    public UserResponse(String email, String createdAt) {
        this.email = email;
        this.createdAt = createdAt;
    }

    public static UserResponse fromEntity(User user) {
        return new UserResponse(user.getEmail(), user.getCreatedAt().toString());
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
}

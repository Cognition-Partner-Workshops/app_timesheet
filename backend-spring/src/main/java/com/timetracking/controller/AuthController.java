package com.timetracking.controller;

import com.timetracking.dto.request.LoginRequest;
import com.timetracking.dto.response.UserResponse;
import com.timetracking.entity.User;
import com.timetracking.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        boolean isNew = authService.isNewUser(request.getEmail());
        User user = authService.login(request.getEmail());

        Map<String, Object> response = new HashMap<>();
        Map<String, String> userInfo = new HashMap<>();
        userInfo.put("email", user.getEmail());
        userInfo.put("createdAt", user.getCreatedAt().toString());

        if (isNew) {
            response.put("message", "User created and logged in successfully");
            response.put("user", userInfo);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } else {
            response.put("message", "Login successful");
            response.put("user", userInfo);
            return ResponseEntity.ok(response);
        }
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        User user = authService.getCurrentUser(userEmail);

        Map<String, Object> response = new HashMap<>();
        Map<String, String> userInfo = new HashMap<>();
        userInfo.put("email", user.getEmail());
        userInfo.put("createdAt", user.getCreatedAt().toString());
        response.put("user", userInfo);

        return ResponseEntity.ok(response);
    }
}

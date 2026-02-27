package com.timetracking.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.timetracking.entity.User;
import com.timetracking.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public AuthInterceptor(UserRepository userRepository, ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String userEmail = request.getHeader("x-user-email");

        if (userEmail == null || userEmail.isBlank()) {
            sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "User email required in x-user-email header");
            return false;
        }

        if (!EMAIL_PATTERN.matcher(userEmail).matches()) {
            sendErrorResponse(response, HttpServletResponse.SC_BAD_REQUEST, "Invalid email format");
            return false;
        }

        // Check if user exists, create if not
        Optional<User> existingUser = userRepository.findByEmail(userEmail);
        if (existingUser.isEmpty()) {
            User newUser = new User(userEmail);
            userRepository.save(newUser);
        }

        // Store the user email as a request attribute for controllers to use
        request.setAttribute("userEmail", userEmail);

        return true;
    }

    private void sendErrorResponse(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        Map<String, String> errorBody = new HashMap<>();
        errorBody.put("error", message);
        response.getWriter().write(objectMapper.writeValueAsString(errorBody));
    }
}

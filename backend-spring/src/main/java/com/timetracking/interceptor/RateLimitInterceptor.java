package com.timetracking.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    @Value("${app.rate-limit.max-requests:100}")
    private int maxRequests;

    @Value("${app.rate-limit.window-minutes:15}")
    private int windowMinutes;

    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, RateLimitEntry> rateLimitMap = new ConcurrentHashMap<>();

    public RateLimitInterceptor(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String clientIp = getClientIp(request);
        long now = System.currentTimeMillis();
        long windowMs = windowMinutes * 60L * 1000L;

        RateLimitEntry entry = rateLimitMap.compute(clientIp, (key, existing) -> {
            if (existing == null || (now - existing.windowStart) > windowMs) {
                return new RateLimitEntry(now, 1);
            }
            existing.count++;
            return existing;
        });

        if (entry.count > maxRequests) {
            sendErrorResponse(response, 429, "Too many requests, please try again later");
            return false;
        }

        return true;
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void sendErrorResponse(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        Map<String, String> errorBody = new HashMap<>();
        errorBody.put("error", message);
        response.getWriter().write(objectMapper.writeValueAsString(errorBody));
    }

    private static class RateLimitEntry {
        long windowStart;
        int count;

        RateLimitEntry(long windowStart, int count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}

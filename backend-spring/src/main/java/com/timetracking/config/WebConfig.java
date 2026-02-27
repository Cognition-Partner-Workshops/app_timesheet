package com.timetracking.config;

import com.timetracking.interceptor.AuthInterceptor;
import com.timetracking.interceptor.RateLimitInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    private final AuthInterceptor authInterceptor;
    private final RateLimitInterceptor rateLimitInterceptor;

    public WebConfig(AuthInterceptor authInterceptor, RateLimitInterceptor rateLimitInterceptor) {
        this.authInterceptor = authInterceptor;
        this.rateLimitInterceptor = rateLimitInterceptor;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(frontendUrl)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Rate limiting on all endpoints
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns("/**");

        // Auth interceptor on protected endpoints (exclude login, health, h2-console)
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/clients/**", "/api/work-entries/**", "/api/reports/**", "/api/auth/me");
    }
}
